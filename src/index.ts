import { Hono } from "hono";
import { cors } from "hono/cors";
import { generateRoute } from "./routes/generate";
import { handleUnityBridgeRequest } from "./bridge";
import type { UnityBridgeRequest } from "./bridge";
import { MemorySceneProvider } from "./providers/memory-scene";

const app = new Hono<{ Bindings: Env }>();
const sceneProvider = new MemorySceneProvider();

app.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
}));

app.get("/", (c) => c.json({
  service: "blacklace-metaverse",
  status: "ok",
  runtime: "cloudflare-workers",
}));

app.get("/health", (c) => c.json({
  status: "ok",
  service: "blacklace-metaverse",
}));

app.post("/bridge/unity", async (c) => {
  let request: UnityBridgeRequest;

  try {
    request = await c.req.json<UnityBridgeRequest>();
  } catch {
    return c.json({
      protocol: "1",
      requestId: "unknown",
      ok: false,
      error: {
        code: "INVALID_JSON",
        message: "Request body must be valid JSON",
      },
    }, 400);
  }

  const response = await handleUnityBridgeRequest(request, sceneProvider);
  return c.json(response, response.ok ? 200 : 400);
});

app.route("/", generateRoute);

export default app;

export interface Env {
  OCTOPUS_ENGINE_URL: string;
  OCTOPUS_ENGINE_API_KEY?: string;
  /** Mission route on the generation backend. Defaults to /mission. */
  OCTOPUS_ENGINE_MISSION_PATH?: string;
  /** Capability requested from the backend. Defaults to content.generate. */
  OCTOPUS_ENGINE_CAPABILITY?: string;
  OCTOPUS_ENGINE_MOCK?: string;
  LORE_PROVIDER?: string;
  LORE_API_URL?: string;
  LORE_API_KEY?: string;
  /** Logical adapter name: mock, meshy or tripo. */
  THREE_D_PROVIDER?: string;
  /** Optional base URL override for the selected asset provider. */
  THREE_D_API_URL?: string;
  THREE_D_API_KEY?: string;
}
