'use client';

import { useEffect, useId, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { ApiError } from '@/lib/apiClient';
import {
  COMMENT_REPORT_REASONS,
  DUPLICATE_REPORT_STATUS,
  REPORT_DETAILS_MAX_LENGTH,
  SONG_REPORT_REASONS,
  submitReport,
} from '@/lib/reportService';
import type { ReportTarget } from '@/lib/reportService';
import { hasAuthSession } from '@/lib/session';

interface ReportDialogProps {
  open: boolean;
  onClose: () => void;
  target: ReportTarget;
}

const fieldClass =
  'w-full rounded-lg bg-[#2a2a2a] border border-gray-700 px-3 py-2 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F2AFC9]';

const buttonClass =
  'px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2AFC9]';

/**
 * Lets a signed-in listener report a song or comment for moderator review.
 * Signed-out users see a sign-in prompt instead of the form. A duplicate report
 * (HTTP 409) closes the dialog with a friendly notice.
 */
export function ReportDialog({ open, onClose, target }: ReportDialogProps) {
  const reasonFieldId = useId();
  const detailsFieldId = useId();
  const counterId = useId();

  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');

  const subject = target.kind === 'song' ? 'song' : 'comment';
  const reasons = target.kind === 'song' ? SONG_REPORT_REASONS : COMMENT_REPORT_REASONS;
  const signedIn = hasAuthSession();

  // Start each opening with a clean form.
  useEffect(() => {
    if (open) {
      setReason('');
      setDetails('');
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: () => submitReport(target, reason, details),
    onSuccess: () => {
      toast.success('Thanks. Our moderators will review this report.');
      onClose();
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === DUPLICATE_REPORT_STATUS) {
        toast.info("You've already reported this.");
        onClose();
        return;
      }
      toast.error('Could not submit your report. Please try again.');
    },
  });

  const canSubmit = signedIn && reason !== '' && !mutation.isPending;

  return (
    <Modal
      description="Reports are reviewed by moderators."
      open={open}
      size="sm"
      title={`Report this ${subject}`}
      onClose={onClose}
    >
      {signedIn ? (
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (canSubmit) mutation.mutate();
          }}
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-white" htmlFor={reasonFieldId}>
              Reason
            </label>
            <select
              required
              className={fieldClass}
              id={reasonFieldId}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            >
              <option value="">Select a reason</option>
              {reasons.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-white" htmlFor={detailsFieldId}>
              Details (optional)
            </label>
            <textarea
              aria-describedby={counterId}
              className={`${fieldClass} min-h-24 resize-y`}
              id={detailsFieldId}
              maxLength={REPORT_DETAILS_MAX_LENGTH}
              value={details}
              onChange={(event) => setDetails(event.target.value)}
            />
            <p className="text-xs text-gray-400 text-right" id={counterId}>
              {details.length}/{REPORT_DETAILS_MAX_LENGTH}
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <button
              className={`${buttonClass} border border-gray-600 text-gray-300 hover:border-gray-400`}
              type="button"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className={`${buttonClass} bg-[#D2045B] text-white hover:bg-[#b80350]`}
              disabled={!canSubmit}
              type="submit"
            >
              {mutation.isPending ? 'Submitting…' : 'Submit report'}
            </button>
          </div>
        </form>
      ) : (
        <p className="text-sm text-gray-300">Sign in to report a {subject}.</p>
      )}
    </Modal>
  );
}

export default ReportDialog;
