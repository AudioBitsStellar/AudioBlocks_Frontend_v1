'use client';

import { memo, type KeyboardEvent, type ReactNode } from 'react';
import { Heart, Play } from 'lucide-react';
import { ArtworkImage } from '@/components/ui/ArtworkImage';

export type AudioCardVariant = 'compact' | 'standard' | 'wide';

export interface AudioCardActions {
  play?: ReactNode;
  save?: ReactNode;
}

export interface AudioCardProps {
  artworkUrl?: string | null;
  /** Backwards-compatible alias for artworkUrl. */
  imageUrl?: string | null;
  title: string;
  artist: string;
  duration?: string;
  variant?: AudioCardVariant;
  /** Legacy size aliases are supported for existing consumers. */
  size?: AudioCardVariant | 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  altText?: string;
  onClick?: () => void;
  onPlay?: () => void;
  onSave?: () => void;
  actionButtons?: ReactNode;
  actions?: AudioCardActions;
  className?: string;
}

const variantClasses: Record<AudioCardVariant, string> = {
  compact: 'flex items-center gap-3 rounded-lg p-2',
  standard: 'flex flex-col gap-3 rounded-xl p-3',
  wide: 'flex items-center gap-5 rounded-2xl p-4 sm:p-5',
};

const artworkClasses: Record<AudioCardVariant, string> = {
  compact: 'h-12 w-12 shrink-0 rounded-md',
  standard: 'aspect-square w-full rounded-lg',
  wide: 'h-24 w-24 shrink-0 rounded-xl sm:h-32 sm:w-32',
};

const skeletonClasses: Record<AudioCardVariant, string> = {
  compact: 'h-16 w-full rounded-lg',
  standard: 'h-64 w-full rounded-xl',
  wide: 'h-40 w-full rounded-2xl',
};

function normalizeVariant(
  variant: AudioCardVariant | undefined,
  size: AudioCardProps['size'],
): AudioCardVariant {
  if (variant) return variant;
  if (size === 'sm') return 'compact';
  if (size === 'lg') return 'wide';
  if (size === 'md') return 'standard';
  return size ?? 'standard';
}

const AudioCard = memo(function AudioCard({
  artworkUrl,
  imageUrl,
  title,
  artist,
  duration,
  variant,
  size,
  isLoading = false,
  altText,
  onClick,
  onPlay,
  onSave,
  actionButtons,
  actions,
  className = '',
}: AudioCardProps) {
  const resolvedVariant = normalizeVariant(variant, size);
  const artwork = artworkUrl ?? imageUrl;
  const hasActions = Boolean(onPlay || onSave || actionButtons || actions?.play || actions?.save);

  if (isLoading) {
    return (
      <div
        data-testid="audio-card-skeleton"
        aria-busy="true"
        className={`animate-pulse bg-surface-hover ${skeletonClasses[resolvedVariant]} ${className}`}
      />
    );
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!onClick || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    onClick();
  };

  return (
    <div
      className={`group border border-transparent bg-transparent text-white transition-colors hover:border-border-dark hover:bg-surface-hover focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-black ${variantClasses[resolvedVariant]} ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className={`relative overflow-hidden ${artworkClasses[resolvedVariant]}`}>
        <ArtworkImage
          src={artwork}
          title={title}
          alt={altText || `${title} by ${artist}`}
          width={320}
          height={320}
          className="h-full w-full object-cover"
        />
        {onPlay && (
          <button
            type="button"
            aria-label={`Play ${title}`}
            onClick={(event) => {
              event.stopPropagation();
              onPlay();
            }}
            className="absolute inset-0 m-auto flex h-10 w-10 items-center justify-center rounded-full bg-brand text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <Play size={17} fill="currentColor" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className={`min-w-0 ${resolvedVariant === 'standard' ? 'flex-1' : ''}`}>
        <h3 className="truncate text-sm font-semibold text-white">{title}</h3>
        <p className="truncate text-xs text-on-muted">{artist}</p>
        {duration && <p className="mt-1 text-xs text-on-muted">{duration}</p>}
      </div>

      {hasActions && (
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {actions?.play}
          {onSave && (
            <button
              type="button"
              aria-label={`Save ${title}`}
              onClick={(event) => {
                event.stopPropagation();
                onSave();
              }}
              className="rounded-full p-2 text-on-muted transition-colors hover:bg-black/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <Heart size={18} aria-hidden="true" />
            </button>
          )}
          {actions?.save}
          {actionButtons}
        </div>
      )}
    </div>
  );
});

export default AudioCard;
