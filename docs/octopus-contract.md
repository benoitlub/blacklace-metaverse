# Contrat réel d'Octopus Engine

À lire **avant** de passer le backend de génération en mode live. Le contrat relevé ici vient du code déployé (`benoitlub/octopus-engine-app`, `src/app.ts`, commit du 2026-08-11), pas d'une supposition.

---

## 1. Il n'y a pas de route `/content.generate`

Octopus expose une **route de mission unique**. Une capacité n'est pas un chemin d'URL, c'est un élément de la charge utile.

```http
POST /mission
Content-Type: application/json
```

```jsonc
{
  "operationId": "mvc_1786468064911_xtty4f",
  "title": "Rotas — place du marché",
  "objective": "Transformer une intention créative en prompt text-to-3D.",
  "requiredCapabilities": ["content.generate"],
  "authorizedResources": ["mistral"],
  "prompt": "<intention + contexte>",
  "context": {
    "id": "mvc_1786468064911_xtty4f",   // OBLIGATOIRE
    "label": "metaverse-creator",
    "objective": "…",
    "metadata": { "source": "metaverse-creator" }
  }
}
```

`context.id` est obligatoire : sans lui, Octopus répond `400 CONTEXT_REQUIRED`. `requiredCapabilities` doit être non vide, sinon `400 CAPABILITY_REQUIRED`.

Réponse :

```jsonc
{
  "status": "completed",       // ou waiting-executor | waiting-authorization | failed | rejected
  "operationId": "…",
  "missionId": "…",
  "contextId": "…",
  "summary": "…",
  "output": { },
  "lifecycle": { }
}
```

Les autres routes du moteur : `GET /health`, `GET /events`, `GET /missions/:id`, `GET /adapters`, `POST /adapters/register`, `POST /adapters/unregister`, `GET /brief`, `GET /resources`.

---

## 2. `content.generate` n'est pas une capacité intrinsèque

C'est le point qui change le plus les choses.

Les capacités qu'Octopus exécute lui-même sont **uniquement** :

```
observation.receive   mission.plan       mission.route
execution.track       event.record       permission.check
resource.authorize
```

Pour toute autre capacité — dont `content.generate` — Octopus cherche un **adaptateur externe enregistré** qui la déclare. S'il n'en trouve aucun :

```http
HTTP/1.1 202 Accepted
```
```json
{
  "status": "waiting-executor",
  "summary": "Mission recorded and waiting for a compatible executor.",
  "output": { "requiredCapabilities": ["content.generate"] }
}
```

La mission est enregistrée, mais **aucun texte n'est produit**. Ce n'est pas une panne : c'est un état documenté du moteur.

### Comment le traiter

Conformément au principe *No silent fallback* de ce dépôt et à la loi 4 de la Constitution Blacklace, un `waiting-executor` doit **remonter comme une erreur explicite** (code dédié, message actionnable). Le service ne compose pas un prompt de remplacement en silence : il dit que le moteur n'a pas d'exécuteur.

### Comment le résoudre

Enregistrer un adaptateur qui fournit la capacité :

```http
POST /adapters/register
```
```jsonc
{
  "id": "text-generator",
  "name": "…",
  "capabilities": ["content.generate"],
  "executeUrl": "https://…",       // HTTP(S) obligatoire
  "healthUrl": "https://…"
}
```

Octopus appelle ensuite cet `executeUrl` avec l'enveloppe `octopus-adapter-execution-v1` :

```jsonc
{
  "contract": "octopus-adapter-execution-v1",
  "adapterId": "text-generator",
  "mission": { "operationId": "…", "title": "…", "objective": "…",
               "requiredCapabilities": [], "authorizedResources": [],
               "prompt": "…", "context": { } }
}
```

Et attend en retour `{ status, summary, output, artifacts? }`, où `status` vaut `completed`, `waiting-authorization`, `failed` ou `needs-input`.

> **Attention — le registre est volatil.** `AdapterRegistry` stocke les enregistrements dans une `Map` en mémoire, dans un Worker Cloudflare. Un enregistrement **ne survit pas au recyclage de l'isolat**. Il faut donc soit ré-enregistrer périodiquement, soit accepter que la capacité disparaisse sans prévenir. À traiter comme une contrainte de conception, pas comme un détail d'exploitation.

---

## 3. Forme de la sortie

Octopus laisse à l'adaptateur exécuteur la forme exacte de `output`. Le client doit donc être tolérant plutôt qu'exiger un champ unique. Conventions à accepter, dans cet ordre :

```
output.text · output.content · output.prompt · output.result · output.generatedText
output.result.{text,content,prompt}
artifacts[].content  (chaîne, ou objet { text | prompt })
```

Si rien n'est exploitable, c'est une erreur d'intégration — pas un prompt vide qu'on laisse passer.

---

## 4. Ce qui ne doit jamais remonter dans Octopus

Le moteur est neutre, et sa propre Constitution l'y oblige : aucun vocabulaire Blacklace, aucune notion de génération 3D. Ce qu'on lui envoie est un `prompt` et un `objective` génériques. Le lore est injecté **avant** l'appel, par le `ContextProvider` de ce dépôt.

La dépendance est à sens unique : Metaverse Creator consomme Octopus, jamais l'inverse.
