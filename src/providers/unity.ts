import type { Scene, SceneOperation } from "../models";
import type { SceneProvider } from "./scene";

export interface UnitySceneBridge {
  getActiveScene(): Promise<Scene>;
  applyOperations(operations: SceneOperation[]): Promise<Scene>;
}

export class UnitySceneProvider implements SceneProvider {
  constructor(private readonly bridge: UnitySceneBridge) {}

  async getScene(sceneId: string): Promise<Scene | null> {
    const scene = await this.bridge.getActiveScene();
    return scene.id === sceneId ? scene : null;
  }

  async applyOperations(
    sceneId: string,
    operations: SceneOperation[],
  ): Promise<Scene> {
    const current = await this.bridge.getActiveScene();
    if (current.id !== sceneId) {
      throw new Error(`Active Unity scene does not match: ${sceneId}`);
    }
    return this.bridge.applyOperations(operations);
  }
}
