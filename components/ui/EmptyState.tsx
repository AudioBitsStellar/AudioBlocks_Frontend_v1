"use client";

import React from "react";

interface EmptyStateProps {
  /** Custom illustration (React node) */
  illustration?: React.ReactNode;
  /** Title text */
  title: string;
  /** Description text */
  description?: string;
  /** Primary action button */
  primaryAction?: {
    label: string;
    onClick: () => void;
  };
  /** Secondary action button */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  /** Heading level for accessibility (default: h2) */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Pre-built illustration variants
 */
export const EmptyStateIllustrations = {
  NoCollections: () => (
    <svg
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="60" cy="60" r="50" fill="#E5E7EB" />
      <rect x="35" y="35" width="50" height="50" rx="4" fill="#9CA3AF" />
      <rect x="40" y="40" width="12" height="12" rx="2" fill="#E5E7EB" />
      <rect x="54" y="40" width="12" height="12" rx="2" fill="#E5E7EB" />
      <rect x="40" y="54" width="12" height="12" rx="2" fill="#E5E7EB" />
      <rect x="54" y="54" width="12" height="12" rx="2" fill="#E5E7EB" />
      <circle cx="60" cy="60" r="8" fill="#E5E7EB" />
    </svg>
  ),
  NoResults: () => (
    <svg
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="60" cy="60" r="50" fill="#E5E7EB" />
      <circle cx="55" cy="55" r="25" stroke="#9CA3AF" strokeWidth="4" fill="none" />
      <line x1="73" y1="73" x2="90" y2="90" stroke="#9CA3AF" strokeWidth="4" strokeLinecap="round" />
    </svg>
  ),
  NoRecentlyPlayed: () => (
    <svg
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="60" cy="60" r="50" fill="#E5E7EB" />
      <circle cx="60" cy="60" r="30" stroke="#9CA3AF" strokeWidth="4" fill="none" />
      <circle cx="60" cy="60" r="5" fill="#9CA3AF" />
      <line x1="60" y1="60" x2="60" y2="38" stroke="#9CA3AF" strokeWidth="3" strokeLinecap="round" />
      <line x1="60" y1="60" x2="75" y2="60" stroke="#9CA3AF" strokeWidth="3" strokeLinecap="round" />
    </svg>
  ),
  NoFollowers: () => (
    <svg
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="60" cy="60" r="50" fill="#E5E7EB" />
      <circle cx="50" cy="45" r="15" fill="#9CA3AF" />
      <path d="M30 85 C30 70 45 65 50 65 C55 65 70 70 70 85" fill="#9CA3AF" />
      <line x1="85" y1="50" x2="85" y2="70" stroke="#9CA3AF" strokeWidth="3" strokeLinecap="round" />
      <line x1="75" y1="60" x2="95" y2="60" stroke="#9CA3AF" strokeWidth="3" strokeLinecap="round" />
    </svg>
  ),
};

export function EmptyState({
  illustration,
  title,
  description,
  primaryAction,
  secondaryAction,
  headingLevel = 2,
  className = "",
}: EmptyStateProps) {
  const Heading = `h${headingLevel}` as keyof JSX.IntrinsicElements;

  return (
    <div
      className={`flex min-h-[300px] flex-col items-center justify-center px-6 py-12 text-center ${className}`}
    >
      <div className="mb-6" aria-hidden="true">
        {illustration ?? <EmptyStateIllustrations.NoResults />}
      </div>

      <Heading className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        {title}
      </Heading>

      {description && (
        <p className="mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
          {description}
        </p>
      )}

      {(primaryAction || secondaryAction) && (
        <div className="mt-6 flex items-center gap-3">
          {primaryAction && (
            <button
              onClick={primaryAction.onClick}
              className="rounded-lg bg-teal-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
            >
              {primaryAction.label}
            </button>
          )}
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
