'use client';

import { useId, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { LifeBuoy, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { FEEDBACK_MESSAGE_MAX_LENGTH, submitFeedback } from '@/lib/feedbackService';
import { hasAuthSession } from '@/lib/session';

const SUPPORT_EMAIL = 'support@audioblocks.com';

const fieldClass =
  'w-full rounded-lg bg-[#2a2a2a] border border-gray-700 px-3 py-2 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F2AFC9]';

const buttonClass =
  'px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2AFC9]';

/**
 * Support contact + in-app feedback entry point (#857). Mounted once in the
 * root layout so it's reachable from every page except the embeddable
 * player widget, which has no room (and no need) for it.
 */
export function SupportWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const messageFieldId = useId();
  const emailFieldId = useId();
  const counterId = useId();

  const signedIn = hasAuthSession();

  const mutation = useMutation({
    mutationFn: () => submitFeedback(message, signedIn ? undefined : email),
    onSuccess: () => {
      toast.success("Thanks for the feedback — we'll take a look.");
      setMessage('');
      setEmail('');
      setOpen(false);
    },
    onError: () => {
      toast.error('Could not send your feedback. Please try again.');
    },
  });

  if (pathname?.startsWith('/embed')) return null;

  const canSubmit = message.trim().length > 0 && !mutation.isPending;

  return (
    <>
      <button
        aria-label="Support and feedback"
        className="fixed bottom-24 left-4 z-50 flex h-11 w-11 items-center justify-center rounded-full bg-[#1E1E1E] text-white shadow-lg ring-1 ring-gray-700 transition-transform hover:scale-110 hover:bg-[#2a2a2a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2AFC9]"
        type="button"
        onClick={() => setOpen(true)}
      >
        <LifeBuoy aria-hidden="true" size={20} />
      </button>

      <Modal
        description="Reach the team or tell us what's not working."
        open={open}
        size="sm"
        title="Support & feedback"
        onClose={() => setOpen(false)}
      >
        <div className="flex flex-col gap-5">
          <a
            className="flex items-center gap-3 rounded-lg border border-gray-700 bg-[#1E1E1E] p-3 text-sm text-white transition-colors hover:border-gray-500"
            href={`mailto:${SUPPORT_EMAIL}`}
          >
            <Mail aria-hidden="true" className="shrink-0 text-gray-400" size={18} />
            <span>
              Contact support
              <span className="block text-xs text-gray-400">{SUPPORT_EMAIL}</span>
            </span>
          </a>

          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (canSubmit) mutation.mutate();
            }}
          >
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-white" htmlFor={messageFieldId}>
                Send feedback
              </label>
              <textarea
                aria-describedby={counterId}
                className={`${fieldClass} min-h-24 resize-y`}
                id={messageFieldId}
                maxLength={FEEDBACK_MESSAGE_MAX_LENGTH}
                placeholder="What's on your mind?"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />
              <p className="text-xs text-gray-400 text-right" id={counterId}>
                {message.length}/{FEEDBACK_MESSAGE_MAX_LENGTH}
              </p>
            </div>

            {!signedIn && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-white" htmlFor={emailFieldId}>
                  Your email (optional)
                </label>
                <input
                  className={fieldClass}
                  id={emailFieldId}
                  placeholder="you@example.com"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
            )}

            <div className="flex justify-end">
              <button
                className={`${buttonClass} bg-[#D2045B] text-white hover:bg-[#b80350]`}
                disabled={!canSubmit}
                type="submit"
              >
                {mutation.isPending ? 'Sending…' : 'Send feedback'}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}

export default SupportWidget;
