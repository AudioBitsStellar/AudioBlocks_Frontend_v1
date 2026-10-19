import { Download, KeyRound, Wallet, Coins } from 'lucide-react';
import TestnetFunding from '@/components/help/TestnetFunding';
import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'Getting a Stellar wallet and XLM | AudioBlocks',
  description:
    'Create and back up a Stellar wallet, connect Freighter, and fund a Testnet account with Friendbot.',
};
const steps = [
  {
    title: 'What is a wallet?',
    Icon: Wallet,
    content: (
      <>
        <p>
          A wallet lets you approve transactions and prove that a Stellar account belongs to you.
          Your public address starts with G and can be shared to receive XLM. Your private keys
          authorize transactions.
        </p>
        <p>
          AudioBlocks never holds your wallet keys. Your wallet asks you to review and approve each
          transaction.
        </p>
      </>
    ),
  },
  {
    title: 'Install a Stellar wallet',
    Icon: Download,
    content: (
      <>
        <p>
          Install{' '}
          <a
            className="underline"
            href="https://www.freighter.app/"
            rel="noopener noreferrer"
            target="_blank"
          >
            Freighter from its official website
          </a>
          , open the extension and follow its account setup instructions. This guide connects to
          Freighter.
        </p>
        <p>
          Other Stellar wallets include xBull, LOBSTR and Albedo. AudioBlocks integration with
          additional wallets is being developed; only choose a wallet offered by the app’s
          connection dialog. An Ethereum address or MetaMask account cannot receive Stellar XLM.
        </p>
      </>
    ),
  },
  {
    title: 'Create an account and back it up',
    Icon: KeyRound,
    content: (
      <>
        <p>
          Choose “Create a new wallet” in Freighter, set a strong password and follow the wallet’s
          backup steps. Keep the recovery phrase offline in a secure place. Check that you can read
          your backup before continuing.
        </p>
        <p className="rounded-lg border border-amber-500 bg-amber-50 p-4 font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          Never share your recovery phrase or secret key. Never enter it into AudioBlocks, a chat,
          or a support form. Anyone with it can take your funds. Losing it can mean losing access to
          your account permanently.
        </p>
      </>
    ),
  },
  {
    title: 'Fund the account on the right network',
    Icon: Coins,
    content: (
      <>
        <p>
          For testing, choose Testnet in Freighter’s network menu. Friendbot supplies free test XLM
          to create and fund your test account. Test XLM has no monetary value, cannot fund Mainnet
          purchases, and may disappear when Testnet resets.
        </p>
        <p>
          On Mainnet, obtain XLM through a service available in your region, such as an exchange or
          an on-ramp. Compare fees and requirements yourself. Send only to your own Stellar public
          address and check the network and any required memo. AudioBlocks does not endorse a
          provider.
        </p>
        <TestnetFunding />
      </>
    ),
  },
];
export default function WalletHelpPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-8 px-4 py-10">
      <header>
        <h1 className="text-3xl font-bold sm:text-4xl">Your first Stellar wallet</h1>
        <p className="mt-3 text-on-muted">
          A few steps to connect safely and get ready to collect music.
        </p>
      </header>
      <ol className="space-y-8">
        {steps.map(({ title, Icon, content }, index) => (
          <li key={title} className="rounded-xl border border-border-dark p-4 sm:p-6">
            <div className="mb-4 flex items-center gap-3">
              <Icon aria-hidden="true" className="shrink-0 text-brand" size={32} />
              <h2 className="text-xl font-semibold">
                {index + 1}. {title}
              </h2>
            </div>
            <div className="space-y-4 leading-relaxed">{content}</div>
          </li>
        ))}
      </ol>
      <p className="text-sm text-on-muted">
        More information:{' '}
        <a
          className="underline"
          href="https://developers.stellar.org/docs/build/guides/freighter/connect-testnet"
        >
          Stellar’s Testnet guide
        </a>{' '}
        and{' '}
        <a className="underline" href="https://developers.stellar.org/docs/networks">
          Stellar networks
        </a>
        .
      </p>
    </article>
  );
}
