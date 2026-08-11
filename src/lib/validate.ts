import { ASSET_KINDS, type AssetKind, type GenerateAssetInput } from "../types";
import { badRequest } from "./errors";

const MAX_INTENT_LENGTH = 2000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown, field: string, maxLength = 200): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") throw badRequest(`\`${field}\` doit être une chaîne.`);
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > maxLength) throw badRequest(`\`${field}\` dépasse ${maxLength} caractères.`);
  return trimmed;
}

/** Validation manuelle : le service n'a qu'un seul corps de requête, une dépendance de schéma serait disproportionnée. */
export function parseGenerateInput(body: unknown): GenerateAssetInput {
  if (!isRecord(body)) throw badRequest("Le corps de la requête doit être un objet JSON.");

  const intent = optionalString(body.intent, "intent", MAX_INTENT_LENGTH);
  if (!intent) throw badRequest("`intent` est requis : décrivez l'intention créative en texte libre.");

  const kindValue = optionalString(body.kind, "kind");
  if (kindValue !== undefined && !ASSET_KINDS.includes(kindValue as AssetKind)) {
    throw badRequest(`\`kind\` doit valoir : ${ASSET_KINDS.join(", ")}.`);
  }

  let seed: number | undefined;
  if (body.seed !== undefined && body.seed !== null) {
    const parsed = Number(body.seed);
    if (!Number.isInteger(parsed) || parsed < 0) throw badRequest("`seed` doit être un entier positif.");
    seed = parsed;
  }

  return {
    intent,
    ...(optionalString(body.zone, "zone") ? { zone: optionalString(body.zone, "zone") as string } : {}),
    ...(kindValue ? { kind: kindValue as AssetKind } : {}),
    ...(optionalString(body.style, "style", 400) ? { style: optionalString(body.style, "style", 400) as string } : {}),
    ...(seed !== undefined ? { seed } : {}),
  };
}
