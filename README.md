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

The first scaffold uses mocks for the 3D provider. Meshy and Tripo can be added behind the same adapter boundary later.

## Local development

Requirements: Node.js 20+ and npm.

```bash
npm install
cp .dev.vars.example .dev.vars
npm run typecheck
npm run dev
```

Test the route:

```bash
curl -X POST http://localhost:8787/generate \
  -H 'content-type: application/json' \
  -d '{"intent":"Génère le décor d’une zone industrielle mystérieuse de Blacklace Island"}'
```

The default configuration uses `THREE_D_PROVIDER=mock`, so no 3D provider API key is required.

## Environment variables

- `OCTOPUS_ENGINE_URL` — Octopus Engine base URL.
- `OCTOPUS_ENGINE_API_KEY` — optional API key, if the deployed Octopus endpoint requires one.
- `THREE_D_PROVIDER` — currently `mock`; reserved values are `meshy` and `tripo`.
- `MESHY_API_KEY` — reserved for the Meshy adapter.
- `TRIPO_API_KEY` — reserved for the Tripo adapter.

Secrets belong in `.dev.vars` locally or Cloudflare Worker secrets in deployment. Never commit API keys.

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

## GitHub

To work locally from this repository:

```bash
git clone https://github.com/benoitlub/blacklace-metaverse.git
cd blacklace-metaverse
npm install
```

Then commit and push changes normally:

```bash
git add .
git commit -m "feat: ..."
git push origin main
```

The repository contains a minimal GitHub Actions workflow that runs TypeScript validation on pushes and pull requests.

## Architecture boundary

Blacklace-specific narrative logic belongs here or in future dedicated providers. Octopus Engine remains a neutral backend and must not import or depend on this service.

No database is used at this stage: request in, generated prompt, asset result out.
