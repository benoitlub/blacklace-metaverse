import { Hono } from "hono";
import type { Env } from "../env";
import { parseGenerateInput } from "../lib/validate";
import { readJobStatus, startGeneration, streamModel } from "../pipeline/generateAsset";

export const generateRoutes = new Hono<{ Bindings: Env }>();

/**
 * Route de bout en bout : intention créative -> prompt Octopus -> job 3D.
 * Réponse immédiate avec un jobId ; la génération se poursuit chez le fournisseur.
 */
generateRoutes.post("/generate", async (c) => {
  const input = parseGenerateInput(await c.req.json().catch(() => undefined));
  const result = await startGeneration(input, c.env);
  return c.json({ status: "accepted", ...result }, 202);
});

/** État d'avancement d'un job. Le jobId encode le fournisseur : aucun stockage requis. */
generateRoutes.get("/jobs/:jobId", async (c) => {
  const result = await readJobStatus(c.req.param("jobId"), c.env);
  return c.json(result);
});

/** Téléchargement du GLB, relayé en flux depuis le fournisseur. */
generateRoutes.get("/jobs/:jobId/model.glb", async (c) => streamModel(c.req.param("jobId"), c.env));
