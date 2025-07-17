# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **Grafana Faro Web SDK** - a monorepo containing multiple packages for JavaScript frontend telemetry collection. Faro instruments web applications to collect logs, errors, traces, and metrics, forwarding them to Grafana Alloy, Grafana Cloud, or custom receivers.

## Development Commands

### Root Level Commands (use these from project root)
- `yarn build` - Build all packages using Lerna
- `yarn quality` - Run all quality checks (tests, linting, circular deps, e2e)
- `yarn quality:test` - Run tests across all packages
- `yarn quality:lint` - Run linting across all packages
- `yarn quality:format` - Format code across all packages
- `yarn quality:e2e` - Run Cypress end-to-end tests
- `yarn quality:circular-deps` - Check for circular dependencies
- `yarn clean` - Clean all build artifacts
- `yarn start:demo` - Start the demo application in development mode
- `yarn start:demo:prod` - Start the demo application in production mode

### Package Level Commands
Navigate to individual package directories (`packages/core`, `packages/web-sdk`, etc.) and run:
- `yarn test` - Run Jest tests for the specific package
- `yarn build` - Build the specific package
- `yarn quality:lint` - Lint the specific package

### Testing
- **Unit Tests**: Jest with `jsdom` environment
- **E2E Tests**: Cypress (`cypress open` for dev mode)
- **Test Single Package**: `cd packages/[package-name] && yarn test`

## Architecture

### Core Packages
- **`@grafana/faro-core`** (`packages/core/`) - Core SDK functionality, provides the main API and architecture
- **`@grafana/faro-web-sdk`** (`packages/web-sdk/`) - Web-specific instrumentations, metas, and transports
- **`@grafana/faro-web-tracing`** (`packages/web-tracing/`) - OpenTelemetry tracing implementation
- **`@grafana/faro-react`** (`packages/react/`) - React-specific components and hooks

### Key Architecture Components
- **Instrumentations**: Auto-collect telemetry data (errors, console logs, performance metrics)
- **Transports**: Send collected data to backends (fetch, console)
- **Metas**: Contextual metadata attached to all events (browser info, page details)
- **API**: Methods for manually pushing logs, errors, events, measurements, and traces

### Monorepo Structure
- **Lerna**: Manages multiple packages with shared dependencies
- **Yarn Workspaces**: Handles package dependencies and linking
- **TypeScript**: Multiple tsconfig files for different build targets (esm, cjs, bundle, spec)
- **Rollup**: Builds browser bundles for each package

### Build System
- **Multiple Output Formats**: ESM, CJS, and IIFE bundles
- **TypeScript Configs**: 
  - `tsconfig.json` - Main TypeScript configuration
  - `tsconfig.esm.json` - ESM build
  - `tsconfig.cjs.json` - CommonJS build
  - `tsconfig.bundle.json` - Browser bundle
  - `tsconfig.spec.json` - Test files

## Demo Application

The `demo/` directory contains a full-stack React application demonstrating Faro integration:
- **Frontend**: React with Redux, React Router, and Bootstrap
- **Backend**: Express.js with PostgreSQL
- **Telemetry**: Comprehensive Faro instrumentation including OpenTelemetry tracing
- **Development**: `yarn start:demo` (uses Vite and nodemon)
- **Production**: `yarn start:demo:prod`

## Key Files for Understanding the SDK

### Core SDK Files
- `packages/core/src/index.ts` - Main SDK entry point
- `packages/core/src/api/` - Core API implementations
- `packages/web-sdk/src/index.ts` - Web SDK entry point
- `packages/web-sdk/src/instrumentations/` - Web instrumentations

### Configuration
- `lerna.json` - Lerna monorepo configuration
- `rollup.config.base.js` - Shared Rollup configuration
- `jest.config.base.js` - Shared Jest configuration

## Development Notes

- **Code Style**: Uses ESLint with Prettier formatting
- **Testing**: Jest with jsdom for web environment simulation
- **Versioning**: Semantic versioning managed by Lerna
- **Dependencies**: Avoid external dependencies in core packages to minimize bundle size
- **Browser Compatibility**: Targets modern browsers with polyfills where needed