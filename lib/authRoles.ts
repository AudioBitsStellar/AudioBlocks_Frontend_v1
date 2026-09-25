/**
 * Auth role constants shared by the connect-wallet prompt (#476) and the
 * auth login/register payload (`hooks/useAuth.tsx`).
 *
 * The backend accepts `role` on both `/api/auth/login` and `/api/auth/register`;
 * today the signature flow hardcodes `'listener'`. These constants give the UI
 * one source of truth so the role a visitor picks in the connect-wallet prompt
 * flows through to the backend unchanged.
 */

export const AUTH_ROLES = {
  LISTENER: 'listener',
  ARTIST: 'artist',
} as const;

export type AuthRole = (typeof AUTH_ROLES)[keyof typeof AUTH_ROLES];

/** Narrow an unknown value (e.g. a CustomEvent detail) to an AuthRole. */
export function isAuthRole(value: unknown): value is AuthRole {
  return value === AUTH_ROLES.LISTENER || value === AUTH_ROLES.ARTIST;
}

/**
 * DOM event used to decouple the connect-wallet prompt UI from the auth flow.
 * `ConnectWalletPrompt` dispatches it with `{ detail: { role } }`;
 * `hooks/useAuth.tsx` listens for it, remembers the chosen role, and opens the
 * Dynamic auth flow. Components can trigger auth without importing or
 * prop-drilling through every entry point.
 */
export const AUTH_ROLE_SELECTED_EVENT = 'audioblocks:select-auth-role';

/** User-facing copy for the differentiated connect-wallet prompt (#476). */
export const CONNECT_WALLET_PROMPT_COPY = {
  title: 'How will you use AudioBlocks?',
  description: 'Pick how you want to get started — you can always switch later.',
  listener: {
    title: 'I want to listen',
    description: 'Stream ad-free music, collect music NFTs, and earn while you listen.',
  },
  artist: {
    title: 'I am an artist',
    description: 'Upload your music, mint NFTs, and get paid fairly with on-chain royalties.',
  },
} as const;
