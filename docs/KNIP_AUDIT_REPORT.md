# Dependency & Unused Code Audit Report: Knip (`PERF-08` / #833)

## Overview
Automated dependency analysis configured via `knip.json` to prevent bloat and identify unused exports, types, and dependencies before production launch.

## Configuration & Scripts
- Configuration file: `knip.json`
- Target entries: Next.js App Router entrypoints (`app/**/{page,layout,loading,error}.tsx`) and API routes.
- Ignore patterns: Test files, mocks, storybook definitions, and framework plugins.

## Recommendations
- Run `npx knip` periodically in CI pipeline (`.github/workflows/ci.yml`) to alert on abandoned packages and dead code paths.
