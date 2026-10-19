import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Sidebar from '@/components/common/dashboard/sidebar';

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}));

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}));

const renderSidebar = () => render(<Sidebar openMobile={false} onOpenMobileChange={() => {}} />);

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Dashboard sidebar feature flags (#637)', () => {
  it('hides the Community entry while the community flag is off', () => {
    vi.stubEnv('NEXT_PUBLIC_FEATURE_COMMUNITY_VOTING', 'false');

    renderSidebar();

    expect(screen.queryByRole('link', { name: /community/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /explore/i })).toBeInTheDocument();
  });

  it('restores the Community entry when the community flag is on', () => {
    vi.stubEnv('NEXT_PUBLIC_FEATURE_COMMUNITY_VOTING', 'true');

    renderSidebar();

    expect(screen.getByRole('link', { name: /community/i })).toHaveAttribute(
      'href',
      '/dashboard/community'
    );
  });
});
