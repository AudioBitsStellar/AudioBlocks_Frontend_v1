'use client';

import * as React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export interface ImageGalleryProps {
  images: (string | null | undefined)[];
  onImageClick?: (index: number) => void;
  className?: string;
  placeholder?: string;
}

function ImageCell({
  src,
  index,
  onImageClick,
  placeholder,
  isOverflowCell,
  overflowCount,
}: {
  src: string | null | undefined;
  index: number;
  onImageClick?: (index: number) => void;
  placeholder: string;
  isOverflowCell: boolean;
  overflowCount: number;
}) {
  const [error, setError] = React.useState(false);
  const hasImage = src && !error;

  return (
    <button
      type="button"
      className={cn(
        'relative aspect-square overflow-hidden rounded-md',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface'
      )}
      onClick={() => onImageClick?.(index)}
      tabIndex={0}
      aria-label={
        isOverflowCell
          ? `${overflowCount} more items`
          : `Gallery image ${index + 1}`
      }
    >
      {hasImage ? (
        <Image
          src={src}
          alt={`Gallery image ${index + 1}`}
          fill
          sizes="(max-width: 640px) 50vw, 25vw"
          className="object-cover"
          onError={() => setError(true)}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-brand/20 to-surface-elevated" />
      )}
      {isOverflowCell && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <span className="text-lg font-bold text-white">+{overflowCount}</span>
        </div>
      )}
    </button>
  );
}

export function ImageGallery({
  images,
  onImageClick,
  className,
  placeholder = '/placeholder-cover.svg',
}: ImageGalleryProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const validImages = images.filter(Boolean) as string[];
  const displayImages = validImages.slice(0, 4);
  const overflowCount = Math.max(0, validImages.length - 4);

  const grid = [
    displayImages[0] ?? null,
    displayImages[1] ?? null,
    displayImages[2] ?? null,
    displayImages[3] ?? null,
  ];

  if (!isVisible) {
    return (
      <div
        ref={containerRef}
        className={cn('grid grid-cols-2 gap-0.5 rounded-md overflow-hidden', className)}
        style={{ aspectRatio: '1 / 1' }}
        aria-hidden="true"
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn('grid grid-cols-2 gap-0.5 rounded-md overflow-hidden', className)}
      style={{ aspectRatio: '1 / 1' }}
      role="list"
      aria-label="Image gallery"
    >
      {grid.map((src, i) => (
        <ImageCell
          key={i}
          src={src}
          index={i}
          onImageClick={onImageClick}
          placeholder={placeholder}
          isOverflowCell={i === 3 && overflowCount > 0}
          overflowCount={overflowCount}
        />
      ))}
    </div>
  );
}

export default ImageGallery;
