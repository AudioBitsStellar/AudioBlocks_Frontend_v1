'use client';

import { Modal } from '@/components/ui/Modal';

interface AgeGateModalProps {
  open: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

const buttonClass =
  'px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2AFC9]';

/**
 * Age-verification gate shown before a listener can enable explicit content (#855).
 * Turning the preference back off never needs to pass through this gate.
 */
export function AgeGateModal({ open, onConfirm, onClose }: AgeGateModalProps) {
  return (
    <Modal
      description="Confirm your age to enable explicit content."
      open={open}
      size="sm"
      title="Explicit content"
      onClose={onClose}
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-gray-300">
          Tracks marked explicit may contain strong language, sexual content, or graphic violence.
          By continuing, you confirm that you are 18 years of age or older and consent to seeing
          this content. You can turn it back off at any time in Settings.
        </p>
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
            type="button"
            onClick={onConfirm}
          >
            I&apos;m 18 or older
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default AgeGateModal;
