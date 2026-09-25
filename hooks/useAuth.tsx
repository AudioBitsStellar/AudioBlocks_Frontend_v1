import { useEffect, useState, useCallback } from 'react';
import { useDynamicContext, useDynamicEvents } from '@dynamic-labs/sdk-react-core';
import Cookies from 'js-cookie';
import { toast } from 'sonner';
import { isAddress } from 'viem';
import { useAccount } from 'wagmi';
import apiClient from '@/lib/apiClient';
import { AUTH_ROLE_SELECTED_EVENT, AUTH_ROLES, isAuthRole, type AuthRole } from '@/lib/authRoles';
import { AUTH } from '@/lib/constants';
import { syncPrivyUserWithBackend } from '@/lib/profileSync';
import { isUserCancellationError } from '@/lib/walletErrors';

// #277 — mirrors the token into an HttpOnly cookie (via app/api/session)
// that middleware.ts uses for route-gating, alongside the JS-readable
// `audioblocks_jwt` cookie apiClient.ts still needs for the Bearer header.
// Best-effort: a failure here only means /dashboard's server-side gate
// falls back to redirecting to login, not that the user is locked out of
// the app entirely.
function establishHttpOnlySession(token: string): void {
  fetch('/api/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  }).catch(() => {
    /* non-fatal — see comment above */
  });
}

export const Auth = () => {
  const { user, setShowAuthFlow } = useDynamicContext();
  const { primaryWallet, handleLogOut } = useDynamicContext();
  const { address } = useAccount();
  const [shouldTriggerSignature, setShouldTriggerSignature] = useState(false);
  const [loading, setLoading] = useState(false);
  // #476 — role chosen in the ConnectWalletPrompt ('listener' | 'artist').
  // Defaults to 'listener' when auth is triggered without going through the
  // prompt (e.g. the hero CTAs), preserving the previous behaviour.
  const [selectedRole, setSelectedRole] = useState<AuthRole>(AUTH_ROLES.LISTENER);

  // #476 — the differentiated connect-wallet prompt announces the chosen
  // role through a DOM event so any entry point can trigger auth without
  // prop-drilling. Remember the role, then open the Dynamic auth flow.
  useEffect(() => {
    const handleRoleSelected = (event: Event) => {
      const detail = (event as CustomEvent<{ role?: unknown }>).detail;
      if (isAuthRole(detail?.role)) {
        setSelectedRole(detail.role);
      }
      setShouldTriggerSignature(true);
      setShowAuthFlow(true);
    };
    window.addEventListener(AUTH_ROLE_SELECTED_EVENT, handleRoleSelected);
    return () => window.removeEventListener(AUTH_ROLE_SELECTED_EVENT, handleRoleSelected);
  }, [setShowAuthFlow]);

  // A connection can fail before a user, wallet, or address exists. Clear
  // the pending trigger on that event so a later, unrelated connection does
  // not unexpectedly start a signature flow.
  useDynamicEvents('walletConnectionFailed', () => {
    setShouldTriggerSignature(false);
  });
  useDynamicEvents('authFlowCancelled', () => {
    setShouldTriggerSignature(false);
  });

  const authenticateUser = useCallback(
    async (
      role: string,
      email: string,
      walletAddress: string,
      signature: string,
      message: string
    ) => {
      if (!isAddress(walletAddress)) {
        toast.error('Connected wallet address is invalid. Please reconnect your wallet.');
        return;
      }

      /** #477 — push the provider (Dynamic/Privy) user state to the backend. */
      const syncProviderProfile = (token: string | undefined) => {
        if (!token) return;
        void syncPrivyUserWithBackend({
          walletAddress: walletAddress.toLowerCase(),
          email: email || null,
          dynamicUserId: user?.userId ?? null,
          role,
        });
      };

      try {
        const response = await apiClient.post('/api/auth/login', {
          role,
          email,
          walletAddress,
          signature,
          message,
        });

        const token = response.data.user.token;
        const refreshToken = response.data.user.refreshToken ?? response.data.refreshToken;
        Cookies.set(AUTH.COOKIE_NAME, token, AUTH.COOKIE_OPTIONS);
        if (refreshToken) Cookies.set(AUTH.REFRESH_COOKIE_NAME, refreshToken, AUTH.COOKIE_OPTIONS);
        establishHttpOnlySession(token);
        syncProviderProfile(token);
        toast.success(response.data?.message);
        return response.data;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        const responseMessage = error?.response?.data?.message;
        const errorMsg = typeof responseMessage === 'string' ? responseMessage : undefined;

        if (errorMsg?.toLowerCase().includes('user not found')) {
          try {
            const registerResponse = await apiClient.post('/api/auth/register', {
              role,
              email,
              walletAddress,
              signature,
              message,
            });

            const registerToken = registerResponse.data?.user?.token;
            const refreshToken =
              registerResponse.data?.user?.refreshToken ?? registerResponse.data?.refreshToken;
            Cookies.set(AUTH.COOKIE_NAME, registerToken, AUTH.COOKIE_OPTIONS);
            if (refreshToken)
              Cookies.set(AUTH.REFRESH_COOKIE_NAME, refreshToken, AUTH.COOKIE_OPTIONS);
            establishHttpOnlySession(registerToken);
            syncProviderProfile(registerToken);
            toast.success(registerResponse.data?.message);
            return registerResponse.data;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } catch (registerError: any) {
            toast.error(registerError?.response?.data?.message || 'Registration failed');
            handleLogOut();
          }
        } else {
          handleLogOut();
          toast.error(errorMsg || 'Authentication failed. Please try again.');
        }
      }
    },
    [handleLogOut, user?.userId]
  );

  useEffect(() => {
    const runSignatureFlow = async () => {
      if (!user?.userId || !primaryWallet || !address || !shouldTriggerSignature) return;

      if (!isAddress(address)) {
        toast.error('Connected wallet address is invalid. Please reconnect your wallet.');
        setShouldTriggerSignature(false);
        return;
      }

      const message = `Welcome to AudioBlocks! Sign this message to authenticate: ${new Date().toISOString()}`;

      try {
        setLoading(true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const signature: any = await primaryWallet.signMessage(message);

        // #476 — carry the role picked in the connect-wallet prompt through to
        // the backend login/register payload ('listener' by default).
        await authenticateUser(selectedRole, user.email!, address, signature as string, message);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        if (isUserCancellationError(err)) {
          toast.error('Signature request was cancelled. Please sign the message to continue.');
        } else {
          toast.error('Failed to sign the authentication message. Please try again.');
        }
      } finally {
        setLoading(false);
        setShouldTriggerSignature(false); // Prevent future auto-triggers
      }
    };

    runSignatureFlow();
  }, [
    user?.userId,
    user?.email,
    primaryWallet,
    address,
    shouldTriggerSignature,
    authenticateUser,
    selectedRole,
  ]);

  return { setShouldTriggerSignature, handleLogOut, loading };
};
