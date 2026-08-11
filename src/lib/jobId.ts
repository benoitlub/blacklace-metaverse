import { badRequest } from "./errors";

/**
 * Le jobId encode `provider|providerJobId` en base64url.
 *
 * C'est ce qui permet de rester *stateless* : l'état du job vit chez le fournisseur
 * 3D, pas chez nous. Aucune base de données n'est nécessaire pour retrouver un job
 * entre deux requêtes, y compris depuis une autre instance du Worker.
 */

const SEPARATOR = "|";

function toBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, "="));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeJobId(provider: string, providerJobId: string): string {
  if (provider.includes(SEPARATOR)) {
    throw new Error(`Le nom de fournisseur ne peut pas contenir "${SEPARATOR}".`);
  }
  return toBase64Url(`${provider}${SEPARATOR}${providerJobId}`);
}

export interface DecodedJobId {
  provider: string;
  providerJobId: string;
}

export function decodeJobId(jobId: string): DecodedJobId {
  let decoded: string;
  try {
    decoded = fromBase64Url(jobId);
  } catch {
    throw badRequest("jobId invalide.");
  }

  const index = decoded.indexOf(SEPARATOR);
  if (index <= 0 || index === decoded.length - 1) throw badRequest("jobId invalide.");

  return {
    provider: decoded.slice(0, index),
    providerJobId: decoded.slice(index + 1),
  };
}
