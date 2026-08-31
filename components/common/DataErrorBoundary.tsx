'use client';

import { Component, ErrorInfo, Fragment, ReactNode } from 'react';
import ErrorState from '@/components/common/ErrorState';

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
  resetKey: number;
}

export default class DataErrorBoundary extends Component<
  DataErrorBoundaryProps,
  DataErrorBoundaryState
> {
  state: DataErrorBoundaryState = { hasError: false, resetKey: 0 };

  static getDerivedStateFromError(): Partial<DataErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    if (process.env.NODE_ENV === 'development') {
      console.error(
        `[DataErrorBoundary${this.props.name ? `: ${this.props.name}` : ''}]`,
        error,
        info.componentStack
      );
    }
  }

  handleRetry = () => {
    this.props.onRetry?.();
    this.setState((prev) => ({ hasError: false, resetKey: prev.resetKey + 1 }));
  };

  render() {
    if (this.state.hasError) {
      const { name, variant = 'generic', className } = this.props;
      return (
        <ErrorState
          className={className}
          message={name ? `We couldn't load ${name}. Please try again.` : undefined}
          onRetry={this.handleRetry}
          title={name ? `${name} failed to load` : undefined}
          variant={variant}
        />
      );
    }

    return <Fragment key={this.state.resetKey}>{this.props.children}</Fragment>;
  }
}
