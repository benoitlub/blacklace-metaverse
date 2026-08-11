import type { Env } from "../env";
import { createOctopusClient } from "../adapters/octopus/client";
import { resolveMesh3DProvider, resolveProviderForJob } from "../adapters/mesh3d";
import { AppError, OctopusNoExecutorError, notFound } from "../lib/errors";
import { decodeJobId, encodeJobId } from "../lib/jobId";
import { composeCreativeBrief, composeLocalPrompt, loadLorePack } from "../lore/blacklace";
import type { GenerateAssetInput, JobState, Mesh3DJob, OctopusTrace, PromptSource } from "../types";

/**
 * Orchestration : intention -> prompt (Octopus) -> job 3D -> GLB.
 *
 * La fonction ne bloque jamais en attendant la fin de la génération 3D : les
 * fournisseurs mettent plusieurs minutes, ce qui dépasse le budget d'une requête
 * Worker. On rend un jobId, le client interroge ensuite l'état puis télécharge.
 */

export interface StartGenerationResult {
  jobId: string;
  state: JobState;
  provider: string;
  prompt: string;
  promptSource: PromptSource;
  octopus?: OctopusTrace;
  /** Renseigné quand Octopus n'avait pas d'exécuteur et que le repli local a servi. */
  notice?: string;
  links: { status: string; model: string };
}

export interface JobStatusResult {
  jobId: string;
  state: JobState;
  provider: string;
  progress?: number;
  error?: string;
  ready: boolean;
  links: { status: string; model: string };
}

const links = (jobId: string) => ({
  status: `/v1/jobs/${jobId}`,
  model: `/v1/jobs/${jobId}/model.glb`,
});

/** Étape 1 : demander à Octopus d'enrichir l'intention, avec repli local documenté. */
async function buildPrompt(input: GenerateAssetInput, env: Env) {
  const lore = await loadLorePack();
  const brief = composeCreativeBrief(input, lore);
  const octopus = createOctopusClient(env);

  try {
    const result = await octopus.generatePrompt(brief, input);
    return { ...result, notice: undefined as string | undefined };
  } catch (error) {
    if (!(error instanceof OctopusNoExecutorError)) throw error;

    // Octopus a accepté la mission mais aucun adaptateur ne fournit la capacité.
    if ((env.OCTOPUS_FALLBACK ?? "local").toLowerCase() === "error") {
      throw new AppError(503, "OCTOPUS_NO_EXECUTOR", error.message, error.trace);
    }

    return {
      prompt: composeLocalPrompt(input, lore),
      source: "local-fallback" as PromptSource,
      octopus: error.trace,
      notice:
        "Octopus n'a aucun adaptateur enregistré fournissant cette capacité : le prompt a été composé localement.",
    };
  }
}

export async function startGeneration(input: GenerateAssetInput, env: Env): Promise<StartGenerationResult> {
  const { prompt, source, octopus, notice } = await buildPrompt(input, env);

  const provider = resolveMesh3DProvider(env);
  const job = await provider.createJob({
    prompt,
    format: "glb",
    ...(input.seed !== undefined ? { seed: input.seed } : {}),
  });

  const jobId = encodeJobId(job.provider, job.providerJobId);

  return {
    jobId,
    state: job.state,
    provider: job.provider,
    prompt,
    promptSource: source,
    ...(octopus ? { octopus } : {}),
    ...(notice ? { notice } : {}),
    links: links(jobId),
  };
}

export async function readJobStatus(jobId: string, env: Env): Promise<JobStatusResult> {
  const { provider: providerName, providerJobId } = decodeJobId(jobId);
  const provider = resolveProviderForJob(env, providerName);
  const job = await provider.getJob(providerJobId);

  return {
    jobId,
    state: job.state,
    provider: job.provider,
    ...(job.progress !== undefined ? { progress: job.progress } : {}),
    ...(job.error ? { error: job.error } : {}),
    ready: job.state === "succeeded",
    links: links(jobId),
  };
}

/** Étape 3 : rendre le GLB. Le binaire transite en flux, rien n'est stocké chez nous. */
export async function streamModel(jobId: string, env: Env): Promise<Response> {
  const { provider: providerName, providerJobId } = decodeJobId(jobId);
  const provider = resolveProviderForJob(env, providerName);
  const job: Mesh3DJob = await provider.getJob(providerJobId);

  if (job.state === "failed") {
    throw new AppError(502, "GENERATION_FAILED", job.error ?? "La génération 3D a échoué.");
  }
  if (job.state !== "succeeded") {
    throw new AppError(409, "NOT_READY", `Le modèle n'est pas encore prêt (état : ${job.state}).`, {
      state: job.state,
      progress: job.progress,
    });
  }

  const upstream = await provider.fetchModel(job);
  if (!upstream.ok || !upstream.body) {
    throw notFound("Le fichier GLB est introuvable chez le fournisseur.");
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "model/gltf-binary",
      "Content-Disposition": `attachment; filename="blacklace-${providerJobId}.glb"`,
      "Cache-Control": "no-store",
    },
  });
}
