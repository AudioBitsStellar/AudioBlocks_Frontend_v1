import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import QualityFeedbackDetails, {
  type QualityFeedbackItem,
} from '@/components/ai/QualityFeedbackDetails';

/**
 * Tests for QualityFeedbackDetails component (#414)
 * Shows detailed technical quality feedback like clipping, distortion, etc.
 */

describe('QualityFeedbackDetails', () => {
  const mockFeedback: QualityFeedbackItem[] = [
    {
      id: '1',
      type: 'clipping',
      severity: 'critical',
      title: 'Audio Clipping Detected',
      description: 'Audio peaks exceed 0dB, causing distortion',
      metric: 'Peak: +2.3 dBFS',
      recommendation: 'Reduce gain or apply limiting to prevent clipping',
    },
    {
      id: '2',
      type: 'low-bitrate',
      severity: 'warning',
      title: 'Low Bitrate',
      description: 'Audio bitrate is below recommended standards',
      metric: '128 kbps (recommend 320 kbps)',
      recommendation: 'Re-export at higher quality settings',
    },
    {
      id: '3',
      type: 'dynamic-range',
      severity: 'info',
      title: 'Good Dynamic Range',
      description: 'Track maintains healthy dynamic range',
      metric: 'DR: 12',
    },
  ];

  describe('Basic Rendering', () => {
    it('renders feedback section with title', () => {
      render(<QualityFeedbackDetails feedback={mockFeedback} />);

      expect(screen.getByRole('region', { name: /quality feedback details/i })).toBeInTheDocument();
      expect(screen.getByText(/technical quality analysis/i)).toBeInTheDocument();
    });

    it('displays correct feedback count', () => {
      render(<QualityFeedbackDetails feedback={mockFeedback} />);

      expect(screen.getByText('3 items detected')).toBeInTheDocument();
    });

    it('accepts custom title', () => {
      render(<QualityFeedbackDetails feedback={mockFeedback} title="Custom Analysis" />);

      expect(screen.getByText('Custom Analysis')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows no issues message when feedback array is empty', () => {
      render(<QualityFeedbackDetails feedback={[]} />);

      expect(screen.getByText(/no issues detected/i)).toBeInTheDocument();
      expect(screen.getByText(/meets all technical quality standards/i)).toBeInTheDocument();
    });

    it('displays success icon in empty state', () => {
      const { container } = render(<QualityFeedbackDetails feedback={[]} />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Feedback Items', () => {
    it('renders all feedback items with correct titles', () => {
      render(<QualityFeedbackDetails feedback={mockFeedback} />);

      expect(screen.getByText('Audio Clipping Detected')).toBeInTheDocument();
      expect(screen.getByText('Low Bitrate')).toBeInTheDocument();
      expect(screen.getByText('Good Dynamic Range')).toBeInTheDocument();
    });

    it('displays feedback descriptions', () => {
      render(<QualityFeedbackDetails feedback={mockFeedback} />);

      expect(screen.getByText(/audio peaks exceed 0dB/i)).toBeInTheDocument();
      expect(screen.getByText(/audio bitrate is below recommended/i)).toBeInTheDocument();
    });

    it('shows metrics when provided', () => {
      render(<QualityFeedbackDetails feedback={mockFeedback} />);

      expect(screen.getByText(/peak: \+2\.3 dbfs/i)).toBeInTheDocument();
      expect(screen.getByText(/128 kbps/i)).toBeInTheDocument();
      expect(screen.getByText(/dr: 12/i)).toBeInTheDocument();
    });

    it('displays recommendations when showRecommendations is true', () => {
      render(<QualityFeedbackDetails feedback={mockFeedback} showRecommendations={true} />);

      expect(screen.getByText(/reduce gain or apply limiting/i)).toBeInTheDocument();
      expect(screen.getByText(/re-export at higher quality/i)).toBeInTheDocument();
    });

    it('hides recommendations when showRecommendations is false', () => {
      render(<QualityFeedbackDetails feedback={mockFeedback} showRecommendations={false} />);

      expect(screen.queryByText(/reduce gain or apply limiting/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/re-export at higher quality/i)).not.toBeInTheDocument();
    });
  });

  describe('Severity Grouping', () => {
    it('groups feedback by severity', () => {
      render(<QualityFeedbackDetails feedback={mockFeedback} />);

      expect(screen.getByText(/critical issues/i)).toBeInTheDocument();
      expect(screen.getByText(/warnings/i)).toBeInTheDocument();
      expect(screen.getByText(/additional information/i)).toBeInTheDocument();
    });

    it('displays critical issue count in summary', () => {
      render(<QualityFeedbackDetails feedback={mockFeedback} />);

      expect(screen.getByText('1 Critical')).toBeInTheDocument();
    });

    it('displays warning count in summary', () => {
      render(<QualityFeedbackDetails feedback={mockFeedback} />);

      expect(screen.getByText('1 Warning')).toBeInTheDocument();
    });

    it('handles multiple warnings correctly', () => {
      const multipleWarnings: QualityFeedbackItem[] = [
        {
          id: '1',
          type: 'poor-mixing',
          severity: 'warning',
          title: 'Poor Mixing',
          description: 'Mix balance issues detected',
        },
        {
          id: '2',
          type: 'noise',
          severity: 'warning',
          title: 'Background Noise',
          description: 'Excessive noise floor',
        },
      ];

      render(<QualityFeedbackDetails feedback={multipleWarnings} />);

      expect(screen.getByText('2 Warnings')).toBeInTheDocument();
    });
  });

  describe('Severity Labels', () => {
    it('shows Critical Issue label for critical severity', () => {
      const criticalFeedback: QualityFeedbackItem[] = [
        {
          id: '1',
          type: 'clipping',
          severity: 'critical',
          title: 'Critical Test',
          description: 'Test description',
        },
      ];

      render(<QualityFeedbackDetails feedback={criticalFeedback} />);

      expect(screen.getByText(/critical issue/i)).toBeInTheDocument();
    });

    it('shows Warning label for warning severity', () => {
      const warningFeedback: QualityFeedbackItem[] = [
        {
          id: '1',
          type: 'low-bitrate',
          severity: 'warning',
          title: 'Warning Test',
          description: 'Test description',
        },
      ];

      render(<QualityFeedbackDetails feedback={warningFeedback} />);

      expect(screen.getByText(/^warning$/i)).toBeInTheDocument();
    });

    it('shows Information label for info severity', () => {
      const infoFeedback: QualityFeedbackItem[] = [
        {
          id: '1',
          type: 'other',
          severity: 'info',
          title: 'Info Test',
          description: 'Test description',
        },
      ];

      render(<QualityFeedbackDetails feedback={infoFeedback} />);

      expect(screen.getByText(/information/i)).toBeInTheDocument();
    });

    it('shows Passed label for success severity', () => {
      const successFeedback: QualityFeedbackItem[] = [
        {
          id: '1',
          type: 'dynamic-range',
          severity: 'success',
          title: 'Success Test',
          description: 'Test description',
        },
      ];

      render(<QualityFeedbackDetails feedback={successFeedback} />);

      expect(screen.getByText(/passed/i)).toBeInTheDocument();
    });
  });

  describe('Issue Types', () => {
    const issueTypes: Array<QualityFeedbackItem['type']> = [
      'clipping',
      'distortion',
      'low-bitrate',
      'poor-mixing',
      'dynamic-range',
      'frequency-imbalance',
      'noise',
      'phase-issues',
      'loudness',
      'other',
    ];

    it('supports all defined issue types', () => {
      const allTypeFeedback: QualityFeedbackItem[] = issueTypes.map((type, index) => ({
        id: `${index}`,
        type,
        severity: 'info' as const,
        title: `${type} test`,
        description: 'Test description',
      }));

      render(<QualityFeedbackDetails feedback={allTypeFeedback} />);

      allTypeFeedback.forEach((item) => {
        expect(screen.getByText(`${item.type} test`)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper region role', () => {
      render(<QualityFeedbackDetails feedback={mockFeedback} />);

      expect(screen.getByRole('region', { name: /quality feedback details/i })).toBeInTheDocument();
    });

    it('decorative icons are hidden from screen readers', () => {
      const { container } = render(<QualityFeedbackDetails feedback={mockFeedback} />);
      const icons = container.querySelectorAll('[aria-hidden="true"]');
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('handles feedback item without metric', () => {
      const noMetricFeedback: QualityFeedbackItem[] = [
        {
          id: '1',
          type: 'noise',
          severity: 'warning',
          title: 'Background Noise',
          description: 'Noise detected',
        },
      ];

      render(<QualityFeedbackDetails feedback={noMetricFeedback} />);

      expect(screen.getByText('Background Noise')).toBeInTheDocument();
      expect(screen.getByText('Noise detected')).toBeInTheDocument();
    });

    it('handles feedback item without recommendation', () => {
      const noRecFeedback: QualityFeedbackItem[] = [
        {
          id: '1',
          type: 'loudness',
          severity: 'info',
          title: 'Loudness Info',
          description: 'Loudness is optimal',
        },
      ];

      render(<QualityFeedbackDetails feedback={noRecFeedback} showRecommendations={true} />);

      expect(screen.getByText('Loudness Info')).toBeInTheDocument();
      expect(screen.queryByText(/recommendation/i)).not.toBeInTheDocument();
    });
  });
});
