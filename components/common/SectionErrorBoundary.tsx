'use client';

import React, { Component, ReactNode, ErrorInfo } from 'react';
import {
  AlertTriangle,
  RefreshCw,
  RotateCw,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const UNKNOWN_ERROR_MESSAGE = 'An unknown error occurred';

/**
 * Normalizes any value caught by the error boundary into a proper Error
 * instance. React error boundaries can receive null/undefined or non-Error
 * values depending on how the error was thrown, so this guards against
 * crashing the boundary itself while rendering the fallback UI.
 */
function normalizeError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  if (error === null || error === undefined) {
    console.warn('[SectionErrorBoundary] Caught a null/undefined error.');
    return new Error(UNKNOWN_ERROR_MESSAGE);
  }

  if (typeof error === 'string') {
    console.warn('[SectionErrorBoundary] Caught a non-Error string value:', error);
    return new Error(error.trim() || UNKNOWN_ERROR_MESSAGE);
  }

  console.warn('[SectionErrorBoundary] Caught an unexpected error shape:', error);
  try {
    const message =
      typeof error === 'number' || typeof error === 'boolean'
        ? String(error)
        : UNKNOWN_ERROR_MESSAGE;
    return new Error(message || UNKNOWN_ERROR_MESSAGE);
  } catch {
    return new Error(UNKNOWN_ERROR_MESSAGE);
  }
}

export interface SectionErrorBoundaryProps {
  children: ReactNode;
  fallbackMessage?: string;
  sectionName?: string;
  supportHref?: string;
  minHeight?: string | number;
  className?: string;
  onRetry?: () => void;
}

interface SectionErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  remountKey: number;
  showDetails: boolean;
}

export default class SectionErrorBoundary extends Component<
  SectionErrorBoundaryProps,
  SectionErrorBoundaryState
> {
  constructor(props: SectionErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      remountKey: 0,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: unknown): Partial<SectionErrorBoundaryState> {
    return { hasError: true, error: normalizeError(error) };
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    const normalizedError = normalizeError(error);
    this.setState({ errorInfo, error: normalizedError });
    // Always log error to console for debugging
    console.error(
      `[SectionErrorBoundary${this.props.sectionName ? `: ${this.props.sectionName}` : ''}]`,
      normalizedError,
      errorInfo.componentStack
    );
  }

  handleRetry = () => {
    if (this.props.onRetry) {
      this.props.onRetry();
    }
    this.setState((prevState) => ({
      hasError: false,
      error: null,
      errorInfo: null,
      remountKey: prevState.remountKey + 1,
      showDetails: false,
    }));
  };

  handleReloadPage = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  toggleDetails = () => {
    this.setState((prevState) => ({ showDetails: !prevState.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      const {
        fallbackMessage,
        sectionName,
        supportHref = 'mailto:support@audioblocks.com',
        minHeight = '200px',
        className = '',
      } = this.props;

      const displaySection = sectionName ? sectionName : 'section';
      const errorMessage = fallbackMessage ?? this.state.error?.message ?? UNKNOWN_ERROR_MESSAGE;

      const minHeightStyle = typeof minHeight === 'number' ? `${minHeight}px` : minHeight;

      return (
        <div
          className={`flex flex-col items-center justify-center p-6 rounded-xl bg-surface border border-border-dark text-center w-full transition-all ${className}`}
          style={{ minHeight: minHeightStyle }}
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-brand/10 text-brand mb-3">
            <AlertTriangle size={24} />
          </div>

          <h3 className="text-base font-semibold text-white mb-1">
            {sectionName ? `${sectionName} Error` : 'Section Error'}
          </h3>

          <p className="text-sm text-on-muted max-w-md mb-6">{errorMessage}</p>

          <div className="flex flex-wrap items-center justify-center gap-3 mb-4">
            <button
              onClick={this.handleRetry}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand hover:bg-pink-700 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:ring-offset-background"
              aria-label={`Retry loading ${displaySection}`}
            >
              <RefreshCw size={14} className="animate-none" />
              Retry Section
            </button>

            <button
              onClick={this.handleReloadPage}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-200 bg-surface-input hover:bg-surface-hover border border-border-dark rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand"
              aria-label="Reload entire page"
            >
              <RotateCw size={14} />
              Reload Page
            </button>

            <a
              href={supportHref}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors focus:outline-none focus:underline"
              target={supportHref.startsWith('http') ? '_blank' : undefined}
              rel={supportHref.startsWith('http') ? 'noopener noreferrer' : undefined}
            >
              <HelpCircle size={14} />
              Contact Support
            </a>
          </div>

          <div className="w-full max-w-lg mt-2">
            <button
              onClick={this.toggleDetails}
              className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200 transition-colors focus:outline-none"
              aria-expanded={this.state.showDetails}
            >
              {this.state.showDetails ? (
                <>
                  <ChevronUp size={14} /> Hide technical details
                </>
              ) : (
                <>
                  <ChevronDown size={14} /> Show technical details
                </>
              )}
            </button>

            {this.state.showDetails && (
              <div className="mt-3 p-3 text-left bg-black/40 border border-border-dark rounded-lg overflow-x-auto text-xs font-mono text-gray-300 max-h-48">
                <p className="font-bold text-red-400 mb-1">
                  {this.state.error?.name || 'Error'}:{' '}
                  {this.state.error?.message || 'Unknown error'}
                </p>
                {this.state.errorInfo?.componentStack && (
                  <pre className="whitespace-pre-wrap text-[11px] text-gray-400 leading-relaxed">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
                {this.state.error?.stack && !this.state.errorInfo?.componentStack && (
                  <pre className="whitespace-pre-wrap text-[11px] text-gray-400 leading-relaxed">
                    {this.state.error.stack}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return <React.Fragment key={this.state.remountKey}>{this.props.children}</React.Fragment>;
  }
}
