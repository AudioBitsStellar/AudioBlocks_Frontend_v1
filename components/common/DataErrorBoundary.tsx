'use client';

import { Component, ErrorInfo, Fragment, ReactNode } from 'react';
import ErrorState from '@/components/common/ErrorState';
import { reportError } from '@/lib/reportError';

/** An error that may carry the correlation id of the request that failed (#837). */
type RequestTrackedError = Error & { requestId?: string };

/**
 * Lightweight React error boundary for a single dashboard data section (#40).
 *
 * Its fallback is the shared `ErrorState` component, so every wrapped section
 * gets the same retry UI. `Retry` clears the error and remounts the subtree
 * (via `resetKey`), which re-runs whatever data fetch the children do; pass
 * `onRetry` to also invalidate a query / refetch explicitly.
 *
 * See `docs/ERROR_BOUNDARIES.md` for how to apply this to the Collection,
 * Community, and Playlist pages.
 */
interface DataErrorBoundaryProps {
  children: ReactNode;
  /** Section name, used in the fallback heading ("<name> couldn't load"). */
  name?: string;
  /** `ErrorState` visual variant. */
  variant?: 'generic' | 'network';
  /** Called on retry, before the subtree remounts (e.g. `query.refetch()`). */
  onRetry?: () => void;
  className?: string;
}

interface DataErrorBoundaryState {
  hasError: boolean;
  error: RequestTrackedError | null;
  resetKey: number;
}

export default class DataErrorBoundary extends Component<
  DataErrorBoundaryProps,
  DataErrorBoundaryState
> {
  state: DataErrorBoundaryState = { hasError: false, error: null, resetKey: 0 };

  static getDerivedStateFromError(error: unknown): Partial<DataErrorBoundaryState> {
    return { hasError: true, error: error instanceof Error ? error : null };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    const requestId = error instanceof Error ? (error as RequestTrackedError).requestId : undefined;
    reportError(error, {
      tags: {
        boundary: 'dashboard',
        ...(this.props.name ? { section: this.props.name } : {}),
        ...(requestId ? { request_id: requestId } : {}),
      },
      extra: {
        componentStack: info.componentStack,
      },
    });
  }

  handleRetry = () => {
    this.props.onRetry?.();
    this.setState((prev) => ({ hasError: false, error: null, resetKey: prev.resetKey + 1 }));
  };

  render() {
    if (this.state.hasError) {
      const { name, variant = 'generic', className } = this.props;
      return (
        <ErrorState
          className={className}
          message={name ? `We couldn't load ${name}. Please try again.` : undefined}
          requestId={this.state.error?.requestId}
          title={name ? `${name} failed to load` : undefined}
          variant={variant}
          onRetry={this.handleRetry}
        />
      );
    }

    return <Fragment key={this.state.resetKey}>{this.props.children}</Fragment>;
  }
}
