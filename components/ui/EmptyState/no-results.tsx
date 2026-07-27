import * as React from 'react';

export function NoResultsIllustration(props: React.ComponentProps<'svg'>) {
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
      <circle cx="50" cy="50" r="30" className="stroke-border-muted" strokeWidth="2" fill="none" />
      <circle cx="50" cy="50" r="12" className="fill-border-muted/20" />
      <path d="M72 72l18 18" className="stroke-on-muted" strokeWidth="3" strokeLinecap="round" />
      <rect x="30" y="40" width="40" height="3" rx="1.5" className="fill-on-muted/20" />
      <rect x="35" y="48" width="30" height="2" rx="1" className="fill-on-muted/15" />
      <rect x="38" y="54" width="24" height="2" rx="1" className="fill-on-muted/10" />
      <path d="M20 95l8-8M28 95l-8-8" className="stroke-border-muted" strokeWidth="2" strokeLinecap="round" />
      <path d="M100 25l-8-8M108 25l-8-8" className="stroke-border-muted" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
