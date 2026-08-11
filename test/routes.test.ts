import { describe, expect, it } from "vitest";
import app from "../src/index";
import type { Env } from "../src/index";
import { encodeJobId } from "../src/adapters/three-d/job-id";

/** Everything mocked: no network, no credential. */
const env = {
  OCTOPUS_ENGINE_MOCK: "true",
  LORE_PROVIDER: "mock",
  THREE_D_PROVIDER: "mock",
} as unknown as Env;

const generate = (body: unknown) =>
  app.request(
    "/generate",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
    env,
  );

describe("POST /generate", () => {
  it("turns an intent into an asset job and reports its provenance", async () => {
    const response = await generate({ intent: "Create a mysterious industrial zone" });
    expect(response.status).toBe(202);

    const body = (await response.json()) as Record<string, any>;
    expect(body.status).toBe("accepted");
    expect(body.provider).toBe("mock");
    expect(body.prompt).toContain("Create a mysterious industrial zone");
    expect(typeof body.job.id).toBe("string");
    expect(body.links.model).toBe(`/jobs/${body.job.id}/model.glb`);

    // Traceability: source of context and time of generation are recorded.
    expect(body.trace.loreSource).toBe("mock");
    expect(body.trace.backendStatus).toBe("mocked");
    expect(Date.parse(body.trace.generatedAt)).not.toBeNaN();
  });

  it("rejects a missing intent", async () => {
    const response = await generate({});
    expect(response.status).toBe(400);
  });

  it("rejects a malformed body", async () => {
    const response = await app.request(
      "/generate",
      { method: "POST", headers: { "content-type": "application/json" }, body: "{" },
      env,
    );
    expect(response.status).toBe(400);
  });

  it("reports a missing backend URL instead of generating anything", async () => {
    // No mock flag and no backend URL: the service must fail loudly rather
    // than substitute a locally composed prompt.
    const live = await app.request(
      "/generate",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ intent: "x" }),
      },
      { LORE_PROVIDER: "none", THREE_D_PROVIDER: "mock" } as unknown as Env,
    );

    expect(live.status).toBe(502);
    const body = (await live.json()) as Record<string, any>;
    expect(body.error).toMatch(/OCTOPUS_ENGINE_URL/);
  });
});

describe("GET /jobs/:jobId", () => {
  it("refuses the download until the job completes", async () => {
    const created = (await (await generate({ intent: "A rusted lantern" })).json()) as Record<
      string,
      any
    >;

    const response = await app.request(`/jobs/${created.job.id}/model.glb`, {}, env);
    expect(response.status).toBe(409);

    const body = (await response.json()) as Record<string, any>;
    expect(body.error).toMatch(/not ready/);
  });

  it("serves a valid GLB once the job has completed", async () => {
    // The mock job id encodes its creation time: forge an already-old one.
    const jobId = encodeJobId("mock", `${Date.now() - 60_000}_lantern`);

    const status = (await (await app.request(`/jobs/${jobId}`, {}, env)).json()) as Record<
      string,
      any
    >;
    expect(status.state).toBe("succeeded");
    expect(status.ready).toBe(true);

    const response = await app.request(`/jobs/${jobId}/model.glb`, {}, env);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("model/gltf-binary");

    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(Array.from(bytes.slice(0, 4))).toEqual([0x67, 0x6c, 0x54, 0x46]); // "glTF"
  });

  it("rejects an unreadable job id", async () => {
    const response = await app.request("/jobs/not-a-job-id/model.glb", {}, env);
    expect(response.status).toBe(400);
  });
});

describe("GET /health", () => {
  it("stays available", async () => {
    const response = await app.request("/health", {}, env);
    expect(response.status).toBe(200);
  });
});
