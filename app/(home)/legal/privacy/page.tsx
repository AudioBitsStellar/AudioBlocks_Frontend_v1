import type { Metadata } from 'next';

const TITLE = 'Privacy Policy | AudioBlocks';
const DESCRIPTION =
  'Privacy policy covering account data, wallet addresses, and analytics consent on AudioBlocks.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: 'website',
    images: [{ url: '/logo.png', width: 1200, height: 630, alt: 'AudioBlocks' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/logo.png'],
  },
};

/**
 * Privacy Policy (#709).
 *
 * Outlines AudioBlocks' data handling practices, cookie and analytics consent,
 * public blockchain data, and user controls over privacy settings.
 */
export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-on-muted">
      <div className="mb-8 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
        <strong className="text-amber-100">Draft — pending legal review.</strong> This page
        describes how data, analytics consent, and wallet interactions are handled on AudioBlocks.
        It has not yet been reviewed or approved by legal counsel and is not a final legal document.
      </div>

      <h1 className="mb-6 text-3xl font-bold text-white md:text-4xl">Privacy Policy</h1>

      <section className="mb-8">
        <h2 className="mb-2 text-xl font-semibold text-white">1. Information We Collect</h2>
        <p>
          AudioBlocks collects information you provide directly, such as your profile information,
          display name, and email address when you sign up. We also record public blockchain wallet
          addresses used to interact with smart contracts on the Stellar network.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-xl font-semibold text-white">2. Blockchain Transparency</h2>
        <p>
          Transactions on the Stellar network—including track purchases, NFT mints, and marketplace
          resales—are public by nature. Blockchain data cannot be modified, deleted, or made private
          by AudioBlocks.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-xl font-semibold text-white">3. Analytics &amp; Cookies</h2>
        <p>
          We use analytics cookies only with your explicit consent to understand how users interact
          with the platform and improve the listening experience. You can modify your analytics
          consent at any time via your privacy settings.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-xl font-semibold text-white">4. Your Privacy Controls</h2>
        <p>
          You can review and update your privacy preferences, including analytics consent and
          account linking, on the settings page under Privacy Settings.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-xl font-semibold text-white">5. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time to reflect changes in our legal or
          operational practices. Updated versions will be posted on this page.
        </p>
      </section>
    </div>
  );
}
