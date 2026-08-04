import * as React from 'react';

export function NoCollectionsIllustration(props: React.ComponentProps<'svg'>) {
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
      <rect x="10" y="30" width="100" height="70" rx="8" className="fill-border-muted/30" />
      <rect x="10" y="30" width="100" height="70" rx="8" className="stroke-border-muted" strokeWidth="2" fill="none" />
      <rect x="20" y="42" width="36" height="36" rx="4" className="fill-border-muted/20" />
      <rect x="20" y="42" width="36" height="36" rx="4" className="stroke-border-muted" strokeWidth="1.5" fill="none" />
      <rect x="62" y="42" width="36" height="10" rx="2" className="fill-on-muted/30" />
      <rect x="62" y="56" width="24" height="6" rx="2" className="fill-on-muted/20" />
      <circle cx="38" cy="60" r="6" className="fill-brand/40" />
      <path d="M35 60h6M38 57v6" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="40" y="80" width="60" height="2" rx="1" className="fill-border-muted/20" />
      <rect x="15" y="34" width="20" height="4" rx="2" className="fill-on-muted/40" />
    </svg>
  );
}
