import type { AssetJob, AssetJobInput, ThreeDProvider } from "../../types";
import { buildMockGlb } from "./mock-glb";

/**
 * Explicit mock provider: no network, no state.
 *
 * The creation timestamp is encoded in the provider job id, which simulates a
 * realistic asynchronous progression (queued -> running -> succeeded) while
 * staying stateless, exactly like the real providers.
 */

const SIMULATED_DURATION_MS = 1_500;

export class MockThreeDProvider implements ThreeDProvider {
  readonly name = "mock";

  async createJob(input: AssetJobInput): Promise<AssetJob> {
    const slug =
      input.prompt
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 32) || "asset";

    return {
      provider: this.name,
      providerJobId: `${Date.now()}_${slug}`,
      state: "queued",
      progress: 0,
    };
  }

  async getJob(providerJobId: string): Promise<AssetJob> {
    const createdAt = Number(providerJobId.split("_")[0]);

    if (!Number.isFinite(createdAt)) {
      return {
        provider: this.name,
        providerJobId,
        state: "failed",
        error: "Malformed mock job id",
      };
    }

    const elapsed = Date.now() - createdAt;

    if (elapsed >= SIMULATED_DURATION_MS) {
      return {
        provider: this.name,
        providerJobId,
        state: "succeeded",
        progress: 100,
        // Sentinel: the binary is built in memory, there is nothing to download.
        modelUrl: "internal:mock-glb",
      };
    }

    return {
      provider: this.name,
      providerJobId,
      state: "running",
      progress: Math.min(99, Math.round((elapsed / SIMULATED_DURATION_MS) * 100)),
    };
  }

  async fetchModel(_job: AssetJob): Promise<Response> {
    return new Response(buildMockGlb(), {
      headers: { "content-type": "model/gltf-binary" },
    });
  }
}
