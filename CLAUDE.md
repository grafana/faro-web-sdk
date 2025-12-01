# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Grafana Faro Web SDK is a highly configurable real user monitoring (RUM) library for instrumenting frontend JavaScript applications. It collects telemetry (logs, traces, metrics, errors, events) and forwards it to Grafana Alloy, Grafana Cloud, or custom receivers. The SDK is built on OpenTelemetry and integrates seamlessly with Grafana's observability stack (Loki, Tempo, Mimir).

## Repository Structure

This is a **Lerna monorepo** using Yarn workspaces with three main workspace categories:

- `packages/*` - Core published packages (stable)
- `experimental/*` - Experimental features (pre-release)
- `demo` - Full-stack demo application

### Core Packages

- **@grafana/faro-core** (`packages/core/`) - Core SDK architecture with no built-in instrumentations. Provides the API, extension system, and base classes for instrumentations, transports, and metas.

- **@grafana/faro-web-sdk** (`packages/web-sdk/`) - Web platform implementation with built-in instrumentations (console, errors, web vitals, session, view) and transports (console, fetch).

- **@grafana/faro-web-tracing** (`packages/web-tracing/`) - OpenTelemetry tracing integration for web applications.

- **@grafana/faro-react** (`packages/react/`) - React-specific integrations including Error Boundary, Component Profiler, and React Router (v4-v6) support with SSR capabilities.

- **@grafana/faro-react-native** (`packages/react-native/`) - React Native support (currently in development on feat/react-native-support branch).

### Experimental Packages

Located in `experimental/`:
- `instrumentation-replay` - Session replay functionality
- `instrumentation-otel-axios` - Axios instrumentation
- `instrumentation-otel-redux-saga` - Redux Saga instrumentation
- `instrumentation-websocket` - WebSocket instrumentation
- `transport-otlp-http` - OTLP HTTP transport

### Architecture Concepts

**Faro Instance**: Singleton or isolated instances created via `initializeFaro()`. Available globally (`window.faro` / `global.faro`) or via import.

**Instrumentations**: Self-contained modules that auto-collect data by hooking into APIs (e.g., console, errors). They extend `BaseInstrumentation` and implement `initialize()`.

**Metas**: Objects attached to every event (e.g., SDK version, browser info, page URL, user data).

**Transports**: Handle event delivery. Extend `BaseTransport` and implement `send()`. Support both single-item and batched sending.

**Batching**: Configurable event batching system groups signals by shared metas before transport.

**API Surface**: `faro.api.pushError()`, `faro.api.pushLog()`, `faro.api.pushEvent()`, `faro.api.pushMeasurement()`, `faro.api.pushTraces()`.

## Common Development Commands

### Installation and Setup
```bash
yarn install                    # Install all dependencies
yarn bootstrap                  # Bootstrap Lerna packages
```

### Building
```bash
yarn build                      # Build all packages
yarn build:compile:cjs          # Build CommonJS output (workspace-level)
yarn build:compile:esm          # Build ES modules output (workspace-level)
yarn build:compile:bundle       # Build IIFE bundles (workspace-level)
yarn watch                      # Watch mode for all packages
```

### Build Outputs
Each package generates three output formats:
- `dist/cjs/` - CommonJS (ES5 target)
- `dist/esm/` - ES Modules (ES6 target)
- `dist/bundle/*.iife.js` - IIFE bundles (minified)

### Testing
```bash
yarn quality:test               # Run all tests
yarn quality:test               # Run tests in specific package (from package dir)

# Run single test file
cd packages/core
yarn quality:test src/api/api.test.ts
```

### Linting and Formatting
```bash
yarn quality:lint               # Lint all packages
yarn quality:format             # Format all files with Prettier
yarn quality:circular-deps      # Check for circular dependencies with madge
yarn quality                    # Run all quality checks (tests, lint, e2e, circular deps)
```

### End-to-End Testing
```bash
yarn quality:e2e                # Run Cypress tests (headless)
yarn quality:e2e:dev            # Open Cypress in interactive mode
yarn quality:e2e:ci             # Install Cypress and run E2E (for CI)
```

### Demo Application
```bash
yarn start:demo                 # Start demo in dev mode (Vite)
yarn start:demo:prod            # Build and start demo in production mode

# With Docker (includes Grafana, Loki, Tempo, Mimir)
docker compose --profile demo up -d
```

Access demo at http://localhost:5173 and Grafana at http://localhost:3000

### Publishing
```bash
yarn publish                    # Lerna publish workflow (maintainers only)
```

### Cleaning
```bash
yarn clean                      # Clean all build artifacts
yarn clean:packages             # Clean package artifacts only
yarn clean:root                 # Clean root-level artifacts
```

## TypeScript Configuration

Uses project references for incremental builds:
- `tsconfig.base.json` - Base config
- `tsconfig.base.cjs.json` - CommonJS (ES5 target, verbatimModuleSyntax: false)
- `tsconfig.base.esm.json` - ES Modules (ES6 target)
- `tsconfig.spec.json` - Test configuration

Each package has:
- `tsconfig.json` - References to cjs, esm, and spec configs
- `tsconfig.cjs.json` - Extends base CJS config
- `tsconfig.esm.json` - Extends base ESM config
- `tsconfig.spec.json` - Test configuration
- `tsconfig.bundle.json` - Rollup bundle configuration (optional)

## Version Information

Currently on **v2.0.2** (v2.0.0-beta available). v2 is a major release with:
- Web Vitals v5 (removed FID metric)
- Cleaner tracing APIs (removed deprecated attributes)
- Simplified console instrumentation configuration
- Removed deprecated packages and legacy code

Install v2 pre-release: `yarn add @grafana/faro-web-sdk@^2.0.0-beta`

## Package Dependencies

Packages depend on each other in this order:
1. `@grafana/faro-core` (no internal deps)
2. `@grafana/faro-web-sdk` → depends on `faro-core`
3. `@grafana/faro-web-tracing` → depends on `faro-web-sdk`
4. `@grafana/faro-react` → depends on `faro-web-sdk`, optionally `faro-web-tracing`

External key dependencies:
- OpenTelemetry: `@opentelemetry/api`, `@opentelemetry/otlp-transformer`
- Web Vitals: `web-vitals@^5.0.3`
- React Router: peer dependency for `@grafana/faro-react`

## Code Organization Patterns

### Package Structure
```
packages/<package-name>/
├── src/
│   ├── index.ts              # Main entry point
│   ├── initialize.ts         # Package-level init function
│   ├── instrumentations/     # Instrumentation implementations
│   ├── metas/                # Meta providers
│   ├── transports/           # Transport implementations
│   └── utils/                # Shared utilities
├── dist/                     # Build output (gitignored)
├── tsconfig*.json            # TypeScript configs
├── jest.config.js            # Jest config
├── rollup.config.js          # Rollup config
└── README.md
```

### Core Package Structure
The `faro-core` package contains:
- `api/` - Public API methods (pushError, pushLog, pushEvent, pushMeasurement, pushTraces)
- `config/` - Configuration types and defaults
- `instrumentations/` - Base instrumentation classes
- `metas/` - Meta system (SDK meta provider)
- `transports/` - Base transport classes and batching logic
- `sdk/` - Core SDK implementation
- `globalObject/` - Global object handling (window/global)
- `internalLogger/` - Internal logging system
- `unpatchedConsole/` - Access to original console methods
- `utils/` - Utilities (deduplication, pattern matching, stacktrace parsing)

## Build System

### Rollup
Packages use Rollup to create IIFE bundles. Config is centralized in `rollup.config.base.js` with `getRollupConfigBase(moduleName)` helper. Each package's `rollup.config.js` simply calls `getRollupConfigBase('packageName')`.

### Jest
Test config is centralized in `jest.config.base.js`. Each package's `jest.config.js` extends the base config. Tests use `ts-jest` transformer with `jsdom` environment.

### Lerna
- Version: Independent versioning per package
- `lerna run <script>` - Run npm script across packages
- `lerna bootstrap` - Link local packages together
- `lerna publish` - Version and publish packages

## Working with Isolated Instances

When creating isolated Faro instances (e.g., for libraries or E2E tests), set `isolate: true` in config:

```typescript
const isolatedFaro = initializeFaro({
  isolate: true,
  // ...
});
```

**Limitations**: Some instrumentations still register globally (exceptions, console), instance not available on global object, must store reference manually.

## Session, User, and View Metadata

- **Session**: Automatic session tracking (session ID, start time)
- **User**: Optional user identification (`user.id`, `user.email`, `user.username`, etc.)
- **View**: Page/route identification (enforced `default` value in web-sdk)

Set via config or update at runtime:
```typescript
faro.api.setUser({ email: 'user@example.com', id: '123' });
faro.api.setView({ name: 'dashboard' });
```

## Hooks and Filtering

- **beforeSend**: Hook to modify or filter events before transport
- **ignoreErrors**: Regex patterns for errors to ignore
- **ignoreUrls**: Regex patterns for URLs to ignore

## Demo Application Architecture

The demo (`demo/`) showcases Faro's capabilities:
- **Frontend**: React + Redux Toolkit + React Router + Vite + SSR
- **Backend**: Express + PostgreSQL + Sequelize + OpenTelemetry
- **Infrastructure**: Docker Compose with Grafana, Loki, Tempo, Mimir

Demo demonstrates:
- Error tracking (handled/unhandled exceptions, React Error Boundaries)
- Event tracking (user actions, route changes)
- Log collection (console instrumentation)
- Web Vitals metrics
- Distributed tracing (frontend + backend correlation)
- Custom measurements
- User journey tracking with session IDs

## Important Notes

- **Node version support**: Faro supports all active LTS and current Node versions
- **Semantic versioning**: MAJOR.MINOR.PATCH (breaking.feature.fix)
- **Package manager**: Yarn 4.11.0 (see `packageManager` in root package.json)
- **Cache locations**: Build artifacts cached in `.cache/` (tsc, eslint, prettier)
- **Browser support**: Defined via `.browserslistrc` in each package
- **Unpatched console**: Always available via `faro.unpatchedConsole` for internal logging
- **Batching defaults**: enabled by default, 250ms interval, 50 item limit
- **React Native support**: Currently in development on `feat/react-native-support` branch

## Testing React Native Changes

When working on React Native support:
1. The `packages/react-native/` directory is the package being developed
2. Test with a React Native demo app (not yet in repo)
3. May need to use `yarn link` or local package references
4. Consider iOS and Android platform differences

## License

Apache-2.0
