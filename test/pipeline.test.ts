import { describe, expect, it } from "vitest";
import app from "../src/index";
import type { Env } from "../src/env";
import { encodeJobId } from "../src/lib/jobId";

/** Environnement de test : tout en mock, aucun appel réseau, aucun secret. */
const env: Env = { OCTOPUS_MODE: "mock", MESH3D_PROVIDER: "mock" };

const post = (body: unknown) =>
  app.request("/v1/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }, env);

describe("POST /v1/generate", () => {
  it("transforme une intention en job 3D et renvoie un jobId exploitable", async () => {
    const response = await post({ intent: "le phare noyé de la crique nord", zone: "crique-nord", kind: "structure" });
    expect(response.status).toBe(202);

    const body = await response.json() as Record<string, any>;
    expect(body.status).toBe("accepted");
    expect(body.provider).toBe("mock");
    expect(body.promptSource).toBe("octopus");
    expect(typeof body.jobId).toBe("string");
    // Le prompt doit avoir été enrichi par le lore, pas recopié tel quel.
    expect(body.prompt).toContain("Blacklace Island");
    expect(body.prompt.length).toBeGreaterThan(100);
    expect(body.links.model).toBe(`/v1/jobs/${body.jobId}/model.glb`);
  });

  it("rejette une intention manquante", async () => {
    const response = await post({ zone: "crique-nord" });
    expect(response.status).toBe(400);
    const body = await response.json() as Record<string, any>;
    expect(body.error.code).toBe("BAD_REQUEST");
  });

  it("rejette un kind inconnu", async () => {
    const response = await post({ intent: "un banc", kind: "vehicule" });
    expect(response.status).toBe(400);
  });
});

describe("GET /v1/jobs/:jobId", () => {
  it("refuse le téléchargement tant que le job n'est pas terminé", async () => {
    const created = await (await post({ intent: "une lanterne rouillée" })).json() as Record<string, any>;
    const response = await app.request(`/v1/jobs/${created.jobId}/model.glb`, {}, env);
    expect(response.status).toBe(409);
    const body = await response.json() as Record<string, any>;
    expect(body.error.code).toBe("NOT_READY");
  });

  it("sert un GLB valide une fois le job terminé", async () => {
    // Le jobId encode l'horodatage de création : on en forge un déjà « ancien ».
    const jobId = encodeJobId("mock", `${Date.now() - 60_000}_lanterne`);

    const status = await (await app.request(`/v1/jobs/${jobId}`, {}, env)).json() as Record<string, any>;
    expect(status.state).toBe("succeeded");
    expect(status.ready).toBe(true);

    const response = await app.request(`/v1/jobs/${jobId}/model.glb`, {}, env);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("model/gltf-binary");

    const bytes = new Uint8Array(await response.arrayBuffer());
    // Signature GLB : "glTF".
    expect(Array.from(bytes.slice(0, 4))).toEqual([0x67, 0x6c, 0x54, 0x46]);
  });

  it("rejette un jobId illisible", async () => {
    const response = await app.request("/v1/jobs/pas-un-job-id/model.glb", {}, env);
    expect(response.status).toBe(400);
  });
});

describe("GET /health", () => {
  it("expose la configuration sans divulguer de secret", async () => {
    const body = await (await app.request("/health", {}, { ...env, MESHY_API_KEY: "secret-a-ne-pas-fuiter" })).json() as Record<string, any>;
    expect(body.mesh3d.provider).toBe("mock");
    expect(body.mesh3d.meshyKeyConfigured).toBe(true);
    expect(JSON.stringify(body)).not.toContain("secret-a-ne-pas-fuiter");
  });
});
