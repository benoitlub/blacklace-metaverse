import type { Env } from "../index";
import type { LoreProvider, LoreContext } from "../types";

const DEFAULT_TIMEOUT_MS = 15_000;

class MockLoreProvider implements LoreProvider {
  async getContext(intent: string): Promise<LoreContext> {
    return {
      source: "mock",
      context: `Narrative context placeholder for the creative intention: ${intent}`,
    };
  }
}

class HttpLoreProvider implements LoreProvider {
  constructor(
    private readonly url: string,
    private readonly apiKey?: string,
    private readonly name = "external",
  ) {}

  async getContext(intent: string): Promise<LoreContext> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      const response = await fetch(this.url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}),
        },
        body: JSON.stringify({ intent }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Lore provider returned HTTP ${response.status}`);
      }

      const data = (await response.json()) as Record<string, unknown>;
      const context = typeof data.context === "string" ? data.context : undefined;

      if (!context?.trim()) {
        throw new Error("Lore provider response did not contain context");
      }

      return { source: this.name, context: context.trim() };
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new Error("Lore provider request timed out after 15 seconds");
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function createLoreProvider(env: Env): LoreProvider {
  const provider = (env.LORE_PROVIDER ?? "mock").trim().toLowerCase();

  if (provider === "mock") {
    return new MockLoreProvider();
  }

  if (!env.LORE_API_URL) {
    throw new Error("LORE_API_URL is required when mock lore is disabled");
  }

  return new HttpLoreProvider(env.LORE_API_URL, env.LORE_API_KEY, provider || "external");
}
