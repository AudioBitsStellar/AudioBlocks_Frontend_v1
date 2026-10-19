import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AudioVisualizer } from '@/components/AudioVisualizer';

describe('AudioVisualizer', () => {
  let mockAnalyserNode: Partial<AnalyserNode>;
  let animationFrameId: number;

  beforeEach(() => {
    mockAnalyserNode = {
      frequencyBinCount: 128,
      getByteFrequencyData: vi.fn(),
    };

    animationFrameId = 0;
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((cb: FrameRequestCallback) => {
        animationFrameId++;
        return animationFrameId;
      })
    );

    vi.stubGlobal(
      'cancelAnimationFrame',
      vi.fn()
    );

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should render canvas when enabled and not reduced-motion', () => {
    const { container } = render(
      <AudioVisualizer
        analyserNode={mockAnalyserNode as AnalyserNode}
        isEnabled={true}
      />
    );

    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('should not render when disabled', () => {
    const { container } = render(
      <AudioVisualizer
        analyserNode={mockAnalyserNode as AnalyserNode}
        isEnabled={false}
      />
    );

    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeInTheDocument();
  });

  it('should respect prefers-reduced-motion', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    const { container } = render(
      <AudioVisualizer
        analyserNode={mockAnalyserNode as AnalyserNode}
        isEnabled={true}
      />
    );

    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeInTheDocument();
  });

  it('should handle visibility change and pause animation', async () => {
    const { rerender } = render(
      <AudioVisualizer
        analyserNode={mockAnalyserNode as AnalyserNode}
        isEnabled={true}
      />
    );

    const eventListeners = new Map<string, Function[]>();
    document.addEventListener = vi.fn((event: string, listener: any) => {
      if (!eventListeners.has(event)) {
        eventListeners.set(event, []);
      }
      eventListeners.get(event)?.push(listener);
    });

    rerender(
      <AudioVisualizer
        analyserNode={mockAnalyserNode as AnalyserNode}
        isEnabled={true}
      />
    );

    expect(document.addEventListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
  });

  it('should cleanup animation frame on unmount', () => {
    const { unmount } = render(
      <AudioVisualizer
        analyserNode={mockAnalyserNode as AnalyserNode}
        isEnabled={true}
      />
    );

    unmount();

    expect(cancelAnimationFrame).toHaveBeenCalled();
  });

  it('should have correct canvas dimensions', () => {
    const { container } = render(
      <AudioVisualizer
        analyserNode={mockAnalyserNode as AnalyserNode}
        isEnabled={true}
      />
    );

    const canvas = container.querySelector('canvas') as HTMLCanvasElement;
    expect(canvas.width).toBe(800);
    expect(canvas.height).toBe(200);
  });
});
