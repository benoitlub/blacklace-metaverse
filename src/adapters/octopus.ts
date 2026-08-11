import type { Env } from "../index";
import type { OctopusGenerateResponse } from "../types";

export async function generateWithOctopus(intent: string, env: Env): Promise<string> {
  const baseUrl = env.OCTOPUS_ENGINE_URL.replace(/\/$/, "");

  if (!env.OCTOPUS_ENGINE_URL) {
    return mockOctopusPrompt(intent);
  }

  const response = await fetch(`${baseUrl}/content.generate`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(env.OCTOPUS_ENGINE_API_KEY
        ? { authorization: `Bearer ${env.OCTOPUS_ENGINE_API_KEY}` }
        : {}),
    },
    body: JSON.stringify({ intent }),
  });

  if (!response.ok) {
    throw new Error(`Octopus Engine returned HTTP ${response.status}`);
  }

  const data = (await response.json()) as OctopusGenerateResponse;
  const prompt = data.prompt ?? data.output ?? data.result;

  if (typeof prompt !== "string" || !prompt.trim()) {
    throw new Error("Octopus Engine response did not contain a generated prompt");
  }

  return prompt;
}

function mockOctopusPrompt(intent: string): string {
  return `Create a rich, coherent 3D environment prompt from this creative intention, preserving the requested narrative intent and visual consistency. Intention: ${intent}`;
}
