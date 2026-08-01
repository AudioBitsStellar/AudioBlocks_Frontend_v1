'use client';

// #130 — ArtworkImage wraps next/image with a gradient placeholder so null,
// undefined, or 404 artwork URLs never produce console errors or broken-image
// browser chrome. Gradient colors are deterministically derived from the
// track title so the same track always renders the same placeholder.

import { useState } from 'react';
import Image from 'next/image';

// ── Gradient helpers ──────────────────────────────────────────────────────────

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function titleToGradient(title: string): string {
  const h1 = hashString(title) % 360;
  const h2 = (h1 + 137) % 360; // golden-angle offset keeps colors distinct
  return `linear-gradient(135deg, hsl(${h1},65%,45%), hsl(${h2},70%,35%))`;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface ArtworkImageProps {
  src: string | null | undefined;
  /** Used to derive the gradient placeholder when src is absent or broken. */
  title: string;
  alt?: string;
  width?: number;
  height?: number;
  className?: string;
  fill?: boolean;
}

export function ArtworkImage({
  src,
  title,
  alt,
  width = 200,
  height = 200,
  className,
  fill = false,
}: ArtworkImageProps) {
  const gradient = titleToGradient(title || 'untitled');
  const [useFallback, setUseFallback] = useState(!src);

  if (useFallback) {
    return (
      <div
        aria-label={alt ?? title}
        className={className}
        role="img"
        style={{
          background: gradient,
          width: fill ? '100%' : width,
          height: fill ? '100%' : height,
          borderRadius: 'inherit',
        }}
      />
    );
  }

  return (
    <Image
      alt={alt ?? title}
      className={className}
      fill={fill}
      height={fill ? undefined : height}
      src={src as string}
      width={fill ? undefined : width}
      onError={() => setUseFallback(true)}
    />
  );
}
