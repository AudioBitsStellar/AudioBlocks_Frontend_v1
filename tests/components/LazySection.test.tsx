import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import LazySection from '@/components/common/LazySection';

describe('LazySection (#154)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('keeps the reserved height until the observer reports the section nearby', () => {
    const observe = vi.fn();
    const disconnect = vi.fn();
    const observer = vi.fn(function (this: object) {
      Object.assign(this, { observe, disconnect });
    });
    vi.stubGlobal('IntersectionObserver', observer);

    const { container } = render(
      <LazySection minHeight={360}>
        <p>Deferred content</p>
      </LazySection>
    );

    expect(screen.queryByText('Deferred content')).not.toBeInTheDocument();
    expect(container.firstChild).toHaveStyle({ minHeight: '360px' });
    expect(observer).toHaveBeenCalledWith(expect.any(Function), { rootMargin: '200px' });
    expect(observe).toHaveBeenCalledWith(container.firstChild);
  });

  it('renders content when IntersectionObserver is unavailable', async () => {
    vi.stubGlobal('IntersectionObserver', undefined);

    render(
      <LazySection minHeight={360}>
        <p>Deferred content</p>
      </LazySection>
    );

    expect(await screen.findByText('Deferred content')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Deferred content')).toBeVisible());
  });
});
