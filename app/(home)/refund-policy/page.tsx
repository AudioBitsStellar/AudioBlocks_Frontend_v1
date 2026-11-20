import type { Metadata } from 'next';

const TITLE = 'Refund Policy | AudioBlocks';
const DESCRIPTION =
  'When a purchase on AudioBlocks can be refunded, how to request one, and how long it takes.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: 'website',
  },
};

const sections = [
  {
    heading: 'What you are buying',
    content: (
      <p>
        Purchases on AudioBlocks are on-chain transactions on the Stellar network: you are buying
        an NFT that represents a license to a release, or a collectible, directly from the
        artist or collective that listed it. Once a purchase transaction is confirmed on-chain,
        it cannot be reversed by AudioBlocks — there is no central ledger entry we can edit or
        void, only the blockchain record itself.
      </p>
    ),
  },
  {
    heading: 'When a refund is available',
    content: (
      <>
        <p>We will refund or make you whole in these cases:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Failed or duplicate transaction.</strong> Your wallet was charged (XLM moved
            and a network fee was paid) but you did not receive the NFT, or you were charged more
            than once for the same item because of an app or network error.
          </li>
          <li>
            <strong>Listing error on our side.</strong> The price, availability, or description
            shown in the app did not match what the on-chain listing actually offered, and you
            purchased based on the incorrect information.
          </li>
          <li>
            <strong>Confirmed fraud or unauthorized use.</strong> Someone used your account or
            wallet to make a purchase without your authorization, reported before the item has
            been resold or transferred.
          </li>
        </ul>
      </>
    ),
  },
  {
    heading: 'When a refund is not available',
    content: (
      <>
        <p>Because purchases settle on a public blockchain, we generally cannot refund:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>A completed, correctly-executed purchase you simply changed your mind about.</li>
          <li>
            Network fees paid to the Stellar network itself — these are not collected by
            AudioBlocks and are not ours to return.
          </li>
          <li>
            Loss caused by sending funds to the wrong address, losing access to your wallet, or
            sharing your recovery phrase with someone else.
          </li>
          <li>Purchases of an item that has already been resold or transferred to another wallet.</li>
        </ul>
      </>
    ),
  },
  {
    heading: 'How to request a refund',
    content: (
      <>
        <p>
          Contact us within <strong>14 days</strong> of the transaction at{' '}
          <a className="underline" href="mailto:support@audioblocks.app">
            support@audioblocks.app
          </a>{' '}
          with your wallet&rsquo;s public address, the transaction hash, and a short description
          of the problem. You can find the transaction hash in your purchase confirmation or on a
          Stellar block explorer.
        </p>
        <p>
          We review requests and respond within <strong>5 business days</strong>. If a refund is
          approved, we send XLM back to the purchasing wallet; we cannot send it anywhere else.
          Approved refunds are issued within <strong>10 business days</strong> of approval.
        </p>
      </>
    ),
  },
  {
    heading: 'Artist and collective payouts',
    content: (
      <p>
        Where an artist or collective has already received proceeds from a purchase we later
        refund, AudioBlocks reconciles that difference directly with the artist or collective —
        you are not asked to recover the refund from them yourself.
      </p>
    ),
  },
];

export default function RefundPolicyPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-8 px-4 py-10">
      <header>
        <h1 className="text-3xl font-bold sm:text-4xl">Refund Policy</h1>
        <p className="mt-3 text-on-muted">Last updated: 2026-11-20</p>
      </header>
      <div className="space-y-8">
        {sections.map(({ heading, content }) => (
          <section key={heading} className="space-y-3">
            <h2 className="text-xl font-semibold">{heading}</h2>
            <div className="space-y-3 leading-relaxed text-on-muted">{content}</div>
          </section>
        ))}
      </div>
    </article>
  );
}
