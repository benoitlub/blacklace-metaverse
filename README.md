# blacklace-metaverse-adapter

Pont entre l'univers narratif **Blacklace Island** et un futur metavers Unity.

```
intention créative  →  octopus-engine (content.generate)  →  API de génération 3D  →  fichier GLB
```

Service **Hono + TypeScript**, écrit nativement pour **Cloudflare Workers**, **sans état** et **sans base de données**.

---

## Sommaire

- [Ce que fait le service](#ce-que-fait-le-service)
- [À lire avant de brancher le vrai Octopus](#à-lire-avant-de-brancher-le-vrai-octopus)
- [Structure du projet](#structure-du-projet)
- [Lancer en local](#lancer-en-local)
- [Variables d'environnement](#variables-denvironnement)
- [API](#api)
- [Changer de fournisseur 3D](#changer-de-fournisseur-3d)
- [Pousser vers un nouveau repo GitHub](#pousser-vers-un-nouveau-repo-github)
- [Déployer sur Cloudflare](#déployer-sur-cloudflare)
- [Suites possibles](#suites-possibles)

---

## Ce que fait le service

1. Reçoit une **intention créative** en texte libre (« le phare noyé de la crique nord »).
2. Compose un **brief** à partir du lore Blacklace, puis appelle **octopus-engine** pour le transformer en prompt text-to-3D riche.
3. Envoie ce prompt à une **API de génération 3D** (Meshy ou Tripo3D, interchangeables).
4. Rend un **GLB standard**, prêt à importer dans Unity.

**Frontière d'architecture.** Tout le vocabulaire Blacklace vit dans `src/lore/blacklace.ts`. Octopus ne reçoit qu'un `prompt` et un `objective` génériques : aucune notion de Blacklace ni de génération 3D ne remonte dans octopus-engine. La dépendance est à sens unique — ce service consomme Octopus, jamais l'inverse.

---

## À lire avant de brancher le vrai Octopus

Le contrat a été relevé directement dans le code déployé (`benoitlub/octopus-engine-app`, `src/app.ts`). Deux points comptent :

**1. Octopus n'expose pas de route `content.generate`.** Il expose une route de mission unique, `POST /mission`, à laquelle on transmet les capacités requises :

```jsonc
{
  "operationId": "...",
  "title": "...",
  "objective": "...",
  "requiredCapabilities": ["content.generate"],
  "authorizedResources": ["mistral"],
  "prompt": "...",
  "context": { "id": "...", "label": "...", "metadata": {} }  // obligatoire
}
```

**2. `content.generate` n'est pas une capacité intrinsèque.** Les capacités intrinsèques d'Octopus sont uniquement `observation.receive`, `mission.plan`, `mission.route`, `execution.track`, `event.record`, `permission.check` et `resource.authorize`. Pour toute autre capacité, Octopus cherche un **adaptateur externe enregistré** via `POST /adapters/register`. S'il n'en trouve aucun, il répond **`202 waiting-executor`** : la mission est bien enregistrée, mais aucun texte n'est produit.

Ce cas est traité explicitement, pas subi. Avec `OCTOPUS_FALLBACK=local` (défaut), le service compose le prompt localement et poursuit la chaîne jusqu'au GLB ; la réponse porte alors `promptSource: "local-fallback"` et un champ `notice`. Avec `OCTOPUS_FALLBACK=error`, il renvoie `503 OCTOPUS_NO_EXECUTOR`.

> À noter : le registre d'adaptateurs d'Octopus est en mémoire (`new Map()`) dans un Worker. Un enregistrement ne survit donc pas au recyclage de l'isolat — à garder en tête quand la génération de texte réelle sera branchée.

---

## Structure du projet

```
src/
├── index.ts                    Application Hono, CORS, gestion d'erreurs (entrée du Worker)
├── env.ts                      Bindings d'environnement typés
├── types.ts                    Types du domaine, neutres vis-à-vis des fournisseurs
├── routes/
│   ├── health.ts               GET  /health — diagnostic de configuration
│   └── generate.ts             POST /v1/generate, GET /v1/jobs/:jobId[/model.glb]
├── adapters/
│   ├── octopus/client.ts       Client HTTP d'octopus-engine (+ mode mock)
│   └── mesh3d/
│       ├── index.ts            Factory : choisit le fournisseur selon MESH3D_PROVIDER
│       ├── meshy.ts            Adaptateur Meshy
│       ├── tripo.ts            Adaptateur Tripo3D
│       ├── mock.ts             Fournisseur factice
│       └── mockGlb.ts          Génère un vrai GLB binaire valide
├── lore/blacklace.ts           ⚠️ Seul fichier contenant du vocabulaire Blacklace
├── pipeline/generateAsset.ts   Orchestration des trois étapes
└── lib/                        errors, http (timeout + retry), jobId, validate
test/                           14 tests (vitest)
```

**Trois décisions de conception à connaître :**

| Décision | Pourquoi |
|---|---|
| **Ports & adapters** pour la 3D | `Mesh3DProvider` est une interface ; Meshy, Tripo3D et le mock l'implémentent. Changer de fournisseur = changer une variable d'environnement, aucun fichier métier ne bouge. |
| **jobId auto-porteur** | Le `jobId` encode `provider\|providerJobId` en base64url. L'état du job vit chez le fournisseur, pas chez nous : aucune base de données n'est nécessaire, et n'importe quelle instance du Worker peut reprendre un job. |
| **Réponse immédiate, pas d'attente bloquante** | Meshy et Tripo3D mettent plusieurs minutes. Attendre dans la requête dépasserait le budget d'un Worker. On rend un `jobId` (`202`), le client interroge l'état puis télécharge. |

---

## Lancer en local

Prérequis : Node.js 18+.

```bash
npm install
npm run dev          # http://localhost:8787
```

**Aucun secret n'est nécessaire pour démarrer** : Octopus et la génération 3D sont en mode `mock` par défaut, et le mock renvoie un vrai fichier GLB importable dans Unity.

Essai complet :

```bash
# 1. Lancer une génération
curl -X POST http://localhost:8787/v1/generate \
  -H 'Content-Type: application/json' \
  -d '{"intent":"le phare noyé de la crique nord","zone":"crique-nord","kind":"structure"}'

# 2. Suivre l'avancement (reprendre le jobId de la réponse)
curl http://localhost:8787/v1/jobs/<jobId>

# 3. Télécharger le GLB une fois `ready: true`
curl -o asset.glb http://localhost:8787/v1/jobs/<jobId>/model.glb
```

Autres commandes :

```bash
npm test         # 14 tests, aucun appel réseau
npm run typecheck
```

---

## Variables d'environnement

En local, copier `.dev.vars.example` vers `.dev.vars` (gitignoré). En production, utiliser `wrangler secret put`. **Aucune clé n'est écrite en dur dans le code.**

| Variable | Défaut | Rôle |
|---|---|---|
| `OCTOPUS_MODE` | `mock` | `mock` ou `live`. |
| `OCTOPUS_BASE_URL` | URL du Worker déployé | Requis si `live`. |
| `OCTOPUS_MISSION_PATH` | `/mission` | Route de mission. |
| `OCTOPUS_CAPABILITY` | `content.generate` | Capacité demandée. |
| `OCTOPUS_AUTHORIZED_RESOURCES` | `mistral` | Ressources autorisées, séparées par des virgules. |
| `OCTOPUS_FALLBACK` | `local` | `local` (repli) ou `error` (503) si aucun exécuteur. |
| `OCTOPUS_API_KEY` | — | Optionnel : Octopus n'exige pas d'auth aujourd'hui. |
| `MESH3D_PROVIDER` | `mock` | `mock`, `meshy` ou `tripo`. |
| `MESHY_API_KEY` / `TRIPO_API_KEY` | — | **Secrets.** Requis selon le fournisseur. |
| `MESHY_BASE_URL` / `TRIPO_BASE_URL` | API publiques | Surcharge utile pour tester. |
| `REQUEST_TIMEOUT_MS` | `20000` | Timeout des appels sortants. |

---

## API

### `POST /v1/generate`

```jsonc
// Requête — seul `intent` est obligatoire
{
  "intent": "le phare noyé de la crique nord",
  "zone": "crique-nord",
  "kind": "environment",   // environment | prop | structure | character
  "style": "...",          // optionnel, surcharge le style Blacklace
  "seed": 42               // optionnel
}
```

```jsonc
// Réponse 202
{
  "status": "accepted",
  "jobId": "bW9ja3wxNzg2...",
  "state": "queued",
  "provider": "mock",
  "prompt": "A single weathered structure...",
  "promptSource": "octopus",        // ou "local-fallback"
  "octopus": { "status": "completed", "summary": "..." },
  "links": { "status": "/v1/jobs/...", "model": "/v1/jobs/.../model.glb" }
}
```

### `GET /v1/jobs/:jobId`

Renvoie `state` (`queued` | `running` | `succeeded` | `failed`), `progress` et `ready`.

### `GET /v1/jobs/:jobId/model.glb`

Relaie le GLB en flux (`model/gltf-binary`). Renvoie `409 NOT_READY` tant que le job n'est pas terminé, `502 GENERATION_FAILED` s'il a échoué.

### `GET /health`

Configuration active. N'expose que des booléens pour les clés, jamais leur valeur.

Les erreurs suivent toutes la même forme : `{ "error": { "code": "...", "message": "...", "details": ... } }`.

---

## Changer de fournisseur 3D

```bash
# .dev.vars
MESH3D_PROVIDER=meshy
MESHY_API_KEY=...
```

Rien d'autre à modifier. Pour ajouter un fournisseur : créer `src/adapters/mesh3d/<nom>.ts` implémentant `Mesh3DProvider` (`createJob`, `getJob`, `fetchModel`), puis l'inscrire dans le `switch` de `src/adapters/mesh3d/index.ts`.

Les schémas de requête de Meshy et Tripo3D suivent leurs API publiques respectives ; ces intégrations n'ont pas pu être testées contre les vraies API faute de clés. Si un schéma a évolué, le correctif tient dans le seul fichier de l'adaptateur.

---

## Pousser vers un nouveau repo GitHub

Le projet est autonome : aucune configuration spécifique à un hébergeur, et `.gitignore` exclut `node_modules/`, `.dev.vars`, `.env` et les clés.

```bash
# 1. Créer un repo vide sur github.com (sans README ni .gitignore)

# 2. Depuis le dossier du projet
git init                     # si ce n'est pas déjà un dépôt git
git add .
git commit -m "feat: scaffolding blacklace-metaverse-adapter"
git branch -M main
git remote add origin git@github.com:<utilisateur>/blacklace-metaverse-adapter.git
git push -u origin main
```

Avant le premier push, vérifier qu'aucun secret ne part : `git status --short` ne doit jamais lister `.dev.vars`.

---

## Déployer sur Cloudflare

```bash
npx wrangler login
npx wrangler secret put MESHY_API_KEY     # et/ou TRIPO_API_KEY
npm run deploy
```

Les valeurs non secrètes sont dans `wrangler.toml`, section `[vars]`. Passer `OCTOPUS_MODE` à `live` pour appeler le vrai moteur.

---

## Suites possibles

- **Lore depuis Notion** — le point d'extension existe déjà : seule `loadLorePack()` dans `src/lore/blacklace.ts` est à réécrire, le reste du pipeline est écrit contre cette fonction.
- **Génération de texte réelle** — enregistrer auprès d'Octopus un adaptateur fournissant `content.generate`, pour supprimer le repli local.
- **Cache des assets** — un bucket R2 permettrait de servir un GLB déjà produit sans repasser par le fournisseur.
- **Ready Player Me / Spatial.io** — l'export GLB standard est déjà le format d'entrée attendu par ces plateformes.
