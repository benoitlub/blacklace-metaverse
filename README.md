# Blacklace Metaverse Adapter

Cloudflare Workers service that bridges Blacklace Island creative intent, Octopus Engine, and a replaceable 3D generation provider.

## Role

This service is intentionally stateless and does not reimplement Octopus Engine.

```text
Creative intent
      |
      v
blacklace-metaverse
      |
      +--> Octopus Engine / content.generate
      |          |
      |          v
      |      rich 3D prompt
      |
      +--> 3D provider adapter
                 |
                 v
                GLB
```

The 3D provider boundary is deliberately replaceable. The current implementation provides a deterministic mock provider; Meshy and Tripo can be added without changing the HTTP route contract.

## HTTP contract

### `POST /generate`

Request:

```json
{
  "intent": "Génère le décor d’une zone industrielle mystérieuse de Blacklace Island"
}
```

The service validates the intention, sends it to the configured Octopus generation endpoint, passes the resulting prompt to the selected 3D provider, and returns the generated asset descriptor.

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

The mock URL is a test descriptor, not a real GLB file. A real provider adapter will return the provider's downloadable GLB URL or equivalent asset location.

## Local development

Requirements: Node.js 20+ and npm.

```bash
npm install
cp .dev.vars.example .dev.vars
npm run typecheck
npm run dev
```

The example local configuration sets `OCTOPUS_ENGINE_MOCK=true` and `THREE_D_PROVIDER=mock`, so local development does not call external generation services and does not require API keys.

Test the route:

```bash
curl -X POST http://localhost:8787/generate \
  -H 'content-type: application/json' \
  -d '{"intent":"Génère le décor d’une zone industrielle mystérieuse de Blacklace Island"}'
```

## Environment variables

- `OCTOPUS_ENGINE_URL` — Octopus Engine base URL.
- `OCTOPUS_ENGINE_GENERATE_PATH` — generation path; defaults to `/content.generate`.
- `OCTOPUS_ENGINE_API_KEY` — optional bearer token when the deployed Octopus endpoint requires authentication.
- `OCTOPUS_ENGINE_MOCK` — set to `true` to bypass the external Octopus call locally.
- `THREE_D_PROVIDER` — currently `mock`; `meshy` and `tripo` are reserved for real implementations.
- `MESHY_API_KEY` — reserved for the Meshy adapter.
- `TRIPO_API_KEY` — reserved for the Tripo adapter.

Never commit API keys. Use `.dev.vars` locally and Cloudflare Worker secrets for sensitive deployment values.

## Cloudflare Workers

The project is Hono + TypeScript and uses the Workers `fetch` runtime directly. It deliberately has no Express, Node TCP modules, PostgreSQL client, or Replit-specific configuration.

For deployment:

```bash
npx wrangler login
npx wrangler secret put OCTOPUS_ENGINE_API_KEY
npx wrangler secret put MESHY_API_KEY
npx wrangler secret put TRIPO_API_KEY
npm run deploy
```

`OCTOPUS_ENGINE_MOCK=false` is configured in `wrangler.toml`, because the deployed service is intended to consume the real Octopus backend.

## GitHub

```bash
git clone https://github.com/benoitlub/blacklace-metaverse.git
cd blacklace-metaverse
npm install
npm run typecheck
```

GitHub Actions runs TypeScript validation on pushes to `main` and pull requests targeting `main`.

## Architecture boundary

Blacklace-specific narrative logic belongs here or in future dedicated providers. Octopus Engine remains a neutral backend and must not import or depend on this service.

No database is used at this stage: request in, generated prompt, asset result out.

## Next implementation step

The next bounded step is a real 3D provider adapter. It should implement only the existing `ThreeDProvider` interface and handle the provider-specific asynchronous task lifecycle, polling, and GLB result URL. It must not alter Octopus Engine or introduce a database into this service.
