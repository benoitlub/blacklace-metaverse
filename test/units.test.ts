import { describe, expect, it } from "vitest";
import { extractGeneratedText } from "../src/adapters/octopus/client";
import { buildMockGlb } from "../src/adapters/mesh3d/mockGlb";
import { decodeJobId, encodeJobId } from "../src/lib/jobId";
import { BLACKLACE_LORE, composeCreativeBrief } from "../src/lore/blacklace";

describe("jobId", () => {
  it("fait un aller-retour sans perte", () => {
    const encoded = encodeJobId("meshy", "01890a5d-ac94-7c3f-8f2e-1b2c3d4e5f60");
    expect(decodeJobId(encoded)).toEqual({
      provider: "meshy",
      providerJobId: "01890a5d-ac94-7c3f-8f2e-1b2c3d4e5f60",
    });
  });

  it("préserve un identifiant contenant des séparateurs", () => {
    const encoded = encodeJobId("mock", "1700000000000_le-phare");
    expect(decodeJobId(encoded).providerJobId).toBe("1700000000000_le-phare");
  });

  it("rejette une valeur non décodable", () => {
    expect(() => decodeJobId("???")).toThrow();
  });
});

describe("buildMockGlb", () => {
  it("produit un conteneur GLB conforme", () => {
    const buffer = buildMockGlb();
    const view = new DataView(buffer);

    expect(view.getUint32(0, true)).toBe(0x46546c67); // magic "glTF"
    expect(view.getUint32(4, true)).toBe(2); // version
    expect(view.getUint32(8, true)).toBe(buffer.byteLength); // longueur totale cohérente

    const jsonLength = view.getUint32(12, true);
    expect(view.getUint32(16, true)).toBe(0x4e4f534a); // chunk JSON
    expect(jsonLength % 4).toBe(0); // alignement exigé par la spec

    const json = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, jsonLength)));
    expect(json.asset.version).toBe("2.0");
    expect(json.meshes).toHaveLength(1);

    // Le chunk BIN doit suivre immédiatement et rester aligné.
    expect(view.getUint32(20 + jsonLength + 4, true)).toBe(0x004e4942);
  });
});

describe("composeCreativeBrief", () => {
  it("injecte le lore et l'intention dans le brief envoyé à Octopus", () => {
    const brief = composeCreativeBrief(
      { intent: "un ponton effondré", zone: "crique-nord", kind: "structure" },
      BLACKLACE_LORE,
    );

    expect(brief.prompt).toContain("un ponton effondré");
    expect(brief.prompt).toContain("crique-nord");
    expect(brief.prompt).toContain("Blacklace Island");
    expect(brief.tags).toContain("structure");
    expect(brief.objective).not.toContain("Blacklace"); // l'objectif reste neutre
  });
});

describe("extractGeneratedText", () => {
  it("accepte les conventions de sortie les plus courantes", () => {
    expect(extractGeneratedText({ output: { text: "A" } })).toBe("A");
    expect(extractGeneratedText({ output: { content: "B" } })).toBe("B");
    expect(extractGeneratedText({ output: { result: { prompt: "C" } } })).toBe("C");
    expect(extractGeneratedText({ artifacts: [{ kind: "text", content: "D" }] })).toBe("D");
    expect(extractGeneratedText({ artifacts: [{ content: { text: "E" } }] })).toBe("E");
  });

  it("renvoie undefined quand rien n'est exploitable", () => {
    expect(extractGeneratedText({ output: { decision: "record" } })).toBeUndefined();
    expect(extractGeneratedText({})).toBeUndefined();
  });
});
