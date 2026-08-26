import { useEffect, useState, useCallback } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import Cookies from 'js-cookie';
import { toast } from 'sonner';
import { useAccount } from 'wagmi';
import { isAddress } from 'viem';
import apiClient from '@/lib/apiClient';
import { AUTH } from '@/lib/constants';

/**
 * Distinguishes a user declining/cancelling a wallet signature prompt from a
 * generic signing failure (e.g. provider disconnect, RPC error). Covers the
 * common shapes across injected-wallet providers: EIP-1193 code 4001, and
 * message text used by most wallets/providers for user-initiated rejection.
 */
function isUserRejectionError(err: unknown): boolean {
  const e = err as { code?: number; message?: string; reason?: string } | null | undefined;
  if (e?.code === 4001) return true;
  const message = String(e?.message ?? e?.reason ?? err ?? '').toLowerCase();
  return (
    message.includes('user rejected') ||
    message.includes('user denied') ||
    message.includes('rejected the request') ||
    message.includes('user cancelled') ||
    message.includes('user canceled')
  );
}

export const Auth = () => {
  const { user } = useDynamicContext();
  const { primaryWallet, handleLogOut } = useDynamicContext();
  const { address } = useAccount();
  const [shouldTriggerSignature, setShouldTriggerSignature] = useState(false);
  const [loading, setLoading] = useState(false);

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

      try {
        const response = await apiClient.post('/api/auth/login', {
          role,
          email,
          walletAddress,
          signature,
          message,
        });

        const token = response.data.user.token;
        Cookies.set(AUTH.COOKIE_NAME, token, AUTH.COOKIE_OPTIONS);
        toast.success(response.data?.message);
        return response.data;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        const errorMsg = error?.response?.data?.message;

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
            Cookies.set(AUTH.COOKIE_NAME, registerToken, AUTH.COOKIE_OPTIONS);
            toast.success(registerResponse.data?.message);
            return registerResponse.data;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } catch (registerError: any) {
            toast.error(registerError?.response?.data?.message || 'Registration failed');
            handleLogOut();
          }
        } else {
          handleLogOut();
          toast.error(error.response?.data?.message);
        }
      }
    },
    [handleLogOut]
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

        await authenticateUser('listener', user.email!, address, signature as string, message);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        if (isUserRejectionError(err)) {
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
  }, [user?.userId, user?.email, primaryWallet, address, shouldTriggerSignature, authenticateUser]);

  return { setShouldTriggerSignature, handleLogOut, loading };
};
