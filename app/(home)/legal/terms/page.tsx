import type { Metadata } from 'next';

const TITLE = 'Terms of Service | AudioBlocks';
const DESCRIPTION =
  'Terms covering purchases, NFT ownership and royalty payouts on AudioBlocks.';

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
 * Terms of Service (#861).
 *
 * Covers the three areas flagged for legal review: purchases, NFT ownership
 * and royalty payouts. This copy is a draft written from how the product
 * actually behaves (see `components/common/BuyButton.tsx` and
 * `components/marketplace/ListNFTDialog.tsx`); it has not been reviewed or
 * signed off by counsel, and should not be treated as final legal wording
 * until it has been. Previously the footer's "Terms of Service" link pointed
 * nowhere (`href="#"`), which is itself a compliance gap for a platform that
 * processes on-chain purchases.
 */
export default function TermsOfServicePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-on-muted">
      <div className="mb-8 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
        <strong className="text-amber-100">Draft — pending legal review.</strong> This page
        describes how purchases, NFT ownership and royalties currently work on AudioBlocks. It has
        not yet been reviewed or approved by legal counsel and is not a final statement of the
        company&apos;s terms.
      </div>

      <h1 className="mb-6 text-3xl font-bold text-white md:text-4xl">Terms of Service</h1>

      <section className="mb-8">
        <h2 className="mb-2 text-xl font-semibold text-white">1. Purchases</h2>
        <p>
          Buying a track or collection on AudioBlocks submits a transaction on the Stellar network
          using the Soroban smart contract shown at confirmation. Prices are quoted in XLM and do
          not include the network fee, which is shown separately before you confirm. Once a
          purchase transaction is confirmed on-chain, it is final: blockchain transactions cannot
          be reversed, and AudioBlocks cannot issue a refund by cancelling or undoing the
          transaction itself.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-xl font-semibold text-white">2. NFT ownership</h2>
        <p>
          When you buy a track, you receive an NFT recorded on the Stellar network representing
          that purchase. Owning the NFT does not transfer copyright in the underlying recording or
          composition; the artist retains those rights unless a separate, explicit agreement says
          otherwise. The NFT itself can be held, resold on the marketplace, or transferred like any
          other on-chain asset, subject to network fees and the terms in effect at the time.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-xl font-semibold text-white">3. Royalties</h2>
        <p>
          Listing an NFT for resale may apply a royalty, paid on-chain to the original artist, as a
          percentage of the resale price. The exact royalty rate for a given listing is shown in
          the listing flow before you confirm a resale; it is set by the smart contract, not
          negotiated after the fact. AudioBlocks does not guarantee a particular royalty amount,
          resale price, or that a resale royalty will always be collectible on every marketplace a
          token may later appear on.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-xl font-semibold text-white">4. No investment advice</h2>
        <p>
          Nothing on AudioBlocks is investment, legal or tax advice, and no statement on the
          platform should be read as a promise of future value, return, or resale price for any
          track or NFT.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-xl font-semibold text-white">5. Changes to these terms</h2>
        <p>
          These terms may change as the product and its legal review evolve. Material changes will
          be reflected on this page.
        </p>
      </section>
    </div>
  );
}
