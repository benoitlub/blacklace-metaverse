import type { Env } from "../index";
import type { LoreContext, OctopusGenerateResponse } from "../types";

const DEFAULT_GENERATE_PATH = "/content.generate";
const DEFAULT_TIMEOUT_MS = 30_000;

export async function generateWithOctopus(
  intent: string,
  lore: LoreContext,
  env: Env,
): Promise<string> {
  if (env.OCTOPUS_ENGINE_MOCK === "true") {
    return mockOctopusPrompt(intent, lore);
  }

  if (!env.OCTOPUS_ENGINE_URL) {
    throw new Error("OCTOPUS_ENGINE_URL is required when Octopus mock is disabled");
  }

  const baseUrl = env.OCTOPUS_ENGINE_URL.replace(/\/$/, "");
  const path = env.OCTOPUS_ENGINE_GENERATE_PATH || DEFAULT_GENERATE_PATH;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}${path.startsWith("/") ? path : `/${path}`}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(env.OCTOPUS_ENGINE_API_KEY
          ? { authorization: `Bearer ${env.OCTOPUS_ENGINE_API_KEY}` }
          : {}),
      },
      body: JSON.stringify({
        intent,
        context: lore.context,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Octopus Engine returned HTTP ${response.status}`);
    }

    const data = (await response.json()) as OctopusGenerateResponse;
    const prompt = data.prompt ?? data.output ?? data.result;

    if (typeof prompt !== "string" || !prompt.trim()) {
      throw new Error("Octopus Engine response did not contain a generated prompt");
    }

    return prompt.trim();
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Octopus Engine request timed out after 30 seconds");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function mockOctopusPrompt(intent: string, lore: LoreContext): string {
  return `Create a rich, coherent 3D environment prompt from this creative intention, preserving the requested narrative intent and the supplied lore context. Intention: ${intent}. Lore context: ${lore.context}`;
}
