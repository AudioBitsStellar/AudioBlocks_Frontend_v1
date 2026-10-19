import Link from 'next/link';
import { WALLET_HELP_PATH } from '@/lib/walletHelp';
export default function WalletHelpLink() {
  return (
    <Link
      className="inline-block rounded text-sm text-on-muted underline underline-offset-4 focus-visible:outline focus-visible:outline-2"
      href={WALLET_HELP_PATH}
    >
      Need a wallet or XLM? Read the wallet guide
    </Link>
  );
}
