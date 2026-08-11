import type { Scene, SceneOperation } from "../models";

export const UNITY_BRIDGE_PROTOCOL_VERSION = "1" as const;

export interface UnityBridgeRequest {
  protocol: typeof UNITY_BRIDGE_PROTOCOL_VERSION;
  requestId: string;
  action: "get-active-scene" | "apply-operations";
  sceneId?: string;
  operations?: SceneOperation[];
}

export interface UnityBridgeSuccess<T> {
  protocol: typeof UNITY_BRIDGE_PROTOCOL_VERSION;
  requestId: string;
  ok: true;
  result: T;
}

export interface UnityBridgeError {
  protocol: typeof UNITY_BRIDGE_PROTOCOL_VERSION;
  requestId: string;
  ok: false;
  error: {
    code: string;
    message: string;
  };
}

export type UnityBridgeResponse<T> =
  | UnityBridgeSuccess<T>
  | UnityBridgeError;

export type UnityBridgeResult = Scene;
