import type { AssetJob, AssetJobInput, AssetJobState, ThreeDProvider } from "../../types";

/**
 * Protocol adapter for one external text-to-3D provider.
 *
 * Provider-specific request and response mapping lives here and nowhere else:
 * the core application only knows the ThreeDProvider interface. Credentials and
 * the base URL come from bindings, never from source.
 */

const DEFAULT_BASE_URL = "https://api.meshy.ai";
const DEFAULT_TIMEOUT_MS = 30_000;

interface CreateTaskResponse {
  result?: string;
  message?: string;
}

interface TaskResponse {
  status?: string;
  progress?: number;
  model_urls?: Record<string, string | undefined>;
  task_error?: { message?: string };
}

function mapState(status: string | undefined): AssetJobState {
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

export class MeshyProvider implements ThreeDProvider {
  readonly name = "meshy";
  private readonly baseUrl: string;

  constructor(
    private readonly apiKey: string,
    baseUrl?: string,
  ) {
    if (!apiKey) {
      throw new Error('THREE_D_API_KEY is required when THREE_D_PROVIDER is "meshy"');
    }
    this.baseUrl = (baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
  }

  private headers(): Record<string, string> {
    return {
      "content-type": "application/json",
      accept: "application/json",
      authorization: `Bearer ${this.apiKey}`,
    };
  }

  async createJob(input: AssetJobInput): Promise<AssetJob> {
    const response = await fetch(`${this.baseUrl}/openapi/v2/text-to-3d`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        mode: "preview",
        prompt: input.prompt,
        art_style: "realistic",
        should_remesh: true,
        ...(input.negativePrompt ? { negative_prompt: input.negativePrompt } : {}),
        ...(input.seed !== undefined ? { seed: input.seed } : {}),
      }),
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });

    const data = (await response.json().catch(() => ({}))) as CreateTaskResponse;

    if (!response.ok || !data.result) {
      throw new Error(data.message ?? `Asset provider rejected the job (HTTP ${response.status})`);
    }

    return { provider: this.name, providerJobId: data.result, state: "queued", progress: 0 };
  }

  async getJob(providerJobId: string): Promise<AssetJob> {
    const response = await fetch(
      `${this.baseUrl}/openapi/v2/text-to-3d/${encodeURIComponent(providerJobId)}`,
      { method: "GET", headers: this.headers(), signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS) },
    );

    if (!response.ok) {
      throw new Error(`Asset provider returned HTTP ${response.status} for job ${providerJobId}`);
    }

    const data = (await response.json().catch(() => ({}))) as TaskResponse;
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

  async fetchModel(job: AssetJob): Promise<Response> {
    if (!job.modelUrl) {
      throw new Error("Asset provider did not supply a model URL for this job");
    }
    return fetch(job.modelUrl, { signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS) });
  }
}
