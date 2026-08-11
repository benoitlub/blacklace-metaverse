import { misconfigured, upstreamFailed } from "../../lib/errors";
import { fetchJson, fetchWithRetry, jsonHeaders } from "../../lib/http";
import type { JobState, Mesh3DJob, Mesh3DJobInput, Mesh3DProvider } from "../../types";

/**
 * Adaptateur Meshy (text-to-3D).
 *
 * Les formes de requête/réponse suivent l'API publique Meshy v2. Si Meshy fait
 * évoluer son schéma, tout le correctif tient dans ce fichier : le pipeline ne
 * connaît que l'interface Mesh3DProvider.
 */

const DEFAULT_BASE_URL = "https://api.meshy.ai";

interface CreateTaskResponse {
  result?: string;
  message?: string;
}

interface TaskResponse {
  id?: string;
  status?: string;
  progress?: number;
  model_urls?: Record<string, string | undefined>;
  task_error?: { message?: string };
}

function mapState(status: string | undefined): JobState {
  switch ((status ?? "").toUpperCase()) {
    case "SUCCEEDED":
      return "succeeded";
    case "FAILED":
    case "EXPIRED":
    case "CANCELED":
      return "failed";
    case "IN_PROGRESS":
      return "running";
    default:
      return "queued";
  }
}

export class MeshyProvider implements Mesh3DProvider {
  readonly name = "meshy";
  private readonly baseUrl: string;

  constructor(
    private readonly apiKey: string,
    baseUrl: string | undefined,
    private readonly timeoutMs: number,
  ) {
    if (!apiKey) throw misconfigured("MESHY_API_KEY est requis quand MESH3D_PROVIDER vaut \"meshy\".");
    this.baseUrl = (baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  }

  async createJob(input: Mesh3DJobInput): Promise<Mesh3DJob> {
    const { ok, status, data } = await fetchJson<CreateTaskResponse>(
      `${this.baseUrl}/openapi/v2/text-to-3d`,
      {
        method: "POST",
        headers: jsonHeaders(this.apiKey),
        body: JSON.stringify({
          mode: "preview",
          prompt: input.prompt,
          art_style: "realistic",
          should_remesh: true,
          ...(input.negativePrompt ? { negative_prompt: input.negativePrompt } : {}),
          ...(input.seed !== undefined ? { seed: input.seed } : {}),
        }),
      },
      { timeoutMs: this.timeoutMs },
    );

    if (!ok || !data.result) {
      throw upstreamFailed(data.message ?? `Meshy a refusé la création du job (${status}).`, data);
    }

    return { provider: this.name, providerJobId: data.result, state: "queued", progress: 0 };
  }

  async getJob(providerJobId: string): Promise<Mesh3DJob> {
    const { ok, status, data } = await fetchJson<TaskResponse>(
      `${this.baseUrl}/openapi/v2/text-to-3d/${encodeURIComponent(providerJobId)}`,
      { method: "GET", headers: jsonHeaders(this.apiKey) },
      { timeoutMs: this.timeoutMs },
    );

    if (!ok) throw upstreamFailed(`Meshy a répondu ${status} pour le job ${providerJobId}.`, data);

    const state = mapState(data.status);
    const modelUrl = data.model_urls?.glb;

    return {
      provider: this.name,
      providerJobId,
      state,
      ...(typeof data.progress === "number" ? { progress: data.progress } : {}),
      ...(state === "succeeded" && modelUrl ? { modelUrl } : {}),
      ...(data.task_error?.message ? { error: data.task_error.message } : {}),
    };
  }

  async fetchModel(job: Mesh3DJob): Promise<Response> {
    if (!job.modelUrl) throw upstreamFailed("Meshy n'a pas fourni d'URL GLB pour ce job.");
    return fetchWithRetry(job.modelUrl, { method: "GET" }, { timeoutMs: this.timeoutMs });
  }
}
