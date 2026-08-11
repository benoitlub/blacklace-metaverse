import type { Env } from "../index";
import type { LoreContext, LoreProvider } from "../types";

class EmptyLoreProvider implements LoreProvider {
  async getContext(): Promise<LoreContext> {
    return {
      source: "none",
      context: "",
    };
  }
}

class MockLoreProvider implements LoreProvider {
  async getContext(intent: string): Promise<LoreContext> {
    return {
      source: "mock",
      context: `Creative context for the requested scene: ${intent}`,
    };
  }
}

export function createLoreProvider(env: Env): LoreProvider {
  const provider = (env.LORE_PROVIDER ?? "none").trim().toLowerCase();

  if (provider === "mock") return new MockLoreProvider();
  if (provider === "none" || provider === "") return new EmptyLoreProvider();

  throw new Error(`Unsupported lore provider: ${provider}`);
}
