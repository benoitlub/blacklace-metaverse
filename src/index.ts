import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./env";
import { toErrorResponse } from "./lib/errors";
import { generateRoutes } from "./routes/generate";
import { healthRoutes } from "./routes/health";

/**
 * blacklace-metaverse-adapter
 *
 * Pont entre l'univers narratif Blacklace Island et un metavers Unity :
 *   intention créative -> octopus-engine (content.generate) -> API 3D -> GLB.
 *
 * Le service est sans état : aucune base de données, l'état des jobs vit chez le
 * fournisseur 3D et se retrouve via un jobId auto-porteur.
 */
const app = new Hono<{ Bindings: Env }>();

app.use("*", cors({ origin: "*", allowMethods: ["GET", "POST", "OPTIONS"], allowHeaders: ["Content-Type"] }));

app.get("/", (c) =>
  c.json({
    name: "blacklace-metaverse-adapter",
    role: "Client d'octopus-engine, producteur d'assets GLB pour Unity.",
    stateless: true,
    routes: [
      "GET /health",
      "POST /v1/generate",
      "GET /v1/jobs/:jobId",
      "GET /v1/jobs/:jobId/model.glb",
    ],
  }),
);

app.route("/", healthRoutes);
app.route("/v1", generateRoutes);

app.notFound(() =>
  new Response(JSON.stringify({ error: { code: "NOT_FOUND", message: "Route inconnue." } }), {
    status: 404,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  }),
);

app.onError((error) => toErrorResponse(error));

export default app;
