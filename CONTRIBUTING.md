# Contributing to AudioBlocks

Thanks for your interest in contributing! This document covers everything you
need to get set up and submit a change.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style Guidelines](#code-style-guidelines)
- [Testing](#testing)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Reporting Issues](#reporting-issues)

## Prerequisites

Before setting up the project locally, ensure you have the following installed:

- **Node.js** — version 18.17 or later (the project uses Next.js 15 which requires Node 18.17+)
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
   demo data.

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

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add profile page layout
fix: correct seek-bar time display
a11y: add aria-labels to player controls
chore: update dependencies
docs: update setup instructions
```

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
