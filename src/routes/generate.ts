import { Hono } from "hono";
import type { Env } from "../index";
import { NoExecutorError, generatePrompt } from "../adapters/octopus";
import { createLoreProvider } from "../adapters/lore";
import { createProviderForJob, createThreeDProvider } from "../adapters/three-d";
import { decodeJobId, encodeJobId } from "../adapters/three-d/job-id";
import type { GenerateRequest } from "../types";

const MAX_INTENT_LENGTH = 4_000;

export const generateRoute = new Hono<{ Bindings: Env }>();

const links = (jobId: string) => ({
  status: `/jobs/${jobId}`,
  model: `/jobs/${jobId}/model.glb`,
});

/**
 * Creative intent -> context -> generated prompt -> asset job.
 *
 * The response is immediate and carries a job id: external asset providers take
 * minutes, which is longer than a Worker request may last. Callers poll the
 * status route and then download the model.
 */
generateRoute.post("/generate", async (c) => {
  let body: GenerateRequest;

  try {
    body = (await c.req.json()) as GenerateRequest;
  } catch {
    return c.json({ error: "Request body must be valid JSON" }, 400);
  }

  const intent = typeof body?.intent === "string" ? body.intent.trim() : "";

  if (!intent) {
    return c.json({ error: "intent must be a non-empty string" }, 400);
  }

  if (intent.length > MAX_INTENT_LENGTH) {
    return c.json({ error: `intent must not exceed ${MAX_INTENT_LENGTH} characters` }, 400);
  }

  try {
    const loreProvider = createLoreProvider(c.env);
    const lore = await loreProvider.getContext(intent);
    const generation = await generatePrompt(intent, lore, c.env);

    const provider = createThreeDProvider(c.env);
    const job = await provider.createJob({ prompt: generation.prompt, format: "glb" });
    const jobId = encodeJobId(job.provider, job.providerJobId);

    return c.json(
      {
        status: "accepted",
        intent,
        prompt: generation.prompt,
        provider: job.provider,
        job: {
          id: jobId,
          state: job.state,
          ...(job.progress !== undefined ? { progress: job.progress } : {}),
        },
        links: links(jobId),
        // Traceability: a generated result records where its context came from
        // and when it was produced.
        trace: {
          generatedAt: new Date().toISOString(),
          loreSource: lore.source,
          backendStatus: generation.backendStatus,
          ...(generation.operationId ? { operationId: generation.operationId } : {}),
        },
      },
      202,
    );
  } catch (error) {
    // The backend has no executor for the capability: report it as its own
    // condition instead of silently substituting a locally composed prompt.
    if (error instanceof NoExecutorError) {
      return c.json(
        {
          status: "no-executor",
          error: error.message,
          backendStatus: error.status,
          ...(error.operationId ? { operationId: error.operationId } : {}),
        },
        503,
      );
    }

    const message = error instanceof Error ? error.message : "Generation failed";
    return c.json({ status: "failed", error: message }, 502);
  }
});

/** Progress of an asset job. The job id carries the provider: no storage needed. */
generateRoute.get("/jobs/:jobId", async (c) => {
  const jobId = c.req.param("jobId");

  try {
    const { provider: providerName, providerJobId } = decodeJobId(jobId);
    const provider = createProviderForJob(c.env, providerName);
    const job = await provider.getJob(providerJobId);

    return c.json({
      id: jobId,
      provider: job.provider,
      state: job.state,
      ...(job.progress !== undefined ? { progress: job.progress } : {}),
      ...(job.error ? { error: job.error } : {}),
      ready: job.state === "succeeded",
      links: links(jobId),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to read job";
    return c.json({ error: message }, message.includes("job id") ? 400 : 502);
  }
});

/** Streams the generated model. Nothing is stored by this service. */
generateRoute.get("/jobs/:jobId/model.glb", async (c) => {
  const jobId = c.req.param("jobId");

  let providerJobId: string;
  let providerName: string;

  try {
    ({ provider: providerName, providerJobId } = decodeJobId(jobId));
  } catch {
    return c.json({ error: "Malformed job id" }, 400);
  }

  try {
    const provider = createProviderForJob(c.env, providerName);
    const job = await provider.getJob(providerJobId);

    if (job.state === "failed") {
      return c.json({ error: job.error ?? "Asset generation failed" }, 502);
    }

    if (job.state !== "succeeded") {
      return c.json(
        {
          error: `Model is not ready yet (state: ${job.state})`,
          state: job.state,
          ...(job.progress !== undefined ? { progress: job.progress } : {}),
        },
        409,
      );
    }

    const upstream = await provider.fetchModel(job);

    if (!upstream.ok || !upstream.body) {
      return c.json({ error: "Model file could not be retrieved from the provider" }, 502);
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        "content-type": "model/gltf-binary",
        "content-disposition": `attachment; filename="${providerJobId}.glb"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to fetch model";
    return c.json({ error: message }, 502);
  }
});
