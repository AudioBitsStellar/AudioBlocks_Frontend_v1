import React, { memo, useState } from 'react';
import Image from 'next/image';

interface AudioCardProps {
  title: string;
  artist: string;
  imageUrl: string;
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
  const [imgSrc, setImgSrc] = useState(imageUrl);

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
      <Image
        src={imgSrc}
        alt={altText || `${title} by ${artist}`}
        onError={() => setImgSrc('/placeholder-cover.svg')}
        width={100}
        height={100}
      />
      <div>{title}</div>
      <div>{artist}</div>
    </button>
  );
});

export default AudioCard;
