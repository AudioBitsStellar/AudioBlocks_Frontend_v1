import * as React from 'react';

export function NoFollowersIllustration(props: React.ComponentProps<'svg'>) {
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
      <circle cx="45" cy="38" r="14" className="stroke-border-muted" strokeWidth="2" fill="none" />
      <circle cx="45" cy="38" r="5" className="fill-border-muted/20" />
      <path d="M28 72c0-11 7.6-20 17-20s17 9 17 20" className="stroke-border-muted" strokeWidth="2" fill="none" />
      <circle cx="80" cy="45" r="10" className="stroke-border-muted" strokeWidth="1.5" fill="none" />
      <circle cx="80" cy="45" r="3.5" className="fill-border-muted/15" />
      <path d="M68 68c0-8 5.4-14 12-14s12 6 12 14" className="stroke-border-muted" strokeWidth="1.5" fill="none" />
      <path d="M10 105l6-6M16 105l-6-6" className="stroke-border-muted" strokeWidth="2" strokeLinecap="round" />
      <path d="M108 18l-6 6M114 18l-6-6" className="stroke-border-muted" strokeWidth="2" strokeLinecap="round" />
      <path d="M45 58v-6M42 55h6" className="stroke-brand/50" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
