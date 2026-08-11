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
  OCTOPUS_ENGINE_GENERATE_PATH?: string;
  OCTOPUS_ENGINE_MOCK?: string;
  LORE_PROVIDER?: string;
  LORE_API_URL?: string;
  LORE_API_KEY?: string;
  THREE_D_PROVIDER?: string;
  THREE_D_API_URL?: string;
  THREE_D_API_KEY?: string;
}
