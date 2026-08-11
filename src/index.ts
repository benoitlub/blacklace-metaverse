import { Hono } from "hono";
import { generateRoute } from "./routes/generate";

const app = new Hono<{ Bindings: Env }>();

app.get("/", (c) => c.json({ service: "blacklace-metaverse", status: "ok" }));
app.get("/health", (c) => c.json({ status: "ok" }));
app.route("/", generateRoute);

export default app;

export interface Env {
  OCTOPUS_ENGINE_URL: string;
  OCTOPUS_ENGINE_API_KEY?: string;
  THREE_D_PROVIDER?: string;
  MESHY_API_KEY?: string;
  TRIPO_API_KEY?: string;
}
