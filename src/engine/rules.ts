import type { RuleCondition, RuleEffect, WorldRule } from "../models/rules";
import type { WorldState, WorldValue } from "../models/state";

export interface RuleEngineResult {
  state: WorldState;
  events: WorldState["events"];
  appliedRuleIds: string[];
}

function isWorldValue(value: unknown): value is WorldValue {
  return value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

function readPath(state: WorldState, path: string): WorldValue | undefined {
  let current: unknown = state;

  for (const segment of path.split(".").filter(Boolean)) {
    if (typeof current !== "object" || current === null) return undefined;
    current = (current as Record<string, unknown>)[segment];
  }

  return isWorldValue(current) ? current : undefined;
}

function writePath(state: WorldState, path: string, value: WorldValue): void {
  const segments = path.split(".").filter(Boolean);
  if (segments.length === 0) throw new Error("Rule path cannot be empty");

  let current: Record<string, unknown> = state as unknown as Record<string, unknown>;

  for (const segment of segments.slice(0, -1)) {
    const next = current[segment];
    if (typeof next !== "object" || next === null || Array.isArray(next)) {
      current[segment] = {};
    }
    current = current[segment] as Record<string, unknown>;
  }

  current[segments[segments.length - 1]] = value;
}

function matchesCondition(condition: RuleCondition, state: WorldState): boolean {
  const actual = readPath(state, condition.path);

  switch (condition.operator) {
    case "exists":
      return actual !== undefined;
    case "equals":
      return actual === condition.value;
    case "not-equals":
      return actual !== condition.value;
    case "greater-than":
      return typeof actual === "number" && typeof condition.value === "number" && actual > condition.value;
    case "greater-or-equal":
      return typeof actual === "number" && typeof condition.value === "number" && actual >= condition.value;
    case "less-than":
      return typeof actual === "number" && typeof condition.value === "number" && actual < condition.value;
    case "less-or-equal":
      return typeof actual === "number" && typeof condition.value === "number" && actual <= condition.value;
  }
}

function applyEffect(state: WorldState, effect: RuleEffect, events: NonNullable<WorldState["events"]>): void {
  switch (effect.type) {
    case "set-variable":
      writePath(state, `variables.${effect.path}`, effect.value);
      return;
    case "set-environment":
      writePath(state, `environment.${effect.path}`, effect.value);
      return;
    case "emit-event":
      events.push({
        id: `rule-event-${events.length + 1}`,
        type: effect.eventType,
        source: "rule-engine",
        payload: effect.payload,
      });
      return;
  }
}

export function evaluateRules(state: WorldState, rules: WorldRule[]): RuleEngineResult {
  const nextState: WorldState = structuredClone(state);
  const events = [...(nextState.events ?? [])];
  const appliedRuleIds: string[] = [];

  for (const rule of rules) {
    if (rule.enabled === false) continue;
    if (!rule.conditions.every((condition) => matchesCondition(condition, nextState))) continue;

    for (const effect of rule.effects) applyEffect(nextState, effect, events);
    appliedRuleIds.push(rule.id);
  }

  nextState.events = events;
  return { state: nextState, events, appliedRuleIds };
}
