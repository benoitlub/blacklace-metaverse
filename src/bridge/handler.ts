import type {
  UnityBridgeRequest,
  UnityBridgeResponse,
} from "./protocol";
import { UNITY_BRIDGE_PROTOCOL_VERSION } from "./protocol";
import type { SceneProvider } from "../providers/scene";

export async function handleUnityBridgeRequest(
  request: UnityBridgeRequest,
  provider: SceneProvider,
): Promise<UnityBridgeResponse<unknown>> {
  if (request.protocol !== UNITY_BRIDGE_PROTOCOL_VERSION) {
    return errorResponse(request.requestId, "UNSUPPORTED_PROTOCOL", "Unsupported bridge protocol version");
  }

  try {
    switch (request.action) {
      case "get-active-scene": {
        if (!request.sceneId) {
          return errorResponse(request.requestId, "MISSING_SCENE_ID", "sceneId is required");
        }
        const scene = await provider.getScene(request.sceneId);
        if (!scene) {
          return errorResponse(request.requestId, "SCENE_NOT_FOUND", "Scene not found");
        }
        return successResponse(request.requestId, scene);
      }

      case "apply-operations": {
        if (!request.sceneId) {
          return errorResponse(request.requestId, "MISSING_SCENE_ID", "sceneId is required");
        }
        if (!request.operations) {
          return errorResponse(request.requestId, "MISSING_OPERATIONS", "operations is required");
        }
        const scene = await provider.applyOperations(request.sceneId, request.operations);
        return successResponse(request.requestId, scene);
      }
    }
  } catch (error) {
    return errorResponse(
      request.requestId,
      "BRIDGE_ERROR",
      error instanceof Error ? error.message : "Unknown bridge error",
    );
  }
}

function successResponse<T>(requestId: string, result: T): UnityBridgeResponse<T> {
  return {
    protocol: UNITY_BRIDGE_PROTOCOL_VERSION,
    requestId,
    ok: true,
    result,
  };
}

function errorResponse(
  requestId: string,
  code: string,
  message: string,
): UnityBridgeResponse<never> {
  return {
    protocol: UNITY_BRIDGE_PROTOCOL_VERSION,
    requestId,
    ok: false,
    error: { code, message },
  };
}
