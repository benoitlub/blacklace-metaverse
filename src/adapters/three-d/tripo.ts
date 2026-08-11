import type { AssetJob, AssetJobInput, AssetJobState, ThreeDProvider } from "../../types";

/**
 * Protocol adapter for a second external text-to-3D provider.
 *
 * Same rule as the sibling adapter: vendor protocol stays here, the core sees
 * only the ThreeDProvider interface, credentials come from bindings.
 */

const DEFAULT_BASE_URL = "https://api.tripo3d.ai";
const DEFAULT_TIMEOUT_MS = 30_000;

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

function mapState(status: string | undefined): AssetJobState {
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

export class TripoProvider implements ThreeDProvider {
  readonly name = "tripo";
  private readonly baseUrl: string;

  constructor(
    private readonly apiKey: string,
    baseUrl?: string,
  ) {
    if (!apiKey) {
      throw new Error('THREE_D_API_KEY is required when THREE_D_PROVIDER is "tripo"');
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
    const response = await fetch(`${this.baseUrl}/v2/openapi/task`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        type: "text_to_model",
        prompt: input.prompt,
        ...(input.negativePrompt ? { negative_prompt: input.negativePrompt } : {}),
        ...(input.seed !== undefined ? { model_seed: input.seed } : {}),
      }),
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });

    const data = (await response.json().catch(() => ({}))) as CreateTaskResponse;
    const taskId = data.data?.task_id;

    if (!response.ok || data.code !== 0 || !taskId) {
      throw new Error(data.message ?? `Asset provider rejected the job (HTTP ${response.status})`);
    }

    return { provider: this.name, providerJobId: taskId, state: "queued", progress: 0 };
  }

  async getJob(providerJobId: string): Promise<AssetJob> {
    const response = await fetch(
      `${this.baseUrl}/v2/openapi/task/${encodeURIComponent(providerJobId)}`,
      { method: "GET", headers: this.headers(), signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS) },
    );

    const data = (await response.json().catch(() => ({}))) as TaskResponse;

    if (!response.ok || data.code !== 0) {
      throw new Error(`Asset provider returned HTTP ${response.status} for job ${providerJobId}`);
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

  async fetchModel(job: AssetJob): Promise<Response> {
    if (!job.modelUrl) {
      throw new Error("Asset provider did not supply a model URL for this job");
    }
    return fetch(job.modelUrl, { signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS) });
  }
}
