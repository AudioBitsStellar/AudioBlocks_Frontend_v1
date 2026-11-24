import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Footer from '@/layouts/footer';
import { SOCIAL_LINKS } from '@/lib/constants';

describe('Footer Component (#709)', () => {
  it('renders all navigation and legal links pointing to real routes without href="#"', () => {
    const { container } = render(<Footer />);

    const links = container.querySelectorAll('a');
    expect(links.length).toBeGreaterThan(0);

    // No footer link should point to #
    links.forEach((link) => {
      const href = link.getAttribute('href');
      expect(href).not.toBe('#');
      expect(href).toBeTruthy();
    });

    // Check specific navigation routes
    const marketplaceLink = screen.getByRole('link', { name: 'Marketplace' });
    expect(marketplaceLink).toHaveAttribute('href', '/marketPlace');

    const artistHubLink = screen.getByRole('link', { name: 'Artist Hub' });
    expect(artistHubLink).toHaveAttribute('href', '/artist-hub');

    const faqLink = screen.getByRole('link', { name: 'FAQ' });
    expect(faqLink).toHaveAttribute('href', '/collective#faq');

    const privacyPolicyLink = screen.getByRole('link', { name: 'Privacy Policy' });
    expect(privacyPolicyLink).toHaveAttribute('href', '/legal/privacy');

    const termsLink = screen.getByRole('link', { name: 'Terms of Service' });
    expect(termsLink).toHaveAttribute('href', '/legal/terms');
  });

  it('renders social media icon links with accessible aria-labels and safe external attributes', () => {
    render(<Footer />);

    SOCIAL_LINKS.filter((item) => !!item.href.trim()).forEach((item) => {
      const link = screen.getByRole('link', { name: item.label });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', item.href);

      if (item.href.startsWith('http')) {
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      } else if (item.href.startsWith('mailto:')) {
        expect(link).not.toHaveAttribute('target');
      }
    });
  });
});
