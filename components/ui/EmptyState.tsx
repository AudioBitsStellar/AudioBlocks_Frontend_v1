import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
}

export interface EmptyStateProps {
  illustration?: React.ReactNode;
  title: string;
  description?: string;
  primaryAction?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  className?: string;
  children?: React.ReactNode;
}

export function EmptyState({
  illustration,
  title,
  description,
  primaryAction,
  secondaryAction,
  headingLevel = 2,
  className,
  children,
}: EmptyStateProps) {
  const HeadingTag = `h${headingLevel}` as keyof JSX.IntrinsicElements;

  return (
    <div
      className={cn(
        'flex min-h-[280px] flex-col items-center justify-center px-6 py-12 text-center',
        className
      )}
      role="region"
      aria-label={title}
    >
      <div className="mx-auto flex max-w-sm flex-col items-center gap-4">
        {illustration && (
          <div aria-hidden="true" className="mb-2">
            {illustration}
          </div>
        )}
        <HeadingTag className="text-lg font-semibold text-foreground">
          {title}
        </HeadingTag>
        {description && (
          <p className="text-sm text-on-muted">{description}</p>
        )}
        {(primaryAction || secondaryAction) && (
          <div className="mt-2 flex items-center gap-3">
            {primaryAction && (
              <Button onClick={primaryAction.onClick}>
                {primaryAction.label}
              </Button>
            )}
            {secondaryAction && (
              <Button variant="outline" onClick={secondaryAction.onClick}>
                {secondaryAction.label}
              </Button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export default EmptyState;
