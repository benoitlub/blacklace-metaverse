import { requestTimeoutMs, type Env } from "../../env";
import { badRequest, misconfigured } from "../../lib/errors";
import type { Mesh3DProvider } from "../../types";
import { MeshyProvider } from "./meshy";
import { MockMesh3DProvider } from "./mock";
import { TripoProvider } from "./tripo";

export const SUPPORTED_PROVIDERS = ["mock", "meshy", "tripo"] as const;
export type ProviderName = (typeof SUPPORTED_PROVIDERS)[number];

/**
 * Point de bascule unique entre fournisseurs 3D.
 * Changer de fournisseur = changer MESH3D_PROVIDER, aucun autre fichier ne bouge.
 */
export function resolveMesh3DProvider(env: Env, override?: string): Mesh3DProvider {
  const name = (override ?? env.MESH3D_PROVIDER ?? "mock").toLowerCase();
  const timeoutMs = requestTimeoutMs(env);

  switch (name) {
    case "mock":
      return new MockMesh3DProvider();
    case "meshy":
      return new MeshyProvider(env.MESHY_API_KEY ?? "", env.MESHY_BASE_URL, timeoutMs);
    case "tripo":
      return new TripoProvider(env.TRIPO_API_KEY ?? "", env.TRIPO_BASE_URL, timeoutMs);
    default:
      throw misconfigured(
        `Fournisseur 3D inconnu : "${name}". Valeurs acceptées : ${SUPPORTED_PROVIDERS.join(", ")}.`,
      );
  }
}

/**
 * Résout le fournisseur à partir d'un jobId déjà émis. Le jobId porte le nom du
 * fournisseur, ce qui garantit qu'un job créé chez Meshy reste interrogé chez
 * Meshy même si la variable d'environnement a changé entre-temps.
 */
export function resolveProviderForJob(env: Env, provider: string): Mesh3DProvider {
  if (!(SUPPORTED_PROVIDERS as readonly string[]).includes(provider)) {
    throw badRequest(`jobId émis par un fournisseur inconnu : "${provider}".`);
  }
  return resolveMesh3DProvider(env, provider);
}
