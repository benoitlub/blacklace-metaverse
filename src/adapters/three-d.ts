import type { Env } from "../index";
import type { GeneratedAsset, ThreeDProvider } from "../types";

const DEFAULT_TIMEOUT_MS = 60_000;

export class Mock3DProvider implements ThreeDProvider {
  async generate(prompt: string): Promise<GeneratedAsset> {
    const encoded = encodeURIComponent(prompt.slice(0, 120));
    return {
      format: "glb",
      provider: "mock",
      url: `mock://generated/${encoded}`,
    };
  }
}

/**
 * Generic HTTP boundary for a future 3D provider.
 * Provider-specific request/response mapping belongs in a dedicated adapter;
 * this service never selects a vendor by name.
 */
export class HttpThreeDProvider implements ThreeDProvider {
  constructor(
    private readonly url: string,
    private readonly apiKey?: string,
    private readonly name = "external",
  ) {}

  async generate(prompt: string): Promise<GeneratedAsset> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      const response = await fetch(this.url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}),
        },
        body: JSON.stringify({ prompt }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`3D provider returned HTTP ${response.status}`);
      }

      const data = (await response.json()) as Record<string, unknown>;
      const url = typeof data.url === "string" ? data.url : undefined;

      if (!url) {
        throw new Error("3D provider response did not contain an asset URL");
      }

      return { format: "glb", provider: this.name, url };
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new Error("3D provider request timed out after 60 seconds");
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function createThreeDProvider(env: Env): ThreeDProvider {
  const provider = (env.THREE_D_PROVIDER ?? "mock").trim().toLowerCase();

  if (provider === "mock") {
    return new Mock3DProvider();
  }

  if (!env.THREE_D_API_URL) {
    throw new Error("THREE_D_API_URL is required when mock 3D generation is disabled");
  }

  return new HttpThreeDProvider(
    env.THREE_D_API_URL,
    env.THREE_D_API_KEY,
    env.THREE_D_PROVIDER || "external",
  );
}
