/**
 * Types du domaine — volontairement neutres vis-à-vis des fournisseurs.
 * Aucun type ici ne dépend de Meshy, de Tripo3D ni d'Octopus.
 */

export type AssetKind = "environment" | "prop" | "structure" | "character";

export const ASSET_KINDS: readonly AssetKind[] = ["environment", "prop", "structure", "character"];

/** Intention créative reçue par l'API. */
export interface GenerateAssetInput {
  /** Texte libre : « génère le décor de la crique nord ». */
  intent: string;
  /** Zone du metavers ciblée (sert au cadrage lore). */
  zone?: string;
  kind?: AssetKind;
  /** Surcharge de style, sinon le style Blacklace par défaut s'applique. */
  style?: string;
  seed?: number;
}

/** Brief composé localement à partir du lore, envoyé à Octopus comme entrée neutre. */
export interface CreativeBrief {
  title: string;
  objective: string;
  system: string;
  prompt: string;
  tags: string[];
}

export type PromptSource = "octopus" | "local-fallback";

/** Résultat de l'étape 1 : intention -> prompt riche. */
export interface PromptResult {
  prompt: string;
  source: PromptSource;
  octopus?: OctopusTrace;
}

/** Trace de l'appel Octopus, conservée dans la réponse pour le débogage. */
export interface OctopusTrace {
  status: string;
  operationId?: string;
  missionId?: string;
  summary?: string;
}

export type JobState = "queued" | "running" | "succeeded" | "failed";

/** Entrée normalisée d'un fournisseur de génération 3D. */
export interface Mesh3DJobInput {
  prompt: string;
  negativePrompt?: string;
  seed?: number;
  format: "glb";
}

/** État normalisé d'un job chez un fournisseur 3D. */
export interface Mesh3DJob {
  provider: string;
  providerJobId: string;
  state: JobState;
  /** 0..100 quand le fournisseur le communique. */
  progress?: number;
  /** URL du GLB côté fournisseur, présente uniquement quand state === "succeeded". */
  modelUrl?: string;
  error?: string;
}

/**
 * Port de génération 3D. Toute intégration (Meshy, Tripo3D, mock, futur fournisseur)
 * implémente cette interface et rien d'autre : le pipeline ne connaît que ce contrat.
 */
export interface Mesh3DProvider {
  readonly name: string;
  createJob(input: Mesh3DJobInput): Promise<Mesh3DJob>;
  getJob(providerJobId: string): Promise<Mesh3DJob>;
  /** Renvoie le GLB en flux. Le pipeline ne suppose jamais où le binaire est stocké. */
  fetchModel(job: Mesh3DJob): Promise<Response>;
}
