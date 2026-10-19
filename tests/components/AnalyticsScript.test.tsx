import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AnalyticsScript from '@/components/AnalyticsScript';
import { resetAnalyticsConsentMemory, setAnalyticsConsent } from '@/lib/analyticsConsent';

vi.mock('next/script', () => ({
  default: ({ id, src, strategy }: { id: string; src: string; strategy: string }) => (
    <div data-async="true" data-src={src} data-strategy={strategy} data-testid={id} />
  ),
}));

describe('AnalyticsScript', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetAnalyticsConsentMemory();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('loads analytics lazily after the first user interaction once accepted', () => {
    setAnalyticsConsent('accepted');
    render(<AnalyticsScript />);

    expect(screen.queryByTestId('analytics-script')).not.toBeInTheDocument();

    fireEvent.pointerDown(window);

    expect(screen.getByTestId('analytics-script')).toHaveAttribute('data-strategy', 'lazyOnload');
    expect(screen.getByTestId('analytics-script')).toHaveAttribute('data-async', 'true');
    expect(screen.getByTestId('analytics-script')).toHaveAttribute(
      'data-src',
      'https://www.google-analytics.com/analytics.js'
    );
  });

  it('also starts analytics after keyboard interaction', () => {
    setAnalyticsConsent('accepted');
    render(<AnalyticsScript />);

    fireEvent.keyDown(window, { key: 'Tab' });

    expect(screen.getByTestId('analytics-script')).toHaveAttribute('data-strategy', 'lazyOnload');
  });

  it('does not load analytics when tracking is disabled', () => {
    vi.stubEnv('NEXT_PUBLIC_ANALYTICS_ENABLED', 'false');
    setAnalyticsConsent('accepted');

    render(<AnalyticsScript />);
    fireEvent.pointerDown(window);

    expect(screen.queryByTestId('analytics-script')).not.toBeInTheDocument();
  });

  it('never loads analytics without consent, even after interaction (#597)', () => {
    render(<AnalyticsScript />);

    fireEvent.pointerDown(window);
    fireEvent.keyDown(window, { key: 'Tab' });

    expect(screen.queryByTestId('analytics-script')).not.toBeInTheDocument();
  });

  it('never loads analytics after the visitor rejects them', () => {
    setAnalyticsConsent('rejected');

    render(<AnalyticsScript />);
    fireEvent.pointerDown(window);

    expect(screen.queryByTestId('analytics-script')).not.toBeInTheDocument();
  });

  it('unloads analytics when consent is revoked on the page', () => {
    setAnalyticsConsent('accepted');
    render(<AnalyticsScript />);
    fireEvent.pointerDown(window);
    expect(screen.getByTestId('analytics-script')).toBeInTheDocument();

    act(() => {
      setAnalyticsConsent('rejected');
    });

    expect(screen.queryByTestId('analytics-script')).not.toBeInTheDocument();
  });
});
