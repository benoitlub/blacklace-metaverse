import { describe, expect, it } from "vitest";
import {
  NoExecutorError,
  buildMissionRequest,
  extractGeneratedText,
} from "../src/adapters/octopus";
import { buildMockGlb } from "../src/adapters/three-d/mock-glb";
import { decodeJobId, encodeJobId } from "../src/adapters/three-d/job-id";
import { createThreeDProvider } from "../src/adapters/three-d";

describe("mission request", () => {
  it("carries the mandatory context id and the requested capability", () => {
    const request = buildMissionRequest(
      "Create a mysterious industrial zone",
      { source: "mock", context: "Narrative context" },
      "content.generate",
      "mvc_test",
    ) as Record<string, any>;

    expect(request.requiredCapabilities).toEqual(["content.generate"]);
    // The backend answers 400 CONTEXT_REQUIRED without it.
    expect(request.context.id).toBe("mvc_test");
    expect(request.prompt).toContain("Create a mysterious industrial zone");
    expect(request.prompt).toContain("Narrative context");
  });

  it("omits the context block from the prompt when there is no narrative context", () => {
    const request = buildMissionRequest("Improve the lighting", { source: "none", context: "" }, "content.generate", "mvc_test") as Record<string, any>;

    expect(request.prompt).toBe("Creative intention: Improve the lighting");
    expect(request.context.metadata.contextSource).toBe("none");
  });
});

describe("extractGeneratedText", () => {
  it("accepts the common output conventions", () => {
    expect(extractGeneratedText({ output: { text: "A" } })).toBe("A");
    expect(extractGeneratedText({ output: { content: "B" } })).toBe("B");
    expect(extractGeneratedText({ output: { result: { prompt: "C" } } })).toBe("C");
    expect(extractGeneratedText({ artifacts: [{ kind: "text", content: "D" }] })).toBe("D");
    expect(extractGeneratedText({ artifacts: [{ content: { text: "E" } }] })).toBe("E");
  });

  it("returns undefined when nothing is usable", () => {
    // An intrinsic-only mission returns a decision, not generated text.
    expect(extractGeneratedText({ output: { decision: "record" } })).toBeUndefined();
    expect(extractGeneratedText({})).toBeUndefined();
  });
});

describe("NoExecutorError", () => {
  it("preserves the backend status and summary", () => {
    const error = new NoExecutorError({
      status: "waiting-executor",
      operationId: "op_1",
      summary: "Mission recorded and waiting for a compatible executor.",
    });

    expect(error.status).toBe("waiting-executor");
    expect(error.operationId).toBe("op_1");
    expect(error.message).toContain("waiting for a compatible executor");
  });
});

describe("job id", () => {
  it("round-trips without loss", () => {
    const encoded = encodeJobId("meshy", "01890a5d-ac94-7c3f-8f2e-1b2c3d4e5f60");
    expect(decodeJobId(encoded)).toEqual({
      provider: "meshy",
      providerJobId: "01890a5d-ac94-7c3f-8f2e-1b2c3d4e5f60",
    });
  });

  it("preserves ids that contain separators", () => {
    const encoded = encodeJobId("mock", "1700000000000_north-cove");
    expect(decodeJobId(encoded).providerJobId).toBe("1700000000000_north-cove");
  });

  it("rejects an undecodable value", () => {
    expect(() => decodeJobId("???")).toThrow();
  });
});

describe("buildMockGlb", () => {
  it("produces a spec-compliant GLB container", () => {
    const buffer = buildMockGlb();
    const view = new DataView(buffer);

    expect(view.getUint32(0, true)).toBe(0x46546c67); // "glTF"
    expect(view.getUint32(4, true)).toBe(2);
    expect(view.getUint32(8, true)).toBe(buffer.byteLength);

    const jsonLength = view.getUint32(12, true);
    expect(view.getUint32(16, true)).toBe(0x4e4f534a); // JSON chunk
    expect(jsonLength % 4).toBe(0); // required alignment

    const json = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, jsonLength)));
    expect(json.asset.version).toBe("2.0");
    expect(json.meshes).toHaveLength(1);

    expect(view.getUint32(20 + jsonLength + 4, true)).toBe(0x004e4942); // BIN chunk
  });
});

describe("provider selection", () => {
  it("defaults to the explicit mock", () => {
    expect(createThreeDProvider({} as any).name).toBe("mock");
  });

  it("refuses an unknown provider instead of falling back", () => {
    expect(() => createThreeDProvider({ THREE_D_PROVIDER: "nope" } as any)).toThrow(
      /Unknown asset provider/,
    );
  });

  it("requires a credential for a real provider", () => {
    expect(() => createThreeDProvider({ THREE_D_PROVIDER: "meshy" } as any)).toThrow(
      /THREE_D_API_KEY/,
    );
  });
});
