import { authorizedResources, requestTimeoutMs, type Env } from "../../env";
import { OctopusNoExecutorError, misconfigured, upstreamFailed } from "../../lib/errors";
import { fetchJson, jsonHeaders } from "../../lib/http";
import type { CreativeBrief, GenerateAssetInput, PromptResult } from "../../types";

/**
 * Client HTTP d'octopus-engine.
 *
 * Contrat réel du service déployé (vérifié dans benoitlub/octopus-engine-app,
 * src/app.ts) : une seule route d'exécution, `POST /mission`, qui attend une
 * enveloppe neutre `{ operationId, title, objective, requiredCapabilities[],
 * authorizedResources[], prompt, context }` et répond
 * `{ status, operationId, missionId, contextId, summary, output, lifecycle }`.
 *
 * Point d'attention : `content.generate` n'est PAS une capacité intrinsèque
 * d'Octopus. Le moteur ne l'exécute que si un adaptateur externe la fournit et
 * s'est enregistré via `POST /adapters/register`. Sinon Octopus répond
 * `202 waiting-executor` — cas géré explicitement ici via OctopusNoExecutorError.
 */

export interface OctopusClient {
  readonly mode: "live" | "mock";
  generatePrompt(brief: CreativeBrief, input: GenerateAssetInput): Promise<PromptResult>;
}

interface MissionResponse {
  status?: string;
  operationId?: string;
  missionId?: string;
  summary?: string;
  output?: Record<string, unknown>;
  artifacts?: unknown[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

/**
 * Extraction tolérante du texte généré : Octopus laisse à l'adaptateur exécuteur
 * la forme exacte de `output`, on accepte donc les conventions les plus courantes
 * plutôt que d'imposer un champ unique.
 */
export function extractGeneratedText(payload: MissionResponse): string | undefined {
  const output = isRecord(payload.output) ? payload.output : {};

  const direct = firstString(output.text, output.content, output.prompt, output.result, output.generatedText);
  if (direct) return direct;

  const nested = isRecord(output.result) ? output.result : undefined;
  if (nested) {
    const fromNested = firstString(nested.text, nested.content, nested.prompt);
    if (fromNested) return fromNested;
  }

  const artifacts = Array.isArray(payload.artifacts) ? payload.artifacts : [];
  for (const artifact of artifacts) {
    if (!isRecord(artifact)) continue;
    const fromArtifact = firstString(artifact.content, artifact.text);
    if (fromArtifact) return fromArtifact;
    if (isRecord(artifact.content)) {
      const deep = firstString(artifact.content.text, artifact.content.prompt);
      if (deep) return deep;
    }
  }

  return undefined;
}

class LiveOctopusClient implements OctopusClient {
  readonly mode = "live" as const;

  constructor(private readonly env: Env) {}

  async generatePrompt(brief: CreativeBrief, input: GenerateAssetInput): Promise<PromptResult> {
    const baseUrl = this.env.OCTOPUS_BASE_URL?.replace(/\/+$/, "");
    if (!baseUrl) {
      throw misconfigured("OCTOPUS_BASE_URL est requis quand OCTOPUS_MODE vaut \"live\".");
    }

    const capability = this.env.OCTOPUS_CAPABILITY ?? "content.generate";
    const operationId = `blacklace_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const url = `${baseUrl}${this.env.OCTOPUS_MISSION_PATH ?? "/mission"}`;

    const body = {
      operationId,
      title: brief.title,
      objective: brief.objective,
      requiredCapabilities: [capability],
      authorizedResources: authorizedResources(this.env),
      prompt: brief.prompt,
      // `context` est obligatoire côté Octopus (CONTEXT_REQUIRED sinon) et doit
      // porter un `id`. On y range les métadonnées neutres, pas le lore lui-même.
      context: {
        id: operationId,
        label: "blacklace-metaverse-adapter",
        objective: brief.objective,
        metadata: {
          source: "blacklace-metaverse-adapter",
          system: brief.system,
          tags: brief.tags,
          ...(input.zone ? { zone: input.zone } : {}),
          ...(input.kind ? { assetKind: input.kind } : {}),
        },
      },
    };

    const { status, data } = await fetchJson<MissionResponse>(
      url,
      { method: "POST", headers: jsonHeaders(this.env.OCTOPUS_API_KEY), body: JSON.stringify(body) },
      { timeoutMs: requestTimeoutMs(this.env) },
    );

    const trace = {
      status: data.status ?? `http_${status}`,
      ...(data.operationId ? { operationId: data.operationId } : {}),
      ...(data.missionId ? { missionId: data.missionId } : {}),
      ...(data.summary ? { summary: data.summary } : {}),
    };

    // Mission enregistrée mais aucun exécuteur pour la capacité : ce n'est pas une panne.
    if (status === 202 || data.status === "waiting-executor") throw new OctopusNoExecutorError(trace);

    if (!(status >= 200 && status < 300)) {
      throw upstreamFailed(`Octopus a répondu ${status}.`, data);
    }
    if (data.status === "failed" || data.status === "rejected") {
      throw upstreamFailed(data.summary ?? "Mission Octopus en échec.", data);
    }

    const text = extractGeneratedText(data);
    if (!text) {
      throw upstreamFailed(
        "Octopus a terminé la mission sans renvoyer de texte exploitable.",
        { status: data.status, output: data.output },
      );
    }

    return { prompt: text, source: "octopus", octopus: trace };
  }
}

class MockOctopusClient implements OctopusClient {
  readonly mode = "mock" as const;

  async generatePrompt(brief: CreativeBrief, input: GenerateAssetInput): Promise<PromptResult> {
    const kind = input.kind ?? "environment";
    const zone = input.zone ? ` in ${input.zone}` : "";
    const prompt = [
      `A single weathered ${kind}${zone} from the Pro.Hibited universe of Blacklace Island:`,
      `${input.intent}.`,
      "Dark aged wood and blackened ironwork, black lace textures, heavy damp fabrics,",
      "patinated brass details, salt-eroded stone, low contrasted lighting from scattered point sources,",
      "decadent romantic elegance, a place that was already alive before anyone arrived.",
      "Centered at origin, metric scale, watertight geometry, real-time ready for Unity, no text, no logo.",
    ].join(" ");

    return {
      prompt,
      source: "octopus",
      octopus: { status: "completed", summary: `Mock Octopus — ${brief.title}` },
    };
  }
}

export function createOctopusClient(env: Env): OctopusClient {
  return (env.OCTOPUS_MODE ?? "mock").toLowerCase() === "live"
    ? new LiveOctopusClient(env)
    : new MockOctopusClient();
}
