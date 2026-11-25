import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PlayerControls } from '@/components/player/PlayerControls';
import { VolumeControl } from '@/components/player/VolumeControl';

describe('Player Accessibility Controls (#20)', () => {
  describe('VolumeControl', () => {
    it('announces "Mute" when audio is unmuted with volume > 0', () => {
      render(
        <VolumeControl
          isMuted={false}
          volume={0.8}
          onToggleMute={vi.fn()}
          onVolumeChange={vi.fn()}
        />
      );

      const muteBtn = screen.getByRole('button', { name: 'Mute' });
      expect(muteBtn).toBeInTheDocument();
      expect(muteBtn).toHaveAttribute('aria-label', 'Mute');
      expect(muteBtn).toHaveAttribute('aria-pressed', 'false');
    });

    it('announces "Unmute" when audio is muted', () => {
      render(
        <VolumeControl
          isMuted={true}
          volume={0.8}
          onToggleMute={vi.fn()}
          onVolumeChange={vi.fn()}
        />
      );

      const unmuteBtn = screen.getByRole('button', { name: 'Unmute' });
      expect(unmuteBtn).toBeInTheDocument();
      expect(unmuteBtn).toHaveAttribute('aria-label', 'Unmute');
      expect(unmuteBtn).toHaveAttribute('aria-pressed', 'true');
    });

    it('announces "Unmute" when volume is 0 even if isMuted is false', () => {
      render(
        <VolumeControl
          isMuted={false}
          volume={0}
          onToggleMute={vi.fn()}
          onVolumeChange={vi.fn()}
        />
      );

      const unmuteBtn = screen.getByRole('button', { name: 'Unmute' });
      expect(unmuteBtn).toBeInTheDocument();
      expect(unmuteBtn).toHaveAttribute('aria-label', 'Unmute');
    });
  });

  describe('PlayerControls', () => {
    const defaultProps = {
      isPlaying: false,
      isBuffering: false,
      shuffle: false,
      repeat: false,
      onTogglePlay: vi.fn(),
      onPrev: vi.fn(),
      onNext: vi.fn(),
      onToggleShuffle: vi.fn(),
      onToggleRepeat: vi.fn(),
    };

    it('announces "Play" when paused and "Pause" when playing', () => {
      const { rerender } = render(<PlayerControls {...defaultProps} isPlaying={false} />);
      expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();

      rerender(<PlayerControls {...defaultProps} isPlaying={true} />);
      expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    });

    it('announces "Loading" when audio is buffering', () => {
      render(<PlayerControls {...defaultProps} isBuffering={true} />);
      expect(screen.getByRole('button', { name: 'Loading' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Loading' })).toBeDisabled();
    });

    it('announces shuffle state reflecting current mode', () => {
      const { rerender } = render(<PlayerControls {...defaultProps} shuffle={false} />);
      const shuffleBtnOff = screen.getByRole('button', { name: 'Enable shuffle' });
      expect(shuffleBtnOff).toHaveAttribute('aria-pressed', 'false');

      rerender(<PlayerControls {...defaultProps} shuffle={true} />);
      const shuffleBtnOn = screen.getByRole('button', { name: 'Disable shuffle' });
      expect(shuffleBtnOn).toHaveAttribute('aria-pressed', 'true');
    });

    it('announces repeat state reflecting current mode', () => {
      const { rerender } = render(<PlayerControls {...defaultProps} repeat={false} />);
      const repeatBtnOff = screen.getByRole('button', { name: 'Enable repeat' });
      expect(repeatBtnOff).toHaveAttribute('aria-pressed', 'false');

      rerender(<PlayerControls {...defaultProps} repeat={true} />);
      const repeatBtnOn = screen.getByRole('button', { name: 'Disable repeat' });
      expect(repeatBtnOn).toHaveAttribute('aria-pressed', 'true');
    });
  });
});
