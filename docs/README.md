# AudioBlocks Frontend Documentation Index

This directory contains technical documentation, architecture designs, runbooks, and guidelines for the AudioBlocks listener frontend application.

## Core Architecture & Guidelines

- **[ARCHITECTURE.md](ARCHITECTURE.md)**: Overall system architecture, design patterns, and application components.
- **[api.md](api.md)**: REST and streaming API interfaces used across the frontend.
- **[api-contract.md](api-contract.md)**: Backend API contracts and serialization specifications.
- **[api-spec.md](api-spec.md)**: Detailed API request/response specifications.
- **[ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md)**: Complete guide to required and optional frontend environment variables.
- **[RUNTIME_CONFIG.md](RUNTIME_CONFIG.md)**: Dynamic runtime configuration and environment resolution.

## Audio & Playback

- **[CROSSFADE.md](CROSSFADE.md)**: Dual-deck audio playback, HLS streaming, and crossfading design.
- **[PLAYBACK_EVENT_ANTI_ABUSE.md](PLAYBACK_EVENT_ANTI_ABUSE.md)**: Rules and throttling for listener streaming events.
- **[queued-transition-measurements.json](queued-transition-measurements.json)**: Benchmark data for track transitions.

## Data Fetching & Performance

- **[DATA_FETCHING.md](DATA_FETCHING.md)**: React Query conventions, caching strategies, and pagination patterns.
- **[ASSET_OPTIMIZATION.md](ASSET_OPTIMIZATION.md)**: Next.js image optimization and static asset delivery.
- **[ISR_REVALIDATION_STRATEGY.md](ISR_REVALIDATION_STRATEGY.md)**: Incremental Static Regeneration cache policies for music metadata.
- **[PERF_CAROUSEL_DECISION.md](PERF_CAROUSEL_DECISION.md)**: Architectural decision record on carousel rendering performance.
- **[SECTION_DATA_PATTERN.md](SECTION_DATA_PATTERN.md)**: Component data boundary and suspense patterns.

## Security & Authentication

- **[AUTH_SESSION_SECURITY.md](AUTH_SESSION_SECURITY.md)**: Authentication token handling and session storage safeguards.
- **[SECRET_BOUNDARIES.md](SECRET_BOUNDARIES.md)**: Security boundaries for public vs private API keys.
- **[EMBED_SECURITY.md](EMBED_SECURITY.md)**: Content Security Policy and iframe sandbox controls for embedded players.
- **[PRIVY_SETUP.md](PRIVY_SETUP.md)**: Web3 and social login configuration with Privy.
- **[CHAIN_SAFETY.md](CHAIN_SAFETY.md)**: Stellar and Soroban network transaction validation rules.
- **[STELLAR_TRANSACTION_FLOW.md](STELLAR_TRANSACTION_FLOW.md)**: Step-by-step transaction building and submission flows.
- **[SECURITY_INCIDENT_RUNBOOK.md](SECURITY_INCIDENT_RUNBOOK.md)**: Incident response and mitigation runbook.
- **[INDEPENDENT_PENETRATION_TEST.md](INDEPENDENT_PENETRATION_TEST.md)**: Penetration test report and remediations.

## Operations & Monitoring

- **[DEPLOYMENT.md](DEPLOYMENT.md)**: Deployment pipeline and release process.
- **[PRODUCTION_RUNBOOK.md](PRODUCTION_RUNBOOK.md)**: On-call incident response and operational troubleshooting.
- **[ROLLBACK.md](ROLLBACK.md)**: Safe application rollback procedures.
- **[ROLLBACK_DRILL_LOG.md](ROLLBACK_DRILL_LOG.md)**: Runbook drill history and disaster recovery logs.
- **[SENTRY_SETUP.md](SENTRY_SETUP.md)**: Error tracking, breadcrumbs, and alert configurations in Sentry.
- **[SYNTHETIC_MONITORING.md](SYNTHETIC_MONITORING.md)**: Synthetic uptime check configuration.
- **[SERVICE_WORKER.md](SERVICE_WORKER.md)**: Offline cache and service worker lifecycle management.

## Testing & Quality

- **[ERROR_BOUNDARIES.md](ERROR_BOUNDARIES.md)**: Component-level and route-level error boundaries.
- **[LAUNCH_TESTING.md](LAUNCH_TESTING.md)**: Smoke testing checklist before major releases.
- **[SOAK_TESTING.md](SOAK_TESTING.md)**: Long-running memory leak and performance soak tests.
- **[STORYBOOK.md](STORYBOOK.md)**: Component visual regression tests and Storybook setup.

## Archived Documentation

- **[archive/](archive/)**: Contains archived documentation for the AI quality pipeline (Mastra + NVIDIA NIM) which has moved to a dedicated backend service.
