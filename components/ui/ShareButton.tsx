'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Share2 } from 'lucide-react';
import { toast } from 'sonner';

export interface ShareButtonProps {
  url: string;
  title?: string;
  text?: string;
  className?: string;
  timestamp?: number;
}

export function ShareButton({ url, title, text, className = '', timestamp }: ShareButtonProps) {
  const shareUrl =
    timestamp != null && timestamp > 0
      ? `${url}${url.includes('?') ? '&' : '?'}t=${Math.floor(timestamp)}`
      : url;
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) {
        clearTimeout(copiedTimeoutRef.current);
      }
    };
  }, []);

  const showCopiedFeedback = () => {
    setIsCopied(true);
    toast.success('Link copied to clipboard');

    if (copiedTimeoutRef.current) {
      clearTimeout(copiedTimeoutRef.current);
    }

    copiedTimeoutRef.current = setTimeout(() => {
      setIsCopied(false);
      copiedTimeoutRef.current = null;
    }, 2000);
  };

  const handleShare = async () => {
    if (isLoading) return;

    setIsLoading(true);

    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({ title, text, url: shareUrl });
        toast.success('Shared successfully');
      } else if (
        typeof navigator !== 'undefined' &&
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === 'function'
      ) {
        await navigator.clipboard.writeText(shareUrl);
        showCopiedFeedback();
      } else {
        throw new Error('Clipboard access is not available');
      }
    } catch {
      toast.error('Unable to share. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      aria-label="Share"
      className={`relative inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      disabled={isLoading}
      type="button"
      onClick={handleShare}
    >
      {isLoading ? (
        <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
      ) : (
        <Share2 aria-hidden="true" className="h-4 w-4" />
      )}
      <span>{isLoading ? 'Sharing...' : 'Share'}</span>
      {isCopied && (
        <span
          aria-live="polite"
          className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded bg-black px-2 py-1 text-xs text-white shadow-lg"
          role="status"
        >
          Copied!
        </span>
      )}
    </button>
  );
}

export default ShareButton;
