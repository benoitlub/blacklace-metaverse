import type { CreativeBrief, GenerateAssetInput } from "../types";

/**
 * Frontière d'architecture — à lire avant toute modification.
 *
 * Tout le vocabulaire Blacklace Island / Pro.Hibited vit dans CE fichier.
 * Octopus Engine reste un moteur neutre : il ne reçoit qu'un `prompt` et un
 * `objective` génériques. Aucun terme de lore ne doit être poussé dans
 * octopus-engine, et aucune notion de génération 3D ne doit y remonter non plus.
 *
 * Le lore est ici statique et versionné avec le code. Quand la source Notion sera
 * branchée, seule `loadLorePack()` changera : le reste du pipeline est déjà écrit
 * contre cette fonction et non contre la constante.
 */

export interface LorePack {
  universe: string;
  world: string;
  characters: string[];
  tone: string[];
  visualLanguage: string[];
  avoid: string[];
}

export const BLACKLACE_LORE: LorePack = {
  universe: "Pro.Hibited",
  world: "Blacklace Island",
  characters: ["Aloisia", "Feuch", "Fée Belette"],
  tone: [
    "un monde déjà vivant, jamais une vitrine promotionnelle",
    "le visiteur pénètre dans un lieu qui existait avant lui et continuera sans lui",
    "des traces, des archives et des fragments plutôt que des explications",
  ],
  visualLanguage: [
    "matériaux usés et patinés, marqués par le temps et l'humidité",
    "dentelle noire, ferronnerie, textiles lourds, bois sombre",
    "lumière basse et contrastée, sources ponctuelles plutôt qu'éclairage uniforme",
    "élégance décadente, romantisme sombre, rien de clinquant",
  ],
  avoid: [
    "esthétique cartoon ou pastel",
    "science-fiction propre et high-tech",
    "texte, logos ou pancartes lisibles dans la géométrie",
    "personnages humains dans un asset de décor",
  ],
};

/** Point d'extension unique pour brancher plus tard le lore stocké sur Notion. */
export async function loadLorePack(): Promise<LorePack> {
  return BLACKLACE_LORE;
}

const KIND_GUIDANCE: Record<string, string> = {
  environment: "Un décor de zone : géométrie d'ensemble, sol, éléments de fond, silhouette lisible de loin.",
  prop: "Un objet isolé, manipulable, à l'échelle de la main ou du mobilier.",
  structure: "Un élément bâti : architecture, ruine, passage, façade.",
  character: "Une silhouette de personnage, pose neutre en T-pose, sans accessoire détachable.",
};

/**
 * Compose le brief envoyé à Octopus. La sortie reste du texte générique :
 * c'est nous qui injectons le lore, Octopus n'a pas à le connaître.
 */
export function composeCreativeBrief(input: GenerateAssetInput, lore: LorePack): CreativeBrief {
  const kind = input.kind ?? "environment";
  const zone = input.zone ?? "zone non précisée";

  const system = [
    "Tu es un directeur artistique qui rédige des prompts pour un moteur de génération 3D (text-to-3D).",
    "Tu produis un unique paragraphe dense, en anglais, décrivant un seul objet ou décor.",
    "Tu décris la forme, les matériaux, l'état d'usure, la palette et l'ambiance lumineuse.",
    "Tu ne décris jamais de caméra, de scène animée, ni de texte à graver.",
    "Tu ne renvoies que le prompt, sans préambule ni guillemets.",
  ].join(" ");

  const prompt = [
    `Univers : ${lore.universe} / ${lore.world}.`,
    `Personnages de référence de l'univers (contexte, à ne pas modéliser sauf demande explicite) : ${lore.characters.join(", ")}.`,
    "",
    `Type d'asset : ${kind}. ${KIND_GUIDANCE[kind] ?? ""}`,
    `Zone du metavers : ${zone}.`,
    `Intention créative : ${input.intent}`,
    input.style ? `Direction de style imposée : ${input.style}` : "",
    "",
    "Tonalité à respecter :",
    ...lore.tone.map((line) => `- ${line}`),
    "",
    "Langage visuel :",
    ...lore.visualLanguage.map((line) => `- ${line}`),
    "",
    "À proscrire :",
    ...lore.avoid.map((line) => `- ${line}`),
    "",
    "Contraintes techniques : asset unique, centré sur l'origine, échelle en mètres,",
    "géométrie fermée exportable en GLB, adapté à un import Unity temps réel.",
    "",
    "Rédige maintenant le prompt text-to-3D en anglais, en un seul paragraphe.",
  ]
    .filter((line) => line !== "")
    .join("\n");

  return {
    title: `Blacklace ${kind} — ${zone}`,
    objective: "Transformer une intention créative en un prompt text-to-3D détaillé et cohérent.",
    system,
    prompt,
    tags: ["blacklace", "metaverse", kind, ...(input.zone ? [input.zone] : [])],
  };
}

/**
 * Repli local quand Octopus n'a aucun exécuteur disponible.
 * Qualité moindre qu'un passage LLM, mais le pipeline reste fonctionnel de bout en bout.
 */
export function composeLocalPrompt(input: GenerateAssetInput, lore: LorePack): string {
  const kind = input.kind ?? "environment";
  const segments = [
    `A single ${kind} asset from the ${lore.universe} universe (${lore.world})`,
    input.zone ? `located in ${input.zone}` : "",
    input.intent,
    input.style ?? "weathered materials, black lace and dark ironwork, heavy fabrics, dark aged wood",
    "low contrasted lighting, decadent romantic elegance, patinated surfaces, no text, no logo",
    "centered at origin, metric scale, closed watertight geometry, real-time ready for Unity, GLB export",
  ].filter(Boolean);

  return segments.join(", ");
}
