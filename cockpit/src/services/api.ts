import { getApiBase } from "./config";
import { apiFetch } from "./http";

/**
 * Typed client for the service's HTTP contract.
 *
 * There is deliberately no mock layer here: the service already has explicit
 * mock modes at each boundary. A second, UI-level fake would make it impossible
 * to tell whether what you are looking at is real.
 */

export interface Health {
  status: string;
  service: string;
  providers: {
    context: { name: string; endpointConfigured: boolean };
    generation: { mode: "mock" | "live"; capability: string; endpointConfigured: boolean };
    asset: { name: string; credentialConfigured: boolean };
  };
}

export type JobState = "queued" | "running" | "succeeded" | "failed";

export interface GenerationStarted {
  status: "accepted";
  intent: string;
  prompt: string;
  provider: string;
  job: { id: string; state: JobState; progress?: number };
  links: { status: string; model: string };
  trace: {
    generatedAt: string;
    loreSource: string;
    backendStatus?: string;
    operationId?: string;
  };
}

export interface Job {
  id: string;
  provider: string;
  state: JobState;
  progress?: number;
  error?: string;
  ready: boolean;
  links: { status: string; model: string };
}

export const getHealth = (): Promise<Health> => apiFetch<Health>("/health");

export const startGeneration = (intent: string): Promise<GenerationStarted> =>
  apiFetch<GenerationStarted>("/generate", {
    method: "POST",
    body: JSON.stringify({ intent }),
  });

export const getJob = (jobId: string): Promise<Job> =>
  apiFetch<Job>(`/jobs/${encodeURIComponent(jobId)}`);

/** Absolute URL of the model, for a direct browser download. */
export const modelUrl = (jobId: string): string =>
  `${getApiBase()}/jobs/${encodeURIComponent(jobId)}/model.glb`;
