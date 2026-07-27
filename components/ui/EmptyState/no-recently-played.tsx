import * as React from 'react';

export function NoRecentlyPlayedIllustration(props: React.ComponentProps<'svg'>) {
  return (
    <svg
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <circle cx="60" cy="55" r="35" className="stroke-border-muted" strokeWidth="2" fill="none" />
      <path d="M60 35v20l15 9" className="stroke-brand" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="60" cy="55" r="6" className="fill-brand/30" />
      <rect x="48" y="78" width="24" height="3" rx="1.5" className="fill-on-muted/20" />
      <rect x="52" y="84" width="16" height="2" rx="1" className="fill-on-muted/15" />
      <path
        d="M30 105l-6-6M36 105l-6-6"
        className="stroke-border-muted"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M90 15l-6 6M96 15l-6-6"
        className="stroke-border-muted"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M75 20l4-4M20 70l4-4" className="stroke-on-muted/30" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
