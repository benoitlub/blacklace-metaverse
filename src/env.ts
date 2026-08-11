/**
 * Bindings d'environnement du Worker.
 *
 * Règle : aucune clé API n'apparaît dans le code. En local elles vivent dans
 * `.dev.vars` (gitignoré), en production dans `wrangler secret put`.
 */
export interface Env {
  // --- Octopus Engine ---
  /** Ex. https://octopus-engine-app.benoitlubert.workers.dev */
  OCTOPUS_BASE_URL?: string;
  /** Chemin de la route mission. Défaut : /mission */
  OCTOPUS_MISSION_PATH?: string;
  /** "live" | "mock". Défaut : mock (le projet démarre sans aucun secret). */
  OCTOPUS_MODE?: string;
  /** Optionnel : Octopus n'exige pas d'auth aujourd'hui, prévu si cela change. */
  OCTOPUS_API_KEY?: string;
  /** Capacité demandée à Octopus. Défaut : content.generate */
  OCTOPUS_CAPABILITY?: string;
  /** Ressources autorisées transmises à la mission, séparées par des virgules. Défaut : mistral */
  OCTOPUS_AUTHORIZED_RESOURCES?: string;
  /**
   * Comportement quand Octopus n'a aucun exécuteur pour la capacité demandée
   * (réponse `waiting-executor`) : "local" compose le prompt ici, "error" renvoie 503.
   * Défaut : local.
   */
  OCTOPUS_FALLBACK?: string;

  // --- Génération 3D ---
  /** "mock" | "meshy" | "tripo". Défaut : mock. */
  MESH3D_PROVIDER?: string;
  MESHY_API_KEY?: string;
  MESHY_BASE_URL?: string;
  TRIPO_API_KEY?: string;
  TRIPO_BASE_URL?: string;

  /** Timeout des appels sortants, en millisecondes. Défaut : 20000. */
  REQUEST_TIMEOUT_MS?: string;
}

export function requestTimeoutMs(env: Env): number {
  const parsed = Number(env.REQUEST_TIMEOUT_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 20_000;
}

export function authorizedResources(env: Env): string[] {
  return (env.OCTOPUS_AUTHORIZED_RESOURCES ?? "mistral")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}
