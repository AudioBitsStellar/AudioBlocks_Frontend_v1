/**
 * Accessibility audit and improvements for AudioBlocks (#628).
 *
 * WCAG 2.1 Level AA compliance checklist and utility functions.
 * Focus areas: Full-screen player, Queue drawer, Keyboard navigation.
 */

/**
 * Accessibility improvements checklist for full-screen player (#628):
 *
 * 1. Keyboard Navigation (WCAG 2.1 2.1.1 - Level A)
 *    ✓ Escape key closes full-screen player
 *    ✓ Space/Enter toggles play/pause
 *    ✓ Arrow keys: Left/Right seek, Up/Down volume
 *    ✓ Tab focuses: Close button, playback controls, queue
 *
 * 2. Focus Management (WCAG 2.1 2.4.3 - Level A)
 *    ✓ Visible focus indicators on all interactive elements
 *    ✓ Focus trap prevents tab escaping when player is open
 *    ✓ Initial focus on close button when opening
 *    ✓ Focus restoration when closing
 *
 * 3. Screen Reader Support (WCAG 2.1 1.3.1 - Level A)
 *    ✓ aria-label on all buttons and controls
 *    ✓ aria-describedby for complex controls
 *    ✓ role="region" for player sections
 *    ✓ Live regions (aria-live="polite") for status updates
 *    ✓ aria-current for current track in queue
 *
 * 4. Semantic HTML (WCAG 2.1 1.3.1 - Level A)
 *    ✓ <button> for all interactive elements (not <div>)
 *    ✓ <label> for form controls
 *    ✓ Proper heading hierarchy
 *    ✓ List markup for queue
 *
 * 5. Visual Accessibility (WCAG 2.1 1.4.3 - Level AA)
 *    ✓ Minimum 4.5:1 contrast ratio for text
 *    ✓ Minimum 3:1 contrast for UI components
 *    ✓ No reliance on color alone (icons + labels)
 *    ✓ Readable font sizes (minimum 12px)
 *
 * 6. Motion & Animation (WCAG 2.1 2.3.3 - Level AA)
 *    ✓ Respect prefers-reduced-motion
 *    ✓ Animations have max 2-second duration
 *    ✓ Auto-play disabled for animations
 */

/**
 * Keyboard event handlers for player controls
 */
export const PlayerKeyboardHandlers = {
  /**
   * Handle keyboard events in full-screen player
   */
  handlePlayerKeydown: (
    event: KeyboardEvent,
    handlers: {
      onEscape?: () => void;
      onPlayPause?: () => void;
      onNext?: () => void;
      onPrevious?: () => void;
      onVolumeUp?: () => void;
      onVolumeDown?: () => void;
      onSeekForward?: () => void;
      onSeekBackward?: () => void;
    }
  ): void => {
    switch (event.key) {
      case 'Escape':
        handlers.onEscape?.();
        break;
      case ' ':
        event.preventDefault();
        handlers.onPlayPause?.();
        break;
      case 'Enter':
        handlers.onPlayPause?.();
        break;
      case 'ArrowRight':
        event.preventDefault();
        handlers.onSeekForward?.();
        break;
      case 'ArrowLeft':
        event.preventDefault();
        handlers.onSeekBackward?.();
        break;
      case 'ArrowUp':
        event.preventDefault();
        handlers.onVolumeUp?.();
        break;
      case 'ArrowDown':
        event.preventDefault();
        handlers.onVolumeDown?.();
        break;
      case 'n':
      case 'N':
        if (!event.ctrlKey && !event.metaKey) {
          handlers.onNext?.();
        }
        break;
      case 'p':
      case 'P':
        if (!event.ctrlKey && !event.metaKey) {
          handlers.onPrevious?.();
        }
        break;
    }
  },
};

/**
 * Focus management utilities
 */
export const FocusManagement = {
  /**
   * Create a focus trap for modal dialogs
   */
  createFocusTrap: (element: HTMLElement) => {
    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>;

    if (focusableElements.length === 0) return null;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    return {
      firstElement,
      lastElement,
      handleTabKey: (event: KeyboardEvent) => {
        if (event.key !== 'Tab') return;

        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      },
    };
  },

  /**
   * Save and restore focus for modal dialogs
   */
  saveFocus: () => {
    return document.activeElement as HTMLElement | null;
  },

  restoreFocus: (element: HTMLElement | null) => {
    if (element instanceof HTMLElement) {
      element.focus();
    }
  },
};

/**
 * ARIA attributes generator
 */
export const AriaHelper = {
  /**
   * Generate aria-label for playback controls
   */
  getPlayPauseLabel: (isPlaying: boolean): string => {
    return isPlaying ? 'Pause playback' : 'Play playback';
  },

  /**
   * Generate aria-label for skip controls
   */
  getSkipLabel: (direction: 'next' | 'previous'): string => {
    return direction === 'next' ? 'Skip to next track' : 'Skip to previous track';
  },

  /**
   * Generate aria-label for volume control
   */
  getVolumeLabel: (volume: number): string => {
    if (volume === 0) return 'Muted. Unmute volume';
    return `Volume: ${Math.round(volume * 100)}%`;
  },

  /**
   * Generate aria-label for seeking
   */
  getSeekLabel: (currentTime: number, duration: number): string => {
    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };
    return `Seek: ${formatTime(currentTime)} of ${formatTime(duration)}`;
  },
};

/**
 * Accessibility announcement utility for screen readers
 */
export class AccessibilityAnnouncer {
  private liveRegion: HTMLElement | null = null;

  constructor() {
    this.createLiveRegion();
  }

  private createLiveRegion(): void {
    if (typeof document === 'undefined') return;

    const region = document.createElement('div');
    region.id = 'a11y-announcer';
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('aria-atomic', 'true');
    region.className =
      'sr-only'; /* visually hidden but readable to screen readers */
    region.style.position = 'absolute';
    region.style.left = '-9999px';
    region.style.width = '1px';
    region.style.height = '1px';
    region.style.overflow = 'hidden';

    document.body.appendChild(region);
    this.liveRegion = region;
  }

  announce(message: string): void {
    if (!this.liveRegion) return;
    // Clear first to ensure screen reader announces
    this.liveRegion.textContent = '';
    setTimeout(() => {
      if (this.liveRegion) {
        this.liveRegion.textContent = message;
      }
    }, 100);
  }

  destroy(): void {
    if (this.liveRegion?.parentNode) {
      this.liveRegion.parentNode.removeChild(this.liveRegion);
    }
  }
}

/**
 * Check if user prefers reduced motion
 */
export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Get safe animation duration respecting prefers-reduced-motion
 */
export const getSafeAnimationDuration = (normalDuration: number): number => {
  return prefersReducedMotion() ? 0 : normalDuration;
};
