'use client';

import { Component, ReactNode, ErrorInfo } from 'react';
import ErrorState from './ErrorState';

type Props = {
  children: ReactNode;
  fallbackMessage?: string;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

/**
 * Wrap any dashboard section with this boundary. On render errors it shows
 * ErrorState with a retry button that remounts the child subtree.
 *
 * Usage:
 *   <SectionErrorBoundary fallbackMessage="Failed to load Collections.">
 *     <Collections />
 *   </SectionErrorBoundary>
 */
export default class SectionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[SectionErrorBoundary]', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorState
          message={
            this.props.fallbackMessage ??
            this.state.error?.message ??
            'This section failed to load.'
          }
          onRetry={this.handleRetry}
        />
      );
    }
    return this.props.children;
  }
}
