import { Hono } from "hono";
import type { Env } from "../env";

export const healthRoutes = new Hono<{ Bindings: Env }>();

/** Diagnostic de configuration : indique la configuration active sans jamais exposer de secret. */
healthRoutes.get("/health", (c) => {
  const env = c.env;
  return c.json({
    status: "alive",
    service: "blacklace-metaverse-adapter",
    octopus: {
      mode: (env.OCTOPUS_MODE ?? "mock").toLowerCase(),
      baseUrl: env.OCTOPUS_BASE_URL ?? null,
      capability: env.OCTOPUS_CAPABILITY ?? "content.generate",
      fallback: (env.OCTOPUS_FALLBACK ?? "local").toLowerCase(),
    },
    mesh3d: {
      provider: (env.MESH3D_PROVIDER ?? "mock").toLowerCase(),
      // Booléens seulement : la valeur des clés ne doit jamais sortir du Worker.
      meshyKeyConfigured: Boolean(env.MESHY_API_KEY),
      tripoKeyConfigured: Boolean(env.TRIPO_API_KEY),
    },
  });
});
