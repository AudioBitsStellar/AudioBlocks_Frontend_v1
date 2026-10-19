"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";

interface ImageGalleryProps {
  /** Array of image URLs */
  images: string[];
  /** Click handler for the gallery */
  onClick?: () => void;
  /** Alt text prefix */
  altPrefix?: string;
  /** Whether to show overflow count */
  showOverflow?: boolean;
}

/**
 * Responsive 2x2 image gallery for collection artwork with overflow indicator
 */
export function ImageGallery({
  images,
  onClick,
  altPrefix = "Artwork",
  showOverflow = true,
}: ImageGalleryProps) {
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Show up to 4 images
  const displayImages = images.slice(0, 4);
  const overflowCount = images.length - 4;

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.getAttribute("data-index") || "0", 10);
            setLoadedImages((prev) => new Set([...prev, index]));
            observerRef.current?.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "50px" }
    );

    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  const renderCell = (imageUrl: string | undefined, index: number) => {
    const isLast = index === 3;
    const showOverflowBadge = isLast && overflowCount > 0 && showOverflow;

    return (
      <div
        key={index}
        data-index={index}
        ref={(el) => {
          if (el && observerRef.current) {
            observerRef.current.observe(el);
          }
        }}
        className="relative aspect-square overflow-hidden bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800"
      >
        {imageUrl ? (
          <>
            <Image
              src={imageUrl}
              alt={`${altPrefix} ${index + 1}`}
              fill
              sizes="(max-width: 640px) 50vw, 25vw"
              className={`object-cover transition-opacity duration-300 ${
                loadedImages.has(index) ? "opacity-100" : "opacity-0"
              }`}
              onLoad={() => setLoadedImages((prev) => new Set([...prev, index]))}
            />
            {/* Gradient fallback for missing images */}
            {!loadedImages.has(index) && (
              <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800" />
            )}
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800" />
        )}

        {/* Overflow badge */}
        {showOverflowBadge && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="text-lg font-bold text-white">
              +{overflowCount}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      className={`grid grid-cols-2 gap-1 overflow-hidden rounded-lg ${
        onClick ? "cursor-pointer transition-transform hover:scale-[1.02]" : ""
      }`}
    >
      {displayImages.map((url, i) => renderCell(url, i))}

      {/* Fill empty cells if less than 4 images */}
      {displayImages.length < 4 &&
        Array.from({ length: 4 - displayImages.length }).map((_, i) =>
          renderCell(undefined, displayImages.length + i)
        )}
    </div>
  );
}
