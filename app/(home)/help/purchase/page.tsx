import { AlertCircle, CheckCircle, XCircle, Mail, ExternalLink } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Purchase Help & Support | AudioBlocks',
  description: 'Get help with NFT purchases, failed transactions, and refund policies on AudioBlocks.',
};

interface StatusItem {
  status: 'success' | 'failed' | 'pending';
  title: string;
  description: string;
  icon: React.ComponentType<{ className: string }>;
  color: string;
  actions: { label: string; url?: string }[];
}

const statuses: StatusItem[] = [
  {
    status: 'success',
    title: 'Purchase Confirmed',
    description: 'Your transaction was confirmed on-chain and the NFT is now in your collection.',
    icon: CheckCircle,
    color: 'text-green-500 bg-green-50 dark:bg-green-950/30',
    actions: [
      { label: 'View Collection', url: '/dashboard/collection' },
      {
        label: 'View Explorer',
        url: 'https://stellar.expert/',
      },
    ],
  },
  {
    status: 'failed',
    title: 'Purchase Failed Before Confirmation',
    description:
      'The transaction did not reach the blockchain. No XLM was deducted. Check the error message and try again.',
    icon: XCircle,
    color: 'text-red-500 bg-red-50 dark:bg-red-950/30',
    actions: [
      { label: 'Common Issues', url: '#common-issues' },
      { label: 'Contact Support' },
    ],
  },
  {
    status: 'pending',
    title: 'Transaction Pending',
    description:
      'Your transaction is awaiting confirmation on the Stellar network. This typically completes within seconds.',
    icon: AlertCircle,
    color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/30',
    actions: [
      { label: 'View Explorer', url: 'https://stellar.expert/' },
      { label: 'Check Explorer Later' },
    ],
  },
];

const commonIssues = [
  {
    question: 'What does "Insufficient balance" mean?',
    answer:
      'Your wallet has enough XLM for the NFT price, but not for both the price and the network fee (usually ~0.01 XLM). Add more XLM to your Stellar account and try again.',
  },
  {
    question: 'I rejected the wallet signature. Can I retry?',
    answer: 'Yes. Click the Buy button again on the NFT page and approve the signature when your wallet prompts you.',
  },
  {
    question: 'My transaction says it failed on-chain. What happened?',
    answer:
      'This is rare. It usually means your account does not meet Stellar account reserve requirements. See the Refund Policy for details. Contact support with your transaction hash.',
  },
  {
    question: 'I bought the NFT but do not see it in my collection.',
    answer:
      'If the transaction succeeded, the NFT should appear immediately. If still missing after a few minutes, your wallet may need to refresh the trustline. Contact support with your wallet address and transaction hash.',
  },
  {
    question: 'What is the network fee? Can it change?',
    answer:
      'Stellar network fees are typically 0.00001 XLM per operation. The fee is calculated during transaction preparation and shown before you confirm. AudioBlocks does not add additional fees; proceeds go to the artist/seller.',
  },
  {
    question: 'Can a purchase be refunded after confirmation?',
    answer:
      'No. Blockchain transactions are final and irreversible once confirmed on-chain. This is by design and applies to all Soroban purchases. See the full Refund Policy for details.',
  },
];

export default function PurchaseHelpPage() {
  return (
    <article className="mx-auto max-w-4xl space-y-12 px-4 py-10">
      <header>
        <h1 className="text-3xl font-bold sm:text-4xl">Purchase Help & Support</h1>
        <p className="mt-3 text-on-muted">
          Find answers about NFT purchases, what happens when things go wrong, and how to get in touch.
        </p>
      </header>

      <section>
        <h2 className="mb-6 text-2xl font-semibold">Your Purchase Status</h2>
        <div className="space-y-4">
          {statuses.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.status}
                className={`rounded-lg border border-border-dark p-4 sm:p-6 ${item.color}`}
              >
                <div className="mb-3 flex items-start gap-3">
                  <Icon className="mt-1 shrink-0" size={24} />
                  <div className="flex-1">
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="mt-1 text-sm">{item.description}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {item.actions.map((action) => (
                    <div key={action.label}>
                      {action.url ? (
                        <a
                          href={action.url}
                          target={action.url.startsWith('http') ? '_blank' : undefined}
                          rel={action.url.startsWith('http') ? 'noopener noreferrer' : undefined}
                          className="inline-flex items-center gap-2 rounded px-3 py-2 text-sm font-medium transition-colors hover:opacity-80 bg-white/20 text-current"
                        >
                          {action.label}
                          {action.url?.startsWith('http') && <ExternalLink size={14} />}
                        </a>
                      ) : (
                        <button className="rounded px-3 py-2 text-sm font-medium transition-colors bg-white/20 text-current hover:opacity-80">
                          {action.label}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section id="common-issues">
        <h2 className="mb-6 text-2xl font-semibold">Common Issues & Questions</h2>
        <div className="space-y-4">
          {commonIssues.map((issue, index) => (
            <details
              key={index}
              className="group rounded-lg border border-border-dark p-4 sm:p-6 hover:border-brand/50 transition-colors"
            >
              <summary className="cursor-pointer font-semibold text-white group-open:text-brand transition-colors">
                {issue.question}
              </summary>
              <p className="mt-3 text-on-muted leading-relaxed">{issue.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-6 text-2xl font-semibold">More Resources</h2>
        <div className="space-y-3">
          <p>
            <a
              href="/legal/terms"
              className="text-brand underline hover:text-pink-700 transition-colors"
            >
              Terms of Service
            </a>
            {' '} — Full legal terms for AudioBlocks
          </p>
          <p>
            <a
              href="/docs/REFUND_POLICY.md"
              className="text-brand underline hover:text-pink-700 transition-colors"
            >
              Refund Policy
            </a>
            {' '} — Detailed refund and blockchain finality information
          </p>
          <p>
            <a
              href="/help/wallet"
              className="text-brand underline hover:text-pink-700 transition-colors"
            >
              Wallet Setup Guide
            </a>
            {' '} — How to create and secure a Stellar wallet
          </p>
        </div>
      </section>

      <section>
        <h2 className="mb-6 text-2xl font-semibold">Still Need Help?</h2>
        <div className="rounded-lg border-2 border-brand/30 bg-brand/5 p-6 sm:p-8">
          <div className="mb-4 flex items-center gap-3">
            <Mail className="text-brand" size={28} />
            <h3 className="text-xl font-semibold">Contact Our Support Team</h3>
          </div>
          <p className="mb-4 text-on-muted">
            If you cannot find the answer to your question, our support team is here to help.
          </p>
          <div className="space-y-2">
            <p>
              <strong>Email:</strong>{' '}
              <a href="mailto:support@audioblocks.dev" className="text-brand underline hover:text-pink-700">
                support@audioblocks.dev
              </a>
            </p>
            <p className="text-sm text-on-muted">
              Please include your wallet address (starts with G), transaction hash if available, and details about what happened.
            </p>
          </div>
        </div>
      </section>
    </article>
  );
}
