'use client';

// #462 — LoginButton opens the Privy login modal when the user is not
// authenticated, and shows a logout control when they are.
//
// Usage:
//   import LoginButton from '@/components/ui/LoginButton';
//   <LoginButton />

import { usePrivy } from '@privy-io/react-auth';

export default function LoginButton() {
  const { ready, authenticated, login, logout, user } = usePrivy();

  if (!ready) {
    return (
      <button
        disabled
        className="px-4 py-2 rounded-lg bg-violet-600/50 text-white text-sm cursor-not-allowed"
        aria-busy="true"
      >
        Loading…
      </button>
    );
  }

  if (authenticated) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-foreground/70 truncate max-w-[160px]">
          {user?.email?.address ?? user?.wallet?.address ?? 'Connected'}
        </span>
        <button
          onClick={logout}
          className="px-4 py-2 rounded-lg border border-border hover:bg-muted text-sm transition-colors"
        >
          Log out
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={login}
      className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors"
    >
      Log in
    </button>
  );
}
