'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/Modal';
import { useSessionExpiry } from '@/hooks/useSessionExpiry';
import { clearSession } from '@/lib/apiClient';
import { formatCountdown } from '@/lib/session';

/**
 * Warns the user shortly before their session expires and lets them either
 * extend it or sign out. If they ignore the warning, they're signed out when
 * the token lapses. Renders nothing while there's no session.
 */
const SessionExpiryModal = () => {
  const { handleLogOut } = useDynamicContext();
  const router = useRouter();

  const signOut = useCallback(() => {
    clearSession();
    handleLogOut();
    router.push('/');
  }, [handleLogOut, router]);

  const onExpire = useCallback(() => {
    toast.error('Your session has expired. Please sign in again.');
    handleLogOut();
    router.push('/');
  }, [handleLogOut, router]);

  const { msRemaining, isWarningVisible, isExtending, extendSession, dismiss } = useSessionExpiry({
    onExpire,
  });

  const staySignedIn = async () => {
    if (await extendSession()) {
      toast.success('You’re still signed in.');
    } else {
      toast.error('We couldn’t extend your session. Please sign in again.');
      signOut();
    }
  };

  return (
    <Modal
      closeOnBackdropClick={false}
      description="For your security, you’ll be signed out soon due to inactivity."
      open={isWarningVisible}
      size="sm"
      title="Your session is about to expire"
      onClose={dismiss}
    >
      <p className="text-sm text-on-muted">
        Time remaining:{' '}
        <span className="font-mono text-base font-semibold text-white" role="timer">
          {formatCountdown(msRemaining ?? 0)}
        </span>
      </p>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button disabled={isExtending} variant="outline" onClick={signOut}>
          Sign out
        </Button>
        <Button disabled={isExtending} onClick={staySignedIn}>
          {isExtending ? 'Extending…' : 'Stay signed in'}
        </Button>
      </div>
    </Modal>
  );
};

export default SessionExpiryModal;
