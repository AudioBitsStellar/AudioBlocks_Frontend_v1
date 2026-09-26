import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import QualityStandardsCriteria from '@/components/common/quality-standards/QualityStandardsCriteria';
import QualityStandardsHero from '@/components/common/quality-standards/QualityStandardsHero';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: React.ComponentProps<'a'>) => <a href={href}>{children}</a>,
}));

describe('QualityStandardsHero', () => {
  it('explains the quality filter and links to the artist hub', () => {
    render(<QualityStandardsHero />);

    expect(
      screen.getByRole('heading', { name: /track is graded against clear quality standards/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/Mastra AI and NVIDIA/i)).toBeInTheDocument();

    const cta = screen.getByRole('link', { name: /Upload Your Track/i });
    expect(cta).toHaveAttribute('href', '/artist-hub');
  });
});

describe('QualityStandardsCriteria', () => {
  it('describes each quality criterion', () => {
    render(<QualityStandardsCriteria />);

    expect(
      screen.getByRole('heading', { name: /what we check on every upload/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Clarity' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Dynamic range' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Noise floor' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Distortion' })).toBeInTheDocument();
  });

  it('explains how remasters are compared against the original upload', () => {
    render(<QualityStandardsCriteria />);

    expect(
      screen.getByRole('heading', { name: /remasters are never assessed alone/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/compares it against the analysis of your original upload/i)
    ).toBeInTheDocument();
  });
});
