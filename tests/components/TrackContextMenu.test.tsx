import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TrackContextMenu from '@/components/ui/TrackContextMenu';

describe('TrackContextMenu Component', () => {
  const dummyTrack = {
    id: 'track-123',
    title: 'Starlight Waves',
    artist: 'Luna',
  };

  it('renders children initially without menu', () => {
    render(
      <TrackContextMenu track={dummyTrack}>
        <div>Track Card</div>
      </TrackContextMenu>
    );

    expect(screen.getByText('Track Card')).toBeInTheDocument();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('opens context menu on right click and shows items', async () => {
    const onPlayNext = vi.fn();
    render(
      <TrackContextMenu track={dummyTrack} onPlayNext={onPlayNext}>
        <div data-testid="track-card">Track Card</div>
      </TrackContextMenu>
    );

    const trigger = screen.getByTestId('track-card');
    fireEvent.contextMenu(trigger, { clientX: 100, clientY: 150 });

    const menu = screen.getByRole('menu');
    expect(menu).toBeInTheDocument();
    expect(screen.getByText('Play Next')).toBeInTheDocument();
    expect(screen.getByText('Add to Queue')).toBeInTheDocument();
    expect(screen.getByText('Save to Collection')).toBeInTheDocument();
    expect(screen.getByText('Share')).toBeInTheDocument();
    expect(screen.getByText('View Artist')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Play Next'));
    expect(onPlayNext).toHaveBeenCalledWith(dummyTrack);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('closes on Escape key', () => {
    render(
      <TrackContextMenu track={dummyTrack}>
        <div data-testid="track-card">Track Card</div>
      </TrackContextMenu>
    );

    fireEvent.contextMenu(screen.getByTestId('track-card'));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
