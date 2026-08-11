import { misconfigured, upstreamFailed } from "../../lib/errors";
import { fetchJson, fetchWithRetry, jsonHeaders } from "../../lib/http";
import type { JobState, Mesh3DJob, Mesh3DJobInput, Mesh3DProvider } from "../../types";

/**
 * Adaptateur Tripo3D (text-to-model), API v2 openapi.
 *
 * Même remarque que pour Meshy : toute dérive du schéma fournisseur se corrige
 * ici seulement, sans toucher au pipeline ni aux routes.
 */

const DEFAULT_BASE_URL = "https://api.tripo3d.ai";

interface CreateTaskResponse {
  code?: number;
  message?: string;
  data?: { task_id?: string };
}

interface TaskResponse {
  code?: number;
  message?: string;
  data?: {
    status?: string;
    progress?: number;
    output?: { pbr_model?: string; model?: string };
  };
}

function mapState(status: string | undefined): JobState {
  switch ((status ?? "").toLowerCase()) {
    case "success":
      return "succeeded";
    case "failed":
    case "banned":
    case "expired":
    case "cancelled":
      return "failed";
    case "running":
      return "running";
    default:
      return "queued";
  }
}

export class TripoProvider implements Mesh3DProvider {
  readonly name = "tripo";
  private readonly baseUrl: string;

  constructor(
    private readonly apiKey: string,
    baseUrl: string | undefined,
    private readonly timeoutMs: number,
  ) {
    if (!apiKey) throw misconfigured("TRIPO_API_KEY est requis quand MESH3D_PROVIDER vaut \"tripo\".");
    this.baseUrl = (baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  }

  async createJob(input: Mesh3DJobInput): Promise<Mesh3DJob> {
    const { ok, status, data } = await fetchJson<CreateTaskResponse>(
      `${this.baseUrl}/v2/openapi/task`,
      {
        method: "POST",
        headers: jsonHeaders(this.apiKey),
        body: JSON.stringify({
          type: "text_to_model",
          prompt: input.prompt,
          ...(input.negativePrompt ? { negative_prompt: input.negativePrompt } : {}),
          ...(input.seed !== undefined ? { model_seed: input.seed } : {}),
        }),
      },
      { timeoutMs: this.timeoutMs },
    );

    const taskId = data.data?.task_id;
    if (!ok || data.code !== 0 || !taskId) {
      throw upstreamFailed(data.message ?? `Tripo3D a refusé la création du job (${status}).`, data);
    }

    return { provider: this.name, providerJobId: taskId, state: "queued", progress: 0 };
  }

  async getJob(providerJobId: string): Promise<Mesh3DJob> {
    const { ok, status, data } = await fetchJson<TaskResponse>(
      `${this.baseUrl}/v2/openapi/task/${encodeURIComponent(providerJobId)}`,
      { method: "GET", headers: jsonHeaders(this.apiKey) },
      { timeoutMs: this.timeoutMs },
    );

    if (!ok || data.code !== 0) {
      throw upstreamFailed(`Tripo3D a répondu ${status} pour le job ${providerJobId}.`, data);
    }

    const state = mapState(data.data?.status);
    const modelUrl = data.data?.output?.pbr_model ?? data.data?.output?.model;

    return {
      provider: this.name,
      providerJobId,
      state,
      ...(typeof data.data?.progress === "number" ? { progress: data.data.progress } : {}),
      ...(state === "succeeded" && modelUrl ? { modelUrl } : {}),
      ...(state === "failed" && data.message ? { error: data.message } : {}),
    };
  }

  async fetchModel(job: Mesh3DJob): Promise<Response> {
    if (!job.modelUrl) throw upstreamFailed("Tripo3D n'a pas fourni d'URL de modèle pour ce job.");
    return fetchWithRetry(job.modelUrl, { method: "GET" }, { timeoutMs: this.timeoutMs });
  }
}
