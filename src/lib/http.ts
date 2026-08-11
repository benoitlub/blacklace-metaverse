import { upstreamFailed } from "./errors";

export interface FetchOptions {
  timeoutMs?: number;
  /** Nombre de tentatives supplémentaires sur erreur réseau, 429 ou 5xx. */
  retries?: number;
}

export interface JsonResponse<T> {
  status: number;
  ok: boolean;
  data: T;
}

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * `fetch` + timeout + backoff, en APIs web uniquement (compatible Workers).
 * Ne jette pas sur statut non-2xx : l'appelant décide quoi faire du corps.
 */
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  options: FetchOptions = {},
): Promise<Response> {
  const timeoutMs = options.timeoutMs ?? 20_000;
  const retries = options.retries ?? 2;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    if (attempt > 0) await sleep(250 * 2 ** (attempt - 1));
    try {
      const response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
      if (attempt < retries && RETRYABLE_STATUS.has(response.status)) {
        lastError = new Error(`Statut ${response.status} depuis ${url}`);
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;
    }
  }

  throw upstreamFailed(
    `Appel sortant échoué vers ${url}: ${lastError instanceof Error ? lastError.message : "raison inconnue"}`,
  );
}

/** Variante JSON : renvoie le corps parsé, ou `{}` si le corps n'est pas du JSON. */
export async function fetchJson<T>(
  url: string,
  init: RequestInit,
  options: FetchOptions = {},
): Promise<JsonResponse<T>> {
  const response = await fetchWithRetry(url, init, options);
  const data = (await response.json().catch(() => ({}))) as T;
  return { status: response.status, ok: response.ok, data };
}

export const jsonHeaders = (apiKey?: string): Record<string, string> => ({
  "Content-Type": "application/json",
  Accept: "application/json",
  ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
});
