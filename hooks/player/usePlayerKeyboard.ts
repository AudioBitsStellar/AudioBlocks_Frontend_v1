import { useEffect } from 'react';

export interface UsePlayerKeyboardOptions {
  autoplayBlocked: boolean;
  onUnlock: () => void;
}

/**
 * Browsers block autoplay until a user gesture; the first click or keypress
 * anywhere on the page counts as that gesture and resumes playback.
 */
export function usePlayerKeyboard({ autoplayBlocked, onUnlock }: UsePlayerKeyboardOptions) {
  useEffect(() => {
    if (!autoplayBlocked) return;
    document.addEventListener('click', onUnlock, { once: true });
    document.addEventListener('keydown', onUnlock, { once: true });
    return () => {
      document.removeEventListener('click', onUnlock);
      document.removeEventListener('keydown', onUnlock);
    };
  }, [autoplayBlocked, onUnlock]);
}
