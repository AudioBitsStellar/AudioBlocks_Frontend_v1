import { Networks, StrKey, Transaction, TransactionBuilder } from '@stellar/stellar-sdk';
import { getStellarNetworkConfig } from './stellarNetwork';

export interface ChainPolicy {
  networkPassphrase: string;
  chainId: string;
  rpcUrl: string;
  contracts: string[];
  assets: string[];
}

export interface TransactionSummary {
  item: string;
  price: string;
  royalties: string;
  fees: string;
  recipient: string;
}

function fail(): never {
  throw new Error('Transactions blocked: chain configuration could not be verified. Contact support.');
}

export function validateChainPolicy(value: unknown): ChainPolicy {
  const policy = value as ChainPolicy | null;
  const config = getStellarNetworkConfig();
  const contracts = (process.env.NEXT_PUBLIC_STELLAR_CONTRACTS || '').split(',').filter(Boolean).sort();
  const assets = (process.env.NEXT_PUBLIC_STELLAR_ASSETS || '').split(',').filter(Boolean).sort();
  if (!policy || policy.networkPassphrase !== config.networkPassphrase ||
      policy.chainId !== process.env.NEXT_PUBLIC_STELLAR_CHAIN_ID ||
      policy.rpcUrl !== config.sorobanRpcUrl ||
      !Array.isArray(policy.contracts) || !Array.isArray(policy.assets) ||
      contracts.length === 0 || assets.length === 0 ||
      [...policy.contracts, ...policy.assets].some(a => typeof a !== 'string' || !StrKey.isValidContract(a)) ||
      JSON.stringify([...policy.contracts].sort()) !== JSON.stringify(contracts) ||
      JSON.stringify([...policy.assets].sort()) !== JSON.stringify(assets)) fail();
  if (policy.networkPassphrase !== Networks.PUBLIC && policy.networkPassphrase !== Networks.TESTNET) fail();
  return policy;
}

// No cached success: each signing attempt rechecks the deployed backend and RPC.
export async function checkChainSafety(): Promise<ChainPolicy> {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) fail();
  const response = await fetch(`${base.replace(/\/$/, '')}/api/chain-config`, {
    cache: 'no-store', signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) fail();
  const policy = validateChainPolicy(await response.json());
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(policy.networkPassphrase));
  const chainId = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  if (policy.chainId !== chainId) fail();
  const rpc = await fetch(policy.rpcUrl, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getNetwork' }),
    cache: 'no-store', signal: AbortSignal.timeout(10000),
  });
  if (!rpc.ok) fail();
  const network = await rpc.json();
  if (network.error || network.result?.passphrase !== policy.networkPassphrase) fail();
  return policy;
}

export function validateSummary(value: unknown): TransactionSummary {
  const summary = value as TransactionSummary | null;
  if (!summary || ['item', 'price', 'royalties', 'fees', 'recipient'].some(key => {
    const field = summary[key as keyof TransactionSummary];
    return typeof field !== 'string' || !field.trim() || field.length > 500;
  }) || !StrKey.isValidEd25519PublicKey(summary.recipient)) {
    throw new Error('Transactions blocked: complete transaction details are required for review.');
  }
  return summary;
}

// The backend must independently decode/simulate this exact XDR and derive the
// summary from trusted listing/royalty data, never echo client-supplied labels.
export async function getTransactionReview(xdr: string, source: string, policy: ChainPolicy): Promise<TransactionSummary> {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) fail();
  const response = await fetch(`${base.replace(/\/$/, '')}/api/transactions/review`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ xdr, source, networkPassphrase: policy.networkPassphrase }),
    cache: 'no-store', signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) fail();
  const review = await response.json();
  if (review.xdr !== xdr || review.source !== source ||
      review.networkPassphrase !== policy.networkPassphrase || review.verified !== true) fail();
  return validateSummary(review.summary);
}

// Only supported contract invocations can reach the wallet. Fee bumps, classic
// payments, deployments and unsupported operations require a separate review.
export function validateTransaction(xdr: string, policy: ChainPolicy, source: string): void {
  const tx = TransactionBuilder.fromXDR(xdr, policy.networkPassphrase);
  if (!(tx instanceof Transaction) || tx.source !== source || tx.operations.length !== 1) fail();
  const operation = tx.operations[0];
  if (operation.source && operation.source !== source) fail();
  if (operation.type !== 'invokeHostFunction' || operation.func.switch().name !== 'hostFunctionTypeInvokeContract') fail();
  const invocation = operation.func.invokeContract();
  const address = invocation.contractAddress();
  if (address.switch().name !== 'scAddressTypeContract' ||
      !policy.contracts.includes(StrKey.encodeContract(address.contractId()))) fail();
  // Reject contract/asset addresses hidden inside nested invocation arguments.
  const inspect = (value: ReturnType<typeof invocation.args>[number]): void => {
    const kind = value.switch().name;
    if (kind === 'scvAddress') {
      const addr = value.address();
      if (addr.switch().name === 'scAddressTypeContract' &&
          ![...policy.contracts, ...policy.assets].includes(StrKey.encodeContract(addr.contractId()))) fail();
    } else if (kind === 'scvVec') {
      value.vec()?.forEach(inspect);
    } else if (kind === 'scvMap') {
      value.map()?.forEach(entry => { inspect(entry.key()); inspect(entry.val()); });
    }
  };
  invocation.args().forEach(inspect);
}
