# AudioBlocks

AudioBlocks is a decentralized music platform built on Stellar/Soroban,
designed to make the music industry more transparent and equitable. Artists
tokenize their music as NFTs and earn royalties enforced by smart contracts
rather than intermediaries; listeners stream, discover, and collect that
music directly.

This repository is the **listener-facing** web app — discovery, streaming,
community, and the NFT marketplace experience. Artist-side tools (upload,
on-chain minting, earnings) live in the sibling
[`AudioBlocks_For_Artist`](https://github.com/AudioBitsStellar/AudioBlocks_For_Artist)
repo, and both talk to the shared
[`AudioBlock_Backend`](https://github.com/AudioBitsStellar/AudioBlock_Backend)
API.

## Problem Statement

The traditional music industry struggles with transparency, equitable
revenue distribution, and meaningful artist-fan engagement. Artists face
delayed payments and revenue loss to intermediaries, while fans have limited
ways to directly support creators or benefit from their own engagement.
AudioBlocks addresses this by putting royalty splits and ownership on-chain.

## Vision and Mission

To empower artists and listeners through blockchain technology, fostering an
environment where creativity thrives and all participants are rewarded
fairly — a music industry where value flows transparently between creators
and consumers, without unnecessary intermediaries.

## Table of Contents

- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Routes](#routes)
- [Authentication](#authentication)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [Scripts](#scripts)
- [Known Gaps / In Progress](#known-gaps--in-progress)
- [Roadmap](#roadmap)
- [Contributing](#contributing)

## Key Features

**For Listeners**
- Discover and stream music across categories, trending, and curated sections
- A built-in NFT marketplace for collecting tokenized music
- A community space with artist voting and listening-time leaderboards
- A personal collection view of owned music NFTs

**For Artists** (via the companion `AudioBlocks_For_Artist` app)
- Tokenized music with on-chain, transparently-enforced royalty splits
- Direct fan engagement, without payment intermediaries

## Tech Stack

| Concern | Library |
|---|---|
| Framework | Next.js 15 (App Router), React 19 |
| Styling / UI | Tailwind CSS 4, shadcn-style components on Radix UI (`components/ui/`) |
| Icons / animation | `lucide-react`, `@heroicons/react`, `framer-motion` |
| Carousels | `react-slick` |
| Toasts | `sonner` |
| Wallet (EVM) | Dynamic Labs SDK, `wagmi`, `viem` |
| Data fetching | TanStack React Query (provisioned; most pages currently use static data — see [Known Gaps](#known-gaps--in-progress)) |

## Routes

### Public site — `app/(home)/`

| Route | Description |
|---|---|
| `/` | Landing page: hero, featured tracks, sound carousel, "how it works", discovery |
| `/artist-hub` | Marketing page directing artists to the artist dashboard app |
| `/collective` | Community page: collective overview, members, events, FAQ |
| `/marketPlace` | NFT marketplace demo |

### Authenticated app — `app/dashboard/` (requires a valid session cookie)

| Route | Description |
|---|---|
| `/dashboard` | Explore: categories, collections, events, artists, merch |
| `/dashboard/playlist` | The listener's playlist |
| `/dashboard/community` | Artist voting and listening-hours leaderboard |
| `/dashboard/collection` | The listener's owned NFTs/assets |
| `/dashboard/profile` | Listener profile |
| `/dashboard/profile/edit` | Edit profile |

`middleware.ts` gates every `/dashboard/*` route on the presence of the
`audioblocks_jwt` cookie, redirecting unauthenticated visitors to `/`.

## Authentication

Login is wallet-based via [Dynamic Labs](https://www.dynamic.xyz/): a user
connects/creates a wallet through Dynamic's embedded modal, the wallet signs
a one-time message, and the signature is sent to the backend's
`/api/auth/login` (falling back to `/api/auth/register` for new users). The
returned JWT is stored in the `audioblocks_jwt` cookie and read by both
client components (to gate UI) and `middleware.ts` (to gate routes).

## Project Structure

```
app/
├── (home)/                  # public marketing/listener site, shares Navbar+Footer layout
│   ├── page.tsx               # landing page
│   ├── artist-hub/, collective/, marketPlace/
├── dashboard/                  # authenticated app, shares Sidebar+TopNavbar+Player layout
│   ├── page.tsx, playlist/, community/, collection/, profile/
components/
├── ui/                        # shadcn/Radix primitives (button, card, input, sheet, tabs, ...)
├── common/
│   ├── home/                   # landing page sections (Hero, Featured, Discover, ...)
│   ├── artist-hub/, collective/
│   └── dashboard/                # sidebar, top nav, Artists/Collections/Merch carousels, Player
context/provider.tsx            # Dynamic Labs + Wagmi + React Query providers
hooks/useAuth.tsx                 # wallet-signature login/registration flow
middleware.ts                     # JWT-cookie route gate for /dashboard
config/abi.tsx                    # contract ABI/address (currently unused — see Known Gaps)
```

## Environment Variables

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000/api   # AudioBlock_Backend base URL
```

This is the only environment variable the app reads. It must point at a
running [`AudioBlock_Backend`](https://github.com/AudioBitsStellar/AudioBlock_Backend)
instance for login/registration to work.

## Getting Started

```bash
git clone https://github.com/AudioBitsStellar/AudioBlocks_Frontend_v1.git
cd AudioBlocks_Frontend_v1
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:4000/api" > .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts the Next.js dev server |
| `npm run build` | Production build |
| `npm start` | Serves the production build |
| `npm run lint` | Runs ESLint |
| `npm run format` | Formats the codebase with Prettier |

## Known Gaps / In Progress

- Most dashboard and discovery pages (Explore, Playlist, Community,
  Collection, Marketplace) currently render static/dummy data rather than
  live data from the backend or chain.
- `config/abi.tsx` defines a contract address and ABI that aren't currently
  referenced anywhere in the app — scaffolding for a future direct on-chain
  read/write feature.
- `@tanstack/react-query` is wired into the provider tree (required
  internally by `wagmi`) but isn't yet used for the app's own data fetching.

## Roadmap

1. **Phase 1** — MVP launch with music streaming and basic reward functionality
2. **Phase 2** — Advanced analytics for artists and personalized recommendations for listeners
3. **Phase 3** — Expand platform integrations with other Web3 ecosystems
4. **Phase 4** — Scale to a global audience with enhanced performance optimization

## Contributing

1. Fork the repository
2. Create a new branch for your feature or bugfix
3. Submit a pull request with a clear description of your changes
