import type { Id, WorldValue } from "./state";

export type RuleOperator =
  | "equals"
  | "not-equals"
  | "greater-than"
  | "greater-or-equal"
  | "less-than"
  | "less-or-equal"
  | "exists";

export interface RuleCondition {
  path: string;
  operator: RuleOperator;
  value?: WorldValue;
}

export type RuleEffect =
  | {
      type: "set-variable";
      path: string;
      value: WorldValue;
    }
  | {
      type: "emit-event";
      eventType: string;
      payload?: Record<string, WorldValue>;
    }
  | {
      type: "set-environment";
      path: string;
      value: WorldValue;
    };

export interface WorldRule {
  id: Id;
  name: string;
  conditions: RuleCondition[];
  effects: RuleEffect[];
  enabled?: boolean;
  metadata?: Record<string, WorldValue>;
}
