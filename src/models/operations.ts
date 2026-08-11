import type { Id, Transform } from "./world";

export type SceneOperation =
  | {
      operation: "add-object";
      target: Id;
      type: string;
      transform?: Transform;
      asset?: Id;
      metadata?: Record<string, unknown>;
    }
  | {
      operation: "remove-object";
      target: Id;
    }
  | {
      operation: "replace-asset";
      target: Id;
      asset: Id;
    }
  | {
      operation: "modify-transform";
      target: Id;
      transform: Transform;
    }
  | {
      operation: "update-metadata";
      target: Id;
      metadata: Record<string, unknown>;
    };
