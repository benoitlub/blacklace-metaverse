import type { Scene, SceneObject, SceneOperation } from "../models";
import type { SceneProvider } from "./scene";

export class MemorySceneProvider implements SceneProvider {
  private readonly scenes = new Map<string, Scene>();

  constructor(initialScenes: Scene[] = []) {
    for (const scene of initialScenes) {
      this.scenes.set(scene.id, structuredClone(scene));
    }
  }

  async getScene(sceneId: string): Promise<Scene | null> {
    const scene = this.scenes.get(sceneId);
    return scene ? structuredClone(scene) : null;
  }

  async applyOperations(
    sceneId: string,
    operations: SceneOperation[],
  ): Promise<Scene> {
    const existing = this.scenes.get(sceneId);
    if (!existing) throw new Error(`Scene not found: ${sceneId}`);

    const scene = structuredClone(existing);

    for (const operation of operations) {
      switch (operation.operation) {
        case "add-object":
          scene.objects.push({
            id: operation.target,
            type: operation.type,
            transform: operation.transform,
            asset: operation.asset ? { id: operation.asset } : undefined,
            metadata: operation.metadata,
          });
          break;
        case "remove-object":
          scene.objects = scene.objects.filter((object) => object.id !== operation.target);
          break;
        case "replace-asset": {
          const object = findObject(scene.objects, operation.target);
          object.asset = { id: operation.asset };
          break;
        }
        case "modify-transform": {
          const object = findObject(scene.objects, operation.target);
          object.transform = {
            ...object.transform,
            ...operation.transform,
          };
          break;
        }
        case "update-metadata": {
          const object = findObject(scene.objects, operation.target);
          object.metadata = {
            ...object.metadata,
            ...operation.metadata,
          };
          break;
        }
      }
    }

    this.scenes.set(sceneId, structuredClone(scene));
    return structuredClone(scene);
  }
}

function findObject(objects: SceneObject[], objectId: string): SceneObject {
  const object = objects.find((candidate) => candidate.id === objectId);
  if (!object) throw new Error(`Scene object not found: ${objectId}`);
  return object;
}
