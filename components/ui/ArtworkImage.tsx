'use client';

// #130 — ArtworkImage wraps next/image with a gradient placeholder so null,
// undefined, or 404 artwork URLs never produce console errors or broken-image
// browser chrome. Gradient colors are deterministically derived from the
// track title so the same track always renders the same placeholder.
//
// #595 — IPFS artwork (ipfs://, bare CIDs, gateway URLs) is tried on the
// configured gateway, then the public gateway; other URLs (S3/CDN) load as-is.
// Any failure then falls back to /placeholder-cover.svg, and finally the gradient.

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { ipfsGatewayUrls } from '@/lib/ipfs';

export const PLACEHOLDER_COVER = '/placeholder-cover.svg';

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
  /** Passed to next/image; useful with `fill` so the right size is requested. */
  sizes?: string;
}

export function ArtworkImage({
  src,
  title,
  alt,
  width = 200,
  height = 200,
  className,
  fill = false,
  sizes,
}: ArtworkImageProps) {
  const gradient = titleToGradient(title || 'untitled');
  // Ordered load attempts; each onError advances to the next one.
  const sources = useMemo(() => {
    if (!src) return [];
    const gatewayUrls = ipfsGatewayUrls(src);
    return [...(gatewayUrls.length > 0 ? gatewayUrls : [src]), PLACEHOLDER_COVER];
  }, [src]);
  // Failures are keyed by src so a new src starts again from its first source.
  const [failed, setFailed] = useState({ src, count: 0 });
  const failedCount = failed.src === src ? failed.count : 0;
  const currentSrc = sources[failedCount];

  if (!currentSrc) {
    return (
      <div
        // Still names the item, but says plainly that its artwork is not available.
        aria-label={`Cover art for ${title || alt || 'this item'} unavailable`}
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
      sizes={sizes}
      src={currentSrc}
      width={fill ? undefined : width}
      onError={() => setFailed({ src, count: failedCount + 1 })}
    />
  );
}
