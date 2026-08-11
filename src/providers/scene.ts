import type { Scene, SceneOperation } from "../models";

export interface SceneProvider {
  getScene(sceneId: string): Promise<Scene | null>;
  applyOperations(sceneId: string, operations: SceneOperation[]): Promise<Scene>;
}
