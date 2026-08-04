import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import WaveformDisplay from '@/components/ui/WaveformDisplay';

describe('WaveformDisplay Component', () => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  it('renders canvas element with proper accessibility attributes', () => {
    render(<WaveformDisplay currentTime={30} duration={120} height={100} />);

    const slider = screen.getByRole('slider');
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveAttribute('aria-label', 'Audio waveform playback position');
    expect(slider).toHaveAttribute('aria-valuenow', '30');
    expect(slider).toHaveAttribute('aria-valuemax', '120');
  });

  it('clamps height between 60px and 200px', () => {
    const { container, rerender } = render(<WaveformDisplay height={30} />);
    let wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.height).toBe('60px');

    rerender(<WaveformDisplay height={300} />);
    wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.height).toBe('200px');
  });

  it('handles keyboard navigation (ArrowLeft / ArrowRight)', () => {
    const onSeek = vi.fn();
    render(<WaveformDisplay progress={0.5} onSeek={onSeek} />);

    const slider = screen.getByRole('slider');
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(onSeek).toHaveBeenCalledWith(0.55, undefined);

    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(onSeek).toHaveBeenCalledWith(0.45, undefined);
  });
});
