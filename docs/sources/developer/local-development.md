# Local development

Three supported paths for working on the Faro Web SDK locally.

## 1. Smoke harness (no external services)

The smoke harness is a minimal Vite + React app at `e2e/smoke/` that exercises the SDK against an
intercepted `/collect` endpoint via Cypress. Use this for fast SDK-behavior testing during
development — no Docker, no network, no accounts.

```bash
yarn install
yarn build
yarn workspace @grafana/faro-smoke-harness run start    # vite dev server on :5174
# in another shell:
yarn workspace @grafana/faro-smoke-harness run e2e      # cypress run
```

Add specs under `e2e/smoke/cypress/e2e/`. The harness React app lives at `e2e/smoke/src/main.tsx`.

## 2. Your own Grafana Cloud stack (recommended for end-to-end)

For testing against a real Faro receiver with full data flow into Grafana:

1. Sign up for a free [Grafana Cloud](https://grafana.com/) account.
2. Create a Frontend Observability app in your stack — the UI provides the collector URL and API key.
3. Configure your local SDK to point at that endpoint. See
   [the quick-start tutorial](../tutorials/quick-start-browser.md) for the `initializeFaro` call shape.
4. View your data in your Grafana Cloud instance — logs in Loki, traces in Tempo, metrics in Mimir.

This is the canonical path for external contributors. CORS for your local origin
(`http://localhost:5173` etc.) is configured through your own app's settings — no coordination
needed.

## 3. Local Grafana Alloy

If you prefer to keep everything off the network, install
[Grafana Alloy](https://grafana.com/docs/alloy/latest/get-started/) and run it with a
[`faro.receiver`](https://grafana.com/docs/alloy/latest/reference/components/faro/faro.receiver/)
block. Forward to whatever backend you prefer (your Grafana Cloud stack, local Loki/Tempo, or stdout
for inspection).

This repo intentionally does **not** ship a Docker-based local stack: those configurations drift
silently with upstream version bumps and inflate the SDK's contributor surface. Run your own
infrastructure with the tools you already use.
