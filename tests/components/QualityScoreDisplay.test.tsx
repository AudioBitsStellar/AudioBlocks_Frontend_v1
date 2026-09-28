import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import QualityScoreDisplay from '@/components/ai/QualityScoreDisplay';

/**
 * Tests for QualityScoreDisplay component (#413)
 * Artist-facing quality score display with tier badges and visual indicators
 */

describe('QualityScoreDisplay', () => {
  describe('Basic Rendering', () => {
    it('renders quality score with tier badge', () => {
      render(<QualityScoreDisplay score={85} />);

      expect(screen.getByRole('region', { name: /quality score display/i })).toBeInTheDocument();
      expect(screen.getByText('85')).toBeInTheDocument();
      expect(screen.getByLabelText(/score: 85 out of 100/i)).toBeInTheDocument();
    });

    it('displays gold tier for high scores (80+)', () => {
      render(<QualityScoreDisplay score={85} />);

      expect(screen.getByText(/excellent quality/i)).toBeInTheDocument();
      expect(screen.getByText(/meets the highest production standards/i)).toBeInTheDocument();
    });

    it('displays silver tier for good scores (65-79)', () => {
      render(<QualityScoreDisplay score={70} />);

      expect(screen.getByText(/good quality/i)).toBeInTheDocument();
      expect(screen.getByText(/meets platform standards/i)).toBeInTheDocument();
    });

    it('displays needs-improvement tier for low scores (<65)', () => {
      render(<QualityScoreDisplay score={50} />);

      expect(screen.getByText(/needs improvement/i)).toBeInTheDocument();
      expect(screen.getByText(/requires quality improvements/i)).toBeInTheDocument();
    });

    it('displays genre information when provided', () => {
      render(<QualityScoreDisplay score={75} genre="Electronic" />);

      expect(screen.getByText(/genre:/i)).toBeInTheDocument();
      expect(screen.getByText('Electronic')).toBeInTheDocument();
    });
  });

  describe('Score Delta Display', () => {
    it('shows improvement indicator for positive delta', () => {
      render(<QualityScoreDisplay score={80} previousScore={70} />);

      expect(screen.getByLabelText(/score changed by \+10 points/i)).toBeInTheDocument();
      expect(screen.getByText('+10')).toBeInTheDocument();
    });

    it('shows decline indicator for negative delta', () => {
      render(<QualityScoreDisplay score={65} previousScore={75} />);

      expect(screen.getByLabelText(/score changed by -10 points/i)).toBeInTheDocument();
      expect(screen.getByText('-10')).toBeInTheDocument();
    });

    it('does not show delta when previousScore is not provided', () => {
      render(<QualityScoreDisplay score={75} />);

      expect(screen.queryByText(/\+/)).not.toBeInTheDocument();
      expect(screen.queryByText(/-\d/)).not.toBeInTheDocument();
    });
  });

  describe('Progress Bar', () => {
    it('renders progress bar with correct width', () => {
      render(<QualityScoreDisplay score={60} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '60');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });

    it('clamps progress bar width to 0-100 range', () => {
      const { rerender } = render(<QualityScoreDisplay score={-10} />);
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '-10');

      rerender(<QualityScoreDisplay score={150} />);
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '150');
    });
  });

  describe('Genre Threshold Display', () => {
    it('shows threshold information when showDetails is true', () => {
      render(
        <QualityScoreDisplay score={75} genreThreshold={0.7} genre="Hip Hop" showDetails={true} />
      );

      expect(screen.getByText(/hip hop minimum threshold/i)).toBeInTheDocument();
      expect(screen.getByText('70/100')).toBeInTheDocument();
      expect(screen.getByText('75/100 ✓')).toBeInTheDocument();
    });

    it('indicates when score does not meet threshold', () => {
      render(
        <QualityScoreDisplay score={60} genreThreshold={0.7} genre="Classical" showDetails={true} />
      );

      expect(screen.getByText(/60\/100 ✗/)).toBeInTheDocument();
      expect(
        screen.getByText(/your track is 10 points below the classical genre minimum/i)
      ).toBeInTheDocument();
    });

    it('does not show threshold info when showDetails is false', () => {
      render(<QualityScoreDisplay score={75} genreThreshold={0.7} showDetails={false} />);

      expect(screen.queryByText(/minimum threshold/i)).not.toBeInTheDocument();
    });

    it('renders threshold marker on progress bar', () => {
      render(<QualityScoreDisplay score={75} genreThreshold={0.7} showDetails={true} />);

      expect(screen.getByLabelText(/genre threshold at 70/i)).toBeInTheDocument();
    });
  });

  describe('Learn More Action', () => {
    it('calls onLearnMore when button is clicked', () => {
      const onLearnMore = vi.fn();
      render(<QualityScoreDisplay score={70} onLearnMore={onLearnMore} />);

      const button = screen.getByRole('button', { name: /learn how to improve/i });
      fireEvent.click(button);

      expect(onLearnMore).toHaveBeenCalledTimes(1);
    });

    it('does not render button when onLearnMore is not provided', () => {
      render(<QualityScoreDisplay score={70} />);

      expect(
        screen.queryByRole('button', { name: /learn how to improve/i })
      ).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for screen readers', () => {
      render(<QualityScoreDisplay score={82} genre="Jazz" />);

      expect(screen.getByRole('region', { name: /quality score display/i })).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toHaveAccessibleName();
    });

    it('decorative icons are hidden from screen readers', () => {
      const { container } = render(<QualityScoreDisplay score={85} />);
      const icons = container.querySelectorAll('[aria-hidden="true"]');
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('handles score of 0', () => {
      render(<QualityScoreDisplay score={0} />);
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('handles score of 100', () => {
      render(<QualityScoreDisplay score={100} />);
      expect(screen.getByText('100')).toBeInTheDocument();
    });

    it('rounds fractional scores', () => {
      render(<QualityScoreDisplay score={75.7} />);
      expect(screen.getByText('76')).toBeInTheDocument();
    });
  });
});
