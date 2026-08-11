import type { Mesh3DJob, Mesh3DJobInput, Mesh3DProvider } from "../../types";
import { buildMockGlb } from "./mockGlb";

/**
 * Fournisseur 3D factice, sans état ni réseau.
 *
 * L'horodatage de création est encodé dans le providerJobId, ce qui permet de
 * simuler une progression asynchrone réaliste (queued -> running -> succeeded)
 * tout en restant stateless, exactement comme les fournisseurs réels.
 */

const SIMULATED_DURATION_MS = 1500;

export class MockMesh3DProvider implements Mesh3DProvider {
  readonly name = "mock";

  async createJob(input: Mesh3DJobInput): Promise<Mesh3DJob> {
    const slug = input.prompt.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32) || "asset";
    return {
      provider: this.name,
      providerJobId: `${Date.now()}_${slug}`,
      state: "queued",
      progress: 0,
    };
  }

  async getJob(providerJobId: string): Promise<Mesh3DJob> {
    const createdAt = Number(providerJobId.split("_")[0]);
    if (!Number.isFinite(createdAt)) {
      return { provider: this.name, providerJobId, state: "failed", error: "Identifiant de job mock invalide." };
    }

    const elapsed = Date.now() - createdAt;
    if (elapsed >= SIMULATED_DURATION_MS) {
      return {
        provider: this.name,
        providerJobId,
        state: "succeeded",
        progress: 100,
        // Sentinelle : le binaire est fabriqué en mémoire, il n'y a rien à télécharger.
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

  async fetchModel(_job: Mesh3DJob): Promise<Response> {
    return new Response(buildMockGlb(), {
      headers: { "Content-Type": "model/gltf-binary" },
    });
  }
}
