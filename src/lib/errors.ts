/** Erreur applicative portant un code stable et un statut HTTP. */
export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message: string, details?: unknown): AppError =>
  new AppError(400, "BAD_REQUEST", message, details);

export const notFound = (message: string): AppError => new AppError(404, "NOT_FOUND", message);

export const misconfigured = (message: string): AppError => new AppError(500, "MISCONFIGURED", message);

export const upstreamFailed = (message: string, details?: unknown): AppError =>
  new AppError(502, "UPSTREAM_FAILED", message, details);

/**
 * Octopus a bien reçu la mission mais aucun adaptateur enregistré ne fournit la
 * capacité demandée. Cas nominal, pas une panne : le pipeline peut basculer en
 * composition locale.
 */
export class OctopusNoExecutorError extends Error {
  readonly trace: { status: string; operationId?: string; missionId?: string; summary?: string };

  constructor(trace: { status: string; operationId?: string; missionId?: string; summary?: string }) {
    super(trace.summary ?? "Octopus n'a aucun exécuteur pour cette capacité.");
    this.name = "OctopusNoExecutorError";
    this.trace = trace;
  }
}

/** Sérialise n'importe quelle erreur en réponse JSON stable. */
export function toErrorResponse(error: unknown): Response {
  const isApp = error instanceof AppError;
  const status = isApp ? error.status : 500;
  const body = {
    error: {
      code: isApp ? error.code : "INTERNAL_ERROR",
      message: error instanceof Error ? error.message : "Erreur inattendue.",
      ...(isApp && error.details !== undefined ? { details: error.details } : {}),
    },
  };
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
