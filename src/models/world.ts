export type Id = string;

export interface Transform {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
}

export interface AssetReference {
  id: Id;
  uri?: string;
  format?: string;
  version?: string;
  metadata?: Record<string, unknown>;
}

export interface SceneObject {
  id: Id;
  type: string;
  transform?: Transform;
  asset?: AssetReference;
  metadata?: Record<string, unknown>;
}

export interface Scene {
  id: Id;
  name: string;
  objects: SceneObject[];
  metadata?: Record<string, unknown>;
}

export interface WorldContext {
  type: "none" | "universe" | "project" | "custom";
  id?: Id;
  metadata?: Record<string, unknown>;
}

export interface World {
  id: Id;
  name: string;
  context?: WorldContext;
  scenes: Scene[];
  metadata?: Record<string, unknown>;
}

export function isWorld(value: unknown): value is World {
  if (!value || typeof value !== "object") return false;
  const world = value as Partial<World>;
  return (
    typeof world.id === "string" &&
    typeof world.name === "string" &&
    Array.isArray(world.scenes)
  );
}
