import type { ReactNode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SectionWrapper } from '@/components/common/dashboard/SectionWrapper';

const { useSectionDataMock } = vi.hoisted(() => ({
  useSectionDataMock: vi.fn(),
}));

vi.mock('@/hooks/useSectionData', () => ({
  useSectionData: useSectionDataMock,
}));

vi.mock('react-slick', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

let intersectionCallback: IntersectionObserverCallback | undefined;
let observerOptions: IntersectionObserverInit | undefined;

class MockIntersectionObserver {
  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    intersectionCallback = callback;
    observerOptions = options;
  }

  observe() {}
  disconnect() {}
  unobserve() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

interface Item {
  id: string;
  label: string;
}

const items: Item[] = Array.from({ length: 16 }, (_, index) => ({
  id: `item-${index + 1}`,
  label: `Item ${index + 1}`,
}));

function renderSection() {
  return render(
    <SectionWrapper<Item>
      infiniteScroll
      carousel={false}
      fetchFn={vi.fn()}
      queryKey={['test']}
      renderEmpty={() => <p>No items</p>}
      renderItem={(item) => <p>{item.label}</p>}
      title="Items"
    />
  );
}

describe('SectionWrapper infinite scroll', () => {
  beforeEach(() => {
    intersectionCallback = undefined;
    observerOptions = undefined;
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
    useSectionDataMock.mockReturnValue({
      data: items,
      isEmpty: false,
      isError: false,
      isLoading: false,
      refetch: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    window.sessionStorage.clear();
  });

  it('loads the next batch when the sentinel intersects and indicates the end', async () => {
    renderSection();

    expect(screen.getAllByText(/^Item \d+$/)).toHaveLength(8);
    expect(intersectionCallback).toBeDefined();
    expect(observerOptions?.rootMargin).toBe('0px 0px 200px 0px');

    act(() =>
      intersectionCallback?.(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver
      )
    );

    expect(screen.getByText('Loading more items...')).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText(/^Item \d+$/)).toHaveLength(16));
    expect(screen.getByText("You've reached the end.")).toBeInTheDocument();
  });

  it('does not schedule concurrent batches for repeated observer notifications', async () => {
    renderSection();
    const trigger = () =>
      intersectionCallback?.(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver
      );

    act(() => {
      trigger();
      trigger();
    });

    await waitFor(() => expect(screen.getAllByText(/^Item \d+$/)).toHaveLength(16));
    expect(screen.getByText("You've reached the end.")).toBeInTheDocument();
  });

  it('restores previously revealed items when returning to Explore', async () => {
    window.sessionStorage.setItem(
      'audioblocks_explore_visible_counts',
      JSON.stringify({ '["test"]': 16 })
    );

    renderSection();

    await waitFor(() => expect(screen.getAllByText(/^Item \d+$/)).toHaveLength(16));
  });

  it('provides an inline retry when Explore data fails to load', () => {
    const refetch = vi.fn();
    useSectionDataMock.mockReturnValue({
      data: [],
      isEmpty: false,
      isError: true,
      isLoading: false,
      refetch,
    });
    renderSection();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(refetch).toHaveBeenCalledOnce();
  });
});
