# Sources de Blacklace Island

Ce document explique **ce qu'on installe dans ce dépôt** pour que Metaverse Creator puisse fabriquer des scènes cohérentes avec Blacklace Island, et **d'où vient la matière** qui l'alimente.

Il s'adresse autant à un humain qui reprend le projet qu'à un agent IA chargé d'une tâche d'intégration.

---

## 1. Le principe qui commande tout le reste

Metaverse Creator est **neutre**. Blacklace Island est son premier cas d'usage, pas une dépendance technique. Cette règle n'est pas une préférence de style : elle découle de deux textes fondateurs.

La **Constitution de Blacklace Island — L'Ère d'Aloisia** (Notion) pose que « Octopus Engine reste neutre : il peut exécuter au service d'Aloisia sans jamais absorber de logique narrative propre » (loi 3), et que « ce qui appartient à Blacklace Island ne se mélange pas avec la mémoire d'Octopus sans passerelle explicite » (loi 5).

La **Constitution Octopus** (dépôt `octopus-engine-app`) dit la même chose depuis l'autre rive : le Core ne contient aucune connaissance de Blacklace.

**Conséquence concrète pour ce dépôt :**

| Couche | Contient | Ne contient jamais |
|---|---|---|
| `src/models`, `src/engine`, `src/routes` | scène, opérations, transport | aucun terme Blacklace |
| `src/adapters/*` | protocole d'un fournisseur | aucune règle narrative |
| `docs/lore/*`, futur `ContextProvider` | le canon Blacklace | aucun secret, aucun protocole |

Un nom de personnage ou de zone qui apparaît dans `src/models/` est un bug d'architecture, pas un détail.

---

## 2. Les sources, et ce qu'on en fait

### 2.1 Notion — le canon vivant

Notion est **la source d'autorité**. En cas de désaccord entre une source et Notion, Notion gagne.

| Page | Rôle | Usage pour la 3D |
|---|---|---|
| 📜 **Le Grimoire de Blacklace Island** | Mémoire narrative vivante du canon | Référence ultime en cas de doute |
| 🧿 **Constitution — L'Ère d'Aloisia** | Lois du processus de génération | Contraint *comment* on génère (voir §4) |
| 🏝️ **Bible visuelle transmedia & écrans visitables** | Piliers visuels, zones, ordre de production | **Source principale des zones à fabriquer** |
| **Annexe II — Métabolisme de Blacklace Island** | Cycles et équilibres de l'île | Ambiance, état d'une zone selon le cycle |
| **Lieux**, **Natasha**, fiches personnages | Entités canoniques | Détail par zone et par personnage |

La bible visuelle donne un **ordre de production explicite**, qu'on reprend tel quel plutôt que d'en inventer un :

> Carte de l'île → Rotas → Max Liberty → Feuch Institute → Natasha Live → Archives SATOR → Moscomiul Break

Avec un trio de départ recommandé : **Rotas → Feuch Institute → Max Liberty**. C'est la première cible de génération 3D.

**Accès.** Le workspace est lisible via le connecteur Notion. Attention : toutes les pages ne sont pas partagées avec l'intégration — la page du roman (§2.3) renvoie actuellement `404 object_not_found`. Une page inaccessible doit produire une erreur explicite, jamais un contenu inventé.

**Branchement.** Notion sera un `ContextProvider` (`LORE_PROVIDER=notion`). Le protocole Notion reste derrière l'adaptateur ; le cœur ne voit qu'un contexte textuel.

### 2.2 `blacklace-echo` — les zones déjà écrites

Dépôt : [`benoitlub/blacklace-echo`](https://github.com/benoitlub/blacklace-echo) — portail web React/Vite, « BLACKLACE ISLAND — Live Access ».

C'est la source la plus directement exploitable, parce qu'elle est **déjà structurée**. `src/data/islandPoiScenes.ts` décrit les points d'intérêt avec un schéma proche du nôtre :

```ts
type IslandPoiScene = {
  id: string;
  zone: string;        // "Centre de Rotas"
  title: string;       // "Rue de la Maison de l'Œil"
  subtitle: string;
  description: string;
  mood: string;        // "pierre chaude, cuivre patiné, eau lointaine"
  objective?: string;
  clues?: string[];
};
```

La correspondance avec le modèle de ce dépôt est presque directe :

| `IslandPoiScene` | Modèle Metaverse Creator |
|---|---|
| `zone` | `Scene.name` / `World.scenes[]` |
| `id` | `Scene.id` |
| `description` + `mood` | intention de génération |
| `clues`, `objective` | `Scene.metadata` |
| `actions` | futures `SceneOperation` |

Le champ `mood` est particulièrement précieux : c'est déjà de la direction artistique en langage naturel, directement injectable dans un prompt text-to-3D.

**Branchement.** Deux options, à trancher au moment de l'implémentation : import ponctuel (on copie les zones dans une fiche versionnée) ou `ContextProvider` HTTP si `blacklace-echo` expose un jour ses données. L'import ponctuel est suffisant pour démarrer.

### 2.3 Le roman — « Fragments de Blacklace Island »

Deux supports du même matériau : la page Notion *Fragments de Blacklace Island*, et un manuscrit `.doc` (32 pages, ~73 000 caractères) fourni hors dépôt.

**Décision : le texte du roman n'entre pas dans ce dépôt.** Il reste sur Notion. Ce qui entre, c'est une **fiche de lore structurée** qui en est dérivée : [`docs/lore/blacklace-island.md`](lore/blacklace-island.md).

Raison : le roman est de la prose, pas une spécification. Un générateur 3D n'a pas besoin d'un chapitre, il a besoin de savoir que le sable de la plage est noir, que le Max Liberty est en bois de grève et verre trempé, et que la Fournaise est un cratère transformé en dancefloor. La fiche extrait ces faits ; le roman reste la source citée.

### 2.4 `octopus-engine-app` — le moteur de génération de texte

Dépôt : [`benoitlub/octopus-engine-app`](https://github.com/benoitlub/octopus-engine-app), déployé sur `octopus-engine-app.benoitlubert.workers.dev`.

Ce n'est **pas** une source de lore, c'est le backend qui transforme une intention + un contexte en prompt riche. Son contrat réel est documenté dans [`docs/octopus-contract.md`](octopus-contract.md) — il diffère de ce qu'on pouvait supposer, et ce point mérite d'être lu avant toute intégration en mode live.

### 2.5 Les autres dépôts de l'écosystème

Cités pour situer, pas des sources de lore pour ce dépôt : `blacklace-island` (portail, privé), `blacklace-dice`, `blacklace-harvest`, `blacklace-publisher-ai`.

---

## 3. Ce qu'on installe dans ce dépôt

Concrètement, la matière Blacklace prend trois formes ici, et seulement trois :

**1. Une fiche de lore versionnée** — `docs/lore/blacklace-island.md`. Faits structurés : entités, lieux, règles de l'univers, langage visuel, interdits. C'est ce qu'un générateur peut consommer sans lire 32 pages.

**2. Un prompt d'ingestion réutilisable** — `docs/lore-ingestion-prompt.md`. Décrit comment relire les sources et en extraire un `LorePack` exploitable, de façon reproductible.

**3. Des adaptateurs de contexte** — derrière l'interface `ContextProvider` (`src/adapters/lore.ts`). Un adaptateur Notion, éventuellement un adaptateur statique qui sert la fiche ci-dessus. Le cœur ne sait pas lequel est branché.

Ce qui **n'entre pas** : le texte du roman, les clés API (Notion, fournisseur 3D, Octopus — `.dev.vars` et secrets Wrangler uniquement), et toute règle narrative dans `src/models` ou `src/routes`.

---

## 4. Les règles héritées de la Constitution

Quatre lois de la Constitution Aloisia ont des conséquences directes sur le code de ce dépôt. Elles ne sont pas décoratives.

**Loi 4 — le canon prime, une contradiction se signale explicitement.**
« Toute génération respecte le Grimoire existant. Une contradiction avec le canon doit être signalée explicitement, jamais silencieusement écrasée ou ignorée. »

C'est la version narrative du principe **No silent fallback** déjà inscrit dans le README de ce dépôt. Les deux disent la même chose : si une source de contexte est indisponible ou si le moteur de génération n'a pas d'exécuteur, le service **échoue de façon lisible**. Il ne compose pas un contexte de remplacement en silence. Un mode mock explicite reste permis en développement ; un repli implicite en production, non.

**Loi 6 — réversibilité.** Toute génération peut être défaite sans casser le canon. C'est exactement ce que visent les `SceneOperation` réversibles du modèle.

**Loi 8 — traçabilité douce.** Chaque contenu généré garde trace de sa source et de sa date. Un asset produit doit donc porter dans ses métadonnées : la source de contexte utilisée, l'horodatage, et le prompt qui l'a produit.

**Loi 2 — l'IA propose, Benoît dispose.** Aucune publication automatique. Un `PublicationProvider` prépare, il ne publie pas sans validation humaine.

---

## 5. La chaîne de publication

La Constitution fixe le chemin, et il ne passe pas par où on l'imaginerait :

```
GitHub (code source)
   -> Déploiement (Cloudflare Workers/Pages)
   -> URL publique stable
   -> Écran ou artefact dans le Feuch Institut sur Spatial.io
```

Trois conséquences pratiques :

- **Spatial.io ne lit pas de code** et ne se connecte ni à GitHub ni à Octopus. Il affiche des écrans qui pointent vers des URLs publiques. Un asset doit donc être servi par une URL stable.
- **Octopus reste invisible depuis Spatial.** Spatial ne voit que le résultat final servi par l'URL.
- **Unity** est en amont : éditeur et source de scènes existantes (via `/bridge/unity`), pas seulement destination. Les avatars Ready Player Me suivent le même format GLB.

---

## 6. Par où commencer

1. Lire la fiche de lore : [`docs/lore/blacklace-island.md`](lore/blacklace-island.md).
2. Vérifier le contrat Octopus avant tout passage en live : [`docs/octopus-contract.md`](octopus-contract.md).
3. Générer la première zone du trio recommandé — **Rotas**, puis Feuch Institute, puis Max Liberty.
4. Pour rafraîchir la fiche depuis les sources : [`docs/lore-ingestion-prompt.md`](lore-ingestion-prompt.md).
