# Contributing to AudioBlocks

Thanks for your interest in contributing! This document covers everything you
need to get set up and submit a change.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style Guidelines](#code-style-guidelines)
- [Testing](#testing)
- [Mocking the API (MSW)](#mocking-the-api-msw)
- [Feature flags](#feature-flags)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Reporting Issues](#reporting-issues)

## Prerequisites

Before setting up the project locally, ensure you have the following installed:

- **Node.js** — version 20 or later (see `.nvmrc`)
- **npm** — comes with Node.js (or use `pnpm` / `yarn` as an alternative)
- **A wallet extension** — [MetaMask](https://metamask.io/download/) or any EVM-compatible browser wallet (required for authentication via Dynamic Labs)
- **Git** — for cloning the repository

Optional but recommended:

- **The AudioBlock Backend** — running locally for full-featured development
  (clone from [`AudioBlock_Backend`](https://github.com/AudioBitsStellar/AudioBlock_Backend))

## Getting Started

1. **Fork** the repository and clone your fork:

   ```bash
   git clone https://github.com/<your-username>/AudioBlocks_Frontend_v1.git
   cd AudioBlocks_Frontend_v1
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Set up environment variables**:

   ```bash
   cp .env.example .env.local
   ```

   If `.env.example` isn't present yet, create `.env.local` manually with at
   least:

   ```bash
   echo "NEXT_PUBLIC_API_URL=http://localhost:4000/api" > .env.local
   ```

4. **(Optional) Run the backend** — clone and start
   [`AudioBlock_Backend`](https://github.com/AudioBitsStellar/AudioBlock_Backend)
   to enable authentication and streaming. Without it, the app renders static
   demo data, or you can mock the API — see
   [Mocking the API (MSW)](#mocking-the-api-msw).

5. **Start the development server**:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Development Workflow

1. Create a feature branch from `main`:

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes, keeping scope focused. Follow the existing code
   conventions (see [Code Style Guidelines](#code-style-guidelines) below).

3. Run linting and formatting before committing:

   ```bash
   npm run lint
   npm run format
   ```

   A pre-commit hook (via Husky + lint-staged) also runs `lint-staged` and
   `tsc --noEmit` automatically — fix any errors it reports before your
   commit will go through.

4. Run the test suite (see [Testing](#testing)).

## Code Style Guidelines

- **TypeScript**: Strict mode enabled — avoid `any` and `@ts-ignore` where possible
- **Components**: Prefer function components with hooks; use `memo` for render-heavy components
- **Imports**: Group third-party imports first, then local imports (the project does not enforce this automatically yet)
- **CSS**: Use Tailwind utility classes; avoid custom CSS unless necessary
- **Accessibility**: All interactive elements must have ARIA labels and keyboard support — new components should pass jsx-a11y lint rules
- **State management**: Use React context for global state (`PlaybackContext`), local state for component-specific state

## Testing

```bash
npm test              # format check + unit/component tests (Vitest)
npm run test:watch    # unit tests in watch mode
npm run test:coverage # unit tests with coverage report
npm run test:e2e      # end-to-end tests (Playwright)
npm run test:e2e:ui   # Playwright in UI mode
```

Add or update tests for any behavior you change. UI changes touching
interactive components should also be checked against the accessibility
guidelines above.

## Mocking the API (MSW)

[Mock Service Worker](https://mswjs.io/) answers API requests with fixtures
shaped like the
[`AudioBlock_Backend`](https://github.com/AudioBitsStellar/AudioBlock_Backend)
responses, so you can develop and test without a running backend. One set of
handlers is shared by the browser, Vitest and Playwright:

```text
mocks/
  fixtures/   response data, typed to the backend entities / app services
  handlers/   one file per resource; index.ts exports `handlers`
  browser.ts  setupWorker — local development
  server.ts   setupServer — Vitest
```

**Local development.** Add to `.env.local` and restart `npm run dev`:

```bash
NEXT_PUBLIC_API_MOCKING=enabled
```

`MswProvider` starts the worker (`public/mockServiceWorker.js`) before the app
renders. Requests without a handler go to the network unchanged. The app's own
`/sw.js` is not registered while mocking is on, because only one service worker
can control a page. The worker script is regenerated on `npm install` (the
`msw.workerDirectory` field in `package.json`); do not edit it by hand.

**Vitest.** `vitest.setup.ts` starts the server for every test file, so code
that calls `apiClient` gets the fixtures with no `vi.mock`. Override a route
inside a test with `server.use()`; overrides are reset after each test:

```ts
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';

server.use(http.get('*/api/song', () => new HttpResponse(null, { status: 404 })));
```

**Playwright.** Import `test` and `expect` from `tests/e2e/fixtures/network.ts`
instead of `@playwright/test`. Requests to `/api/**` are then answered by the
same handlers through route interception (see
`tests/e2e/community-leaderboard.spec.ts`).

**Adding an endpoint.** Put the response data in `mocks/fixtures/`, matching the
backend's controller output (envelope, pagination and error shape — see
`mocks/handlers/response.ts`), add the handler under `mocks/handlers/`, and
register it in `mocks/handlers/index.ts`. Use a leading `*` in paths
(`'*/api/song'`) so they match whatever `NEXT_PUBLIC_API_URL` is.

## Feature flags

Sections whose backend endpoints are not live yet are gated by flags in
`lib/featureFlags.ts`. A flag is **on** in development and test and **off** in
production unless its `NEXT_PUBLIC_FEATURE_*` variable says otherwise. The
current flags, their defaults and the endpoints they wait on are listed in
[`docs/ENVIRONMENT_VARIABLES.md`](docs/ENVIRONMENT_VARIABLES.md#feature-flags).

`.env.example` keeps the flag variables commented out on purpose: copying it to
`.env.local` should leave the environment defaults in place. If Merch, Events
or Community voting are missing locally, check that `.env.local` does not set
the matching variable to `false`.

To add a flag:

1. Add its name to `FeatureFlagName` in `lib/featureFlags.ts`.
2. Add an entry to `FEATURE_FLAGS` with the `envVar`, a description and the
   endpoints it waits on.
3. Add a `case` to `readFlagValue` that reads the variable through a **literal**
   `process.env.NEXT_PUBLIC_...` access. Next.js only inlines literal accesses
   into the client bundle, so `process.env[name]` will not work in the browser.
4. Document it in `.env.example` (commented out) and in the table in
   `docs/ENVIRONMENT_VARIABLES.md`.
5. Gate the UI with `isFeatureEnabled('yourFlag')`.

`tests/lib/featureFlags.test.ts` fails if a flag is registered in
`FEATURE_FLAGS` without a matching `case` in `readFlagValue`.

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add profile page layout
fix: correct seek-bar time display
a11y: add aria-labels to player controls
chore: update dependencies
docs: update setup instructions
```

This is enforced: a Husky `commit-msg` hook runs [commitlint](https://commitlint.js.org/) against `commitlint.config.mjs` on every
commit, and `.github/workflows/commitlint.yml` re-checks every commit on a
pull request. Allowed types are the Conventional Commits set plus `a11y`
and `security`.

## Pull Request Process

Open a pull request against `main` with a clear description that includes:

- What the change does
- Why it's needed
- Screenshots or a screen recording (for UI changes)
- Any manual testing performed

Keep PRs focused on a single concern where possible — it makes review faster
and safer to merge.

## Reporting Issues

Open a GitHub issue with:

- A clear, descriptive title
- Steps to reproduce (for bugs)
- Expected vs. actual behavior
- Screenshots or screen recordings (if applicable)
- Environment details (browser, OS, wallet)
