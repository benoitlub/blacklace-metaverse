# Metaverse Creator

Cloudflare Workers service for creating, inspecting, customising, maintaining, and preparing 3D worlds and scenes.

The project is deliberately **universe-neutral**. Blacklace Island is the first intended use case, not a technical dependency. A scene can belong to Blacklace, another fictional universe, a client project, or no narrative universe at all.

## Role

Metaverse Creator is a stateless orchestration layer. It does not reimplement the external systems it consumes.

```text
Creative intent / existing scene
              |
              v
       Metaverse Creator
              |
     +--------+--------+----------------+
     |                 |                |
     v                 v                v
Context            Generation         Assets
Provider           Backend            Provider
     |                 |                |
     v                 v                v
 lore/context       rich prompt        GLB/assets
     |                 |                |
     +-----------------+----------------+
                       |
                       v
                  Scene Model
                       |
                 +-----+-----+
                 |           |
                 v           v
               Unity      Publication
                           Provider
```

External systems are integration boundaries, not application dependencies. Their URLs, credentials and connection modes are supplied through Worker bindings/environment variables. Provider-specific protocol code belongs behind an adapter and must not leak into HTTP routes or the core scene model.

## What it is intended to do

The service is designed to support a complete creative workflow:

- create a new scene from an intention;
- inspect an existing scene under construction;
- propose or apply customisation and improvements;
- generate or replace assets;
- preserve existing scene elements when requested;
- compare scene state and identify changes or inconsistencies;
- apply reversible scene changes through explicit operations;
- prepare a world for a target runtime or publication platform;
- keep narrative context optional rather than mandatory.

Unity can therefore be an editor and source of existing scenes, rather than merely a destination for generated assets.

## HTTP contract

### `POST /generate`

Request:

```json
{
  "intent": "Create a mysterious industrial zone"
}
```

The service validates the intention, obtains optional context from the configured context provider, sends the intention plus context to the configured generation backend, passes the resulting prompt to the selected asset provider, and returns an asset descriptor.

Example response in explicit mock mode:

```json
{
  "status": "mocked",
  "intent": "Create a mysterious industrial zone",
  "prompt": "Create a rich, coherent 3D environment prompt...",
  "loreSource": "mock",
  "provider": "mock",
  "asset": {
    "format": "glb",
    "provider": "mock",
    "url": "mock://generated/..."
  }
}
```

The mock URL is a test descriptor, not a real GLB file.

## Architecture principles

### Universe-neutral core

Blacklace Island must not be embedded into generic scene, asset, or provider interfaces.

A future request can be:

```json
{
  "intent": "Improve the lighting of this medieval village",
  "context": {
    "type": "none"
  }
}
```

or use a narrative context such as Blacklace Island without changing the orchestration layer.

### Provider-neutral external connections

The application talks in terms of capabilities and interfaces, not commercial vendors:

```text
ContextProvider
GenerationProvider
AssetProvider
SceneProvider
PublicationProvider
```

A concrete integration can be added behind one of these boundaries without changing the route contract.

For example, a lore source can be a knowledge platform today and another service tomorrow. The core application must not need to know which one.

### No silent fallback

Explicit mock mode is allowed for local development and tests. A failed external provider is an integration failure; the service must not silently switch to a different provider or pretend that a real asset was generated.

### Stateless first

There is no database at this stage. The intended progression is:

```text
request
  -> context
  -> generation
  -> asset
  -> scene operation/result
```

Persistent world state can be introduced later when the requirements justify it.

## Local development

Requirements: Node.js 20+ and npm.

```bash
npm install
cp .dev.vars.example .dev.vars
npm run typecheck
npm run dev
```

The example local configuration explicitly enables mock mode where applicable. It does not require external generation credentials.

Test the route:

```bash
curl -X POST http://localhost:8787/generate \
  -H 'content-type: application/json' \
  -d '{"intent":"Create a mysterious industrial zone"}'
```

### Unity during local development

A Unity Editor or running Unity application can call the local Worker directly:

```text
Unity
  |
  | HTTP
  v
http://localhost:8787
  |
  v
Metaverse Creator
```

This makes it possible to develop the Unity integration while the service runs locally with Wrangler. The same HTTP contract can later target the deployed Worker.

## Environment variables

### Context provider

- `LORE_PROVIDER` — logical adapter name; use `none` for no narrative context or `mock` for local development.
- `LORE_API_URL` — endpoint of the configured context provider when an external provider is selected.
- `LORE_API_KEY` — optional bearer credential.

The implementation must not assume that the provider is a particular vendor. Provider-specific protocol belongs behind `LoreProvider`.

### Generation backend

- `OCTOPUS_ENGINE_URL` — base URL of the configured generation backend.
- `OCTOPUS_ENGINE_GENERATE_PATH` — capability path; defaults to `/content.generate`.
- `OCTOPUS_ENGINE_API_KEY` — optional bearer credential.
- `OCTOPUS_ENGINE_MOCK` — set to `true` to bypass the external backend locally.

The current intended generation backend is the existing Octopus Engine Worker, but its implementation remains outside this repository.

### Asset provider

- `THREE_D_PROVIDER` — logical adapter name; use `mock` for local development.
- `THREE_D_API_URL` — endpoint of the configured external asset provider.
- `THREE_D_API_KEY` — optional bearer credential.

No commercial vendor name, URL, SDK, or API key is hardcoded into the generic service.

### Scene and publication providers

These boundaries are reserved for future Unity/scene and publication integrations. Their provider-specific configuration must follow the same rule: capability/interface in the core, connection details in bindings, protocol implementation in an adapter.

Never commit API keys. Use `.dev.vars` locally and Cloudflare Worker secrets for sensitive deployment values.

## Cloudflare Workers

The project is Hono + TypeScript and uses the Workers `fetch` runtime directly. It deliberately has no Express, Node TCP modules, PostgreSQL client, database, or Replit-specific configuration.

For deployment, configure external connection values and secrets with Wrangler. Do not enable mock mode in production unless explicitly intended and reviewed.

## GitHub

```bash
git clone https://github.com/benoitlub/metaverse-creator.git
cd metaverse-creator
npm install
npm run typecheck
```

GitHub Actions validates the TypeScript project on pushes to `main` and pull requests targeting `main`.

## Blacklace Island

Blacklace Island is the first major use case for this tool. Its narrative context, visual rules, entities, zones, assets and world-specific behaviour can be supplied through dedicated context/world integrations.

None of those concepts should become mandatory assumptions in the generic creator layer.

## Planned capabilities

- scene inspection from Unity;
- scene description/model synchronisation;
- reversible scene operations;
- asset generation and replacement;
- contextual visual improvements;
- world validation and consistency checks;
- narrative/lore synchronisation;
- Unity Editor tooling;
- publication/deployment integration;
- versioned world state and maintenance workflows.

These capabilities should be added behind stable interfaces rather than by coupling the core to a specific vendor or platform.
