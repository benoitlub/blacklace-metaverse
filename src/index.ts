import { Hono } from "hono";
import { cors } from "hono/cors";
import { generateRoute } from "./routes/generate";

const app = new Hono<{ Bindings: Env }>();

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

app.route("/", generateRoute);

export default app;

export interface Env {
  OCTOPUS_ENGINE_URL: string;
  OCTOPUS_ENGINE_API_KEY?: string;
  OCTOPUS_ENGINE_GENERATE_PATH?: string;
  OCTOPUS_ENGINE_MOCK?: string;
  THREE_D_PROVIDER?: string;
  MESHY_API_KEY?: string;
  TRIPO_API_KEY?: string;
}
