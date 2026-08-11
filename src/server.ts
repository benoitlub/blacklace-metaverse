import { Hono } from "hono";
import { handleUnityBridgeRequest } from "./bridge";
import type { UnityBridgeRequest } from "./bridge";
import type { SceneProvider } from "./providers";

export function createApp(provider: SceneProvider): Hono {
  const app = new Hono();

  app.get("/health", (c) => c.json({ ok: true }));

  app.post("/bridge/unity", async (c) => {
    let request: UnityBridgeRequest;

    try {
      request = await c.req.json<UnityBridgeRequest>();
    } catch {
      return c.json(
        {
          protocol: "1",
          requestId: "unknown",
          ok: false,
          error: {
            code: "INVALID_JSON",
            message: "Request body must be valid JSON",
          },
        },
        400,
      );
    }

    const response = await handleUnityBridgeRequest(request, provider);
    return c.json(response, response.ok ? 200 : 400);
  });

  return app;
}
