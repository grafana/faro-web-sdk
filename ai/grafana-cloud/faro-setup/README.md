# faro-setup

A Claude Code / Cursor skill that instruments any web app with [Grafana Faro Web SDK](https://github.com/grafana/faro-web-sdk) — picking up exactly where the Frontend Observability wizard leaves off.

---

## Why

Getting Faro running correctly requires knowing the right packages, init patterns, and entry point wiring for your specific framework — and it's easy to get wrong. This skill handles the full setup end-to-end: it detects your framework, generates the correct code, wires it into your project, and either opens a PR for you or hands off the commands so you can do it yourself.

---

## What you get

- JavaScript errors, unhandled rejections, and console warnings flowing to Grafana Cloud
- Core Web Vitals (LCP, INP, CLS) tracked automatically
- Distributed tracing for API calls
- Browser noise filtered out of the box — ResizeObserver quirks, extension errors, and detected analytics/tracking services (Segment, Hotjar, Datadog, etc.)
- A ready-to-merge PR (or the exact commands to open one yourself)

Optional enhancements the skill can add:

- Route / navigation tracking
- User identity tagging (tie errors and sessions to logged-in users)
- React Error Boundary
- Cookie consent gate (GDPR/PECR compliance)
- Cross-origin trace propagation
- Microfrontend coordination
- Session configuration

---

## Supported frameworks

React, Next.js (App Router and Pages Router), Angular, Vue, Svelte, Vanilla JS, Plain HTML (CDN).

---

## Requirements

- A [Grafana Cloud](https://grafana.com/auth/sign-up/create-user) account with a Frontend Observability app created — you'll need the collector URL from the wizard
- **Claude Code** ≥ 1.x with plugin support, or **Cursor** with plugin support
- **`gh` CLI** authenticated (`gh auth login`) — only needed if you want the skill to open the PR for you

---

## Install

### Claude Code

Run these two commands once, from any directory:

```bash
claude plugin marketplace add grafana/app-o11y-kwl
claude plugin install faro-setup@app-o11y-kwl
```

### Cursor

Add the plugin path to your Cursor settings. The `.cursor-plugin/plugin.json` manifest in this repo is picked up automatically once registered.

---

## Usage

Open a terminal in your frontend project root, then run:

```
/faro-setup
```

The skill will ask for your collector URL (paste the snippet from **Grafana Cloud → Observability → Frontend → Create new**) and handle everything else from there.

---

## Local development

To test changes without reinstalling:

```bash
# Point Claude at your local checkout
claude plugin marketplace add /path/to/app-o11y-kwl

# Changes to SKILL.md take effect immediately — no reinstall needed
```

To validate manifests:

```bash
claude plugin validate ai/plugins/faro-setup
```
