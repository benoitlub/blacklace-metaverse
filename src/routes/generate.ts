import { Hono } from "hono";
import type { Env } from "../index";
import { generateWithOctopus } from "../adapters/octopus";
import { createThreeDProvider } from "../adapters/three-d";
import type { GenerateRequest } from "../types";

const MAX_INTENT_LENGTH = 4_000;

export const generateRoute = new Hono<{ Bindings: Env }>();

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
    return c.json({
      error: `intent must not exceed ${MAX_INTENT_LENGTH} characters`,
    }, 400);
  }

  try {
    const prompt = await generateWithOctopus(intent, c.env);
    const provider = createThreeDProvider(c.env);
    const asset = await provider.generate(prompt);

    return c.json({
      status: asset.provider === "mock" ? "mocked" : "completed",
      intent,
      prompt,
      provider: asset.provider,
      asset,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation failed";
    return c.json({
      status: "failed",
      error: message,
    }, 502);
  }
});
