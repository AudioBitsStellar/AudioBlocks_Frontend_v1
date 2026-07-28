import React, { memo } from 'react';
import { ArtworkImage } from '@/components/ui/ArtworkImage';

interface AudioCardProps {
  title: string;
  artist: string;
  imageUrl: string | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  altText?: string;
  onClick?: () => void;
}

const AudioCard: React.FC<AudioCardProps> = memo(({
  title,
  artist,
  imageUrl,
  size = 'md',
  isLoading = false,
  altText,
  onClick,
}) => {
  if (isLoading) {
    return <div data-testid="audio-card-skeleton" className={`skeleton size-${size}`}></div>;
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.();
    }
  };

  return (
    <button
      className={`audio-card size-${size}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      {/* #130 — ArtworkImage handles null/undefined/404 src without console errors */}
      <ArtworkImage
        src={imageUrl}
        title={title}
        alt={altText || `${title} by ${artist}`}
        width={100}
        height={100}
      />
      <div>{title}</div>
      <div>{artist}</div>
    </button>
  );
});

export default AudioCard;
