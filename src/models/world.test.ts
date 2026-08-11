import { describe, expect, it } from "vitest";
import { isWorld, type World } from "./world";

describe("World model", () => {
  it("accepts a minimal world", () => {
    const world: World = {
      id: "world-1",
      name: "Example World",
      scenes: [],
    };

    expect(isWorld(world)).toBe(true);
  });

  it("rejects malformed values", () => {
    expect(isWorld(null)).toBe(false);
    expect(isWorld({ id: "world-1", name: "Example" })).toBe(false);
  });
});
