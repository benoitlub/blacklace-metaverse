import type { Id } from "./world";

export type WorldValue = string | number | boolean | null;

export interface EnvironmentState {
  mood?: string;
  intensity?: number;
  values?: Record<string, WorldValue>;
}

export interface ActorState {
  id: Id;
  kind: "agent" | "entity" | "avatar" | "system";
  values?: Record<string, WorldValue>;
}

export interface VisitorState {
  id: Id;
  values?: Record<string, WorldValue>;
}

export interface WorldEvent {
  id: Id;
  type: string;
  timestamp?: string;
  source?: string;
  payload?: Record<string, WorldValue>;
}

export interface WorldState {
  worldId: Id;
  environment?: EnvironmentState;
  actors?: ActorState[];
  visitors?: VisitorState[];
  events?: WorldEvent[];
  variables?: Record<string, WorldValue>;
}
