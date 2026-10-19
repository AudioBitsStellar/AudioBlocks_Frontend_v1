'use client';

import { useId, useState } from 'react';
import { useAnalyticsConsent } from '@/hooks/useAnalyticsConsent';
import {
  useAccountDeletionStatus,
  useCancelAccountDeletion,
  useExportAccountData,
  useRequestAccountDeletion,
} from '@/hooks/useAccountPrivacy';
import { ACCOUNT_DELETION_CONFIRMATION_PHRASE } from '@/lib/accountService';
import { setAnalyticsConsent } from '@/lib/analyticsConsent';

const buttonBase =
  'px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2AFC9]';

function AnalyticsChoice() {
  const consent = useAnalyticsConsent();

  return (
    <div className="p-4 rounded-lg border border-gray-700 bg-[#1E1E1E]">
      <div className="font-medium text-white">Analytics</div>
      <div className="text-xs text-gray-400 mt-1">
        Help us understand how AudioBlocks is used. Nothing is tracked unless you accept.
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          aria-pressed={consent === 'accepted'}
          className={`${buttonBase} ${
            consent === 'accepted'
              ? 'bg-[#D2045B] text-white'
              : 'border border-gray-600 text-gray-300 hover:border-gray-400'
          }`}
          type="button"
          onClick={() => setAnalyticsConsent('accepted')}
        >
          Accept
        </button>
        <button
          aria-pressed={consent === 'rejected'}
          className={`${buttonBase} ${
            consent === 'rejected'
              ? 'bg-gray-600 text-white'
              : 'border border-gray-600 text-gray-300 hover:border-gray-400'
          }`}
          type="button"
          onClick={() => setAnalyticsConsent('rejected')}
        >
          Reject
        </button>
        <span className="text-xs text-gray-400">
          {consent === 'accepted' && 'Analytics are on.'}
          {consent === 'rejected' && 'Analytics are off.'}
          {(consent === 'unset' || consent === 'pending') && 'You have not chosen yet.'}
        </span>
      </div>
    </div>
  );
}

function DataExport() {
  const exportData = useExportAccountData();

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border border-gray-700 bg-[#1E1E1E]">
      <div>
        <div className="font-medium text-white">Export my data</div>
        <div className="text-xs text-gray-400 mt-1">
          Download a JSON copy of the account data AudioBlocks holds about you.
        </div>
      </div>
      <button
        aria-busy={exportData.isPending}
        className={`${buttonBase} bg-[#D2045B] hover:bg-[#b0034c] text-white shrink-0`}
        disabled={exportData.isPending}
        type="button"
        onClick={() => exportData.mutate()}
      >
        {exportData.isPending ? 'Preparing…' : 'Download'}
      </button>
    </div>
  );
}

function DeleteAccount() {
  const statusQuery = useAccountDeletionStatus();
  const requestDeletion = useRequestAccountDeletion();
  const cancelDeletion = useCancelAccountDeletion();
  const [phrase, setPhrase] = useState('');
  const inputId = useId();

  const scheduledFor = statusQuery.data?.scheduledFor ?? null;
  const isConfirmed = phrase.trim() === ACCOUNT_DELETION_CONFIRMATION_PHRASE;

  if (statusQuery.isPending) {
    return <p className="text-sm text-gray-400">Checking deletion status…</p>;
  }

  if (scheduledFor) {
    const scheduledDate = new Date(scheduledFor).toLocaleDateString(undefined, {
      dateStyle: 'long',
    });

    return (
      <div className="p-4 rounded-lg border border-amber-600/50 bg-amber-500/5">
        <div className="font-medium text-white">Account deletion scheduled</div>
        <p className="text-xs text-gray-300 mt-1">
          Your account will be deleted on {scheduledDate}. You can cancel until then.
        </p>
        <button
          aria-busy={cancelDeletion.isPending}
          className={`${buttonBase} mt-3 border border-gray-500 text-white hover:bg-white/5`}
          disabled={cancelDeletion.isPending}
          type="button"
          onClick={() => cancelDeletion.mutate()}
        >
          Cancel deletion
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-lg border border-red-900/60 bg-[#1E1E1E]">
      <div className="font-medium text-white">Delete account</div>
      <div className="text-xs text-gray-400 mt-1 space-y-2">
        <p>
          Your account and off-chain data are deleted after a grace period. You can cancel during
          that time.
        </p>
        <p className="text-amber-300">
          NFTs and transactions recorded on-chain are permanent. Deleting your account cannot
          remove them.
        </p>
      </div>

      <form
        className="mt-4 flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (isConfirmed) requestDeletion.mutate();
        }}
      >
        <label className="text-xs text-gray-300" htmlFor={inputId}>
          {`Type ${ACCOUNT_DELETION_CONFIRMATION_PHRASE} to confirm`}
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            autoComplete="off"
            className="flex-1 min-w-[12rem] rounded-lg border border-gray-700 bg-[#121212] px-3 py-1.5 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2AFC9]"
            id={inputId}
            type="text"
            value={phrase}
            onChange={(event) => setPhrase(event.target.value)}
          />
          <button
            aria-busy={requestDeletion.isPending}
            className={`${buttonBase} bg-red-600 hover:bg-red-700 text-white`}
            disabled={!isConfirmed || requestDeletion.isPending}
            type="submit"
          >
            {requestDeletion.isPending ? 'Scheduling…' : 'Delete account'}
          </button>
        </div>
      </form>
    </div>
  );
}

/**
 * "Privacy & data" settings (#597, #598). Anchored at `#privacy-data`, which
 * the banner and footer link to.
 */
export default function PrivacyDataSection() {
  return (
    <section className="mb-10" id="privacy-data">
      <h2 className="text-lg font-semibold text-white mb-4">Privacy &amp; data</h2>
      <div className="space-y-4">
        <AnalyticsChoice />
        <DataExport />
        <DeleteAccount />
      </div>
    </section>
  );
}
