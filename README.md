# Blacklace Metaverse Adapter

Cloudflare Workers service that bridges creative intent, a configured narrative-generation backend, and a replaceable 3D asset provider.

## Role

This service is intentionally stateless and does not reimplement the external generation backend it consumes.

```text
Creative intent
      |
      v
blacklace-metaverse
      |
      +--> configured generation backend
      |          |
      |          v
      |      rich 3D prompt
      |
      +--> replaceable 3D provider adapter
                 |
                 v
                GLB
```

External systems are integration boundaries, not application dependencies. Their URLs, credentials and connection modes are supplied through Worker bindings/environment variables. Provider-specific protocol code must live behind an adapter and must not leak into the HTTP route.

## HTTP contract

### `POST /generate`

Request:

```json
{
  "intent": "Génère le décor d’une zone industrielle mystérieuse de Blacklace Island"
}
```

The service validates the intention, sends it to the configured generation endpoint, passes the resulting prompt to the selected 3D provider adapter, and returns the generated asset descriptor.

Example response in mock mode:

```json
{
  "status": "mocked",
  "intent": "Génère le décor d’une zone industrielle mystérieuse de Blacklace Island",
  "prompt": "Create a rich, coherent 3D environment prompt...",
  "provider": "mock",
  "asset": {
    "format": "glb",
    "provider": "mock",
    "url": "mock://generated/..."
  }
}
```

The mock URL is a test descriptor, not a real GLB file.

## Local development

Requirements: Node.js 20+ and npm.

```bash
npm install
cp .dev.vars.example .dev.vars
npm run typecheck
npm run dev
```

The example local configuration explicitly enables mock mode. It therefore does not call external generation services and does not require API keys.

Test the route:

```bash
curl -X POST http://localhost:8787/generate \
  -H 'content-type: application/json' \
  -d '{"intent":"Génère le décor d’une zone industrielle mystérieuse de Blacklace Island"}'
```

## Environment variables

### Generation backend

- `OCTOPUS_ENGINE_URL` — base URL of the configured generation backend.
- `OCTOPUS_ENGINE_GENERATE_PATH` — capability path; defaults to `/content.generate`.
- `OCTOPUS_ENGINE_API_KEY` — optional bearer credential.
- `OCTOPUS_ENGINE_MOCK` — set to `true` to bypass the external backend locally.

The current deployment target is the existing Octopus Engine Worker, but its implementation remains outside this repository.

### 3D asset provider

- `THREE_D_PROVIDER` — logical adapter name; use `mock` for local development.
- `THREE_D_API_URL` — endpoint of the configured external 3D provider.
- `THREE_D_API_KEY` — optional bearer credential.

No vendor name, vendor URL, or vendor API key is hardcoded in the service. A provider with a different HTTP protocol must be implemented as a dedicated adapter behind `ThreeDProvider`; changing providers must not require changing the route contract.

Never commit API keys. Use `.dev.vars` locally and Cloudflare Worker secrets for sensitive deployment values.

## Cloudflare Workers

The project is Hono + TypeScript and uses the Workers `fetch` runtime directly. It deliberately has no Express, Node TCP modules, PostgreSQL client, database, or Replit-specific configuration.

For deployment, configure the external connection values and secrets with Wrangler, for example:

```bash
npx wrangler login
npx wrangler secret put OCTOPUS_ENGINE_API_KEY
npx wrangler secret put THREE_D_API_KEY
npm run deploy
```

Do not enable mock mode in a production deployment unless that behavior is explicitly intended and reviewed.

## GitHub

```bash
git clone https://github.com/benoitlub/blacklace-metaverse.git
cd blacklace-metaverse
npm install
npm run typecheck
```

GitHub Actions runs TypeScript validation on pushes to `main` and pull requests targeting `main`.

## Architecture boundary

Blacklace-specific narrative logic belongs in this service or in dedicated lore providers introduced later. External systems remain replaceable integration boundaries. The generation backend must not import or depend on this service.

No database is used at this stage: request in, generated prompt, asset result out.

## Provider policy

1. Routes depend on internal interfaces, never vendor SDKs.
2. External URLs and credentials come from environment/bindings.
3. Provider-specific request/response schemas stay inside their adapter.
4. A provider failure is an integration failure; it must not silently fall back to another provider.
5. Mock mode must be explicit.
6. Adding or replacing an external provider must not require modifying the HTTP contract.

## Next implementation step

The next bounded step is a provider-specific 3D adapter. It should implement only the existing `ThreeDProvider` interface and handle that provider's asynchronous task lifecycle, polling, and GLB result URL. It must not alter the generation backend or introduce a database into this service.
