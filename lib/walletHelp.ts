export const WALLET_HELP_PATH = '/help/wallet';
export const STELLAR_TESTNET_PASSPHRASE = 'Test SDF Network ; September 2015';
export function canFundWithFriendbot(address: string, networkPassphrase: string): boolean {
  return /^G[A-Z2-7]{55}$/.test(address) && networkPassphrase === STELLAR_TESTNET_PASSPHRASE;
}
export async function fundTestnetAccount(
  address: string,
  networkPassphrase: string
): Promise<void> {
  if (!canFundWithFriendbot(address, networkPassphrase))
    throw new Error('Connect a Stellar account on Testnet before requesting test XLM.');
  const response = await fetch(
    `https://friendbot.stellar.org?addr=${encodeURIComponent(address)}`,
    { method: 'POST', signal: AbortSignal.timeout(20000) }
  );
  if (!response.ok)
    throw new Error(
      'Friendbot could not fund this account. It may already be funded. Check your wallet balance and try again later.'
    );
}
