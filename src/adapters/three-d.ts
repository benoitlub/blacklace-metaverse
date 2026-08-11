import type { Env } from "../index";
import type { GeneratedAsset, ThreeDProvider } from "../types";

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

export function createThreeDProvider(env: Env): ThreeDProvider {
  const provider = (env.THREE_D_PROVIDER ?? "mock").toLowerCase();

  switch (provider) {
    case "mock":
      return new Mock3DProvider();
    case "meshy":
    case "tripo":
      throw new Error(`${provider} provider is reserved for the next implementation step`);
    default:
      throw new Error(`Unsupported 3D provider: ${provider}`);
  }
}
