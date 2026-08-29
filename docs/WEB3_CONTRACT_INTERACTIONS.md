# Web3 Contract Interaction Patterns

This document describes how AudioBlocks Frontend v1 reads from and writes to the deployed smart contract using [wagmi](https://wagmi.sh/) and [viem](https://viem.sh/).

## Contract Configuration

The contract ABI and address are centralized in `config/abi.ts`:

```ts
export const contractAddress = '0x604053F1D89A24AEa3b4eFd30407239AA707402a' as const;
export const abi = [ /* ... */ ];
```

Always import the ABI and address from this file instead of hardcoding them in hooks or components.

## Reading Contract State

Use `useReadContract` from wagmi for single-value reads.

### Example: Read a Song

```ts
'use client';
import { useReadContract } from 'wagmi';
import { abi, contractAddress } from '@/config/abi';

export function useContractSong(songId: bigint | undefined) {
  const { data, isLoading, error } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getSongById',
    args: songId !== undefined ? [songId] : undefined,
    query: { enabled: songId !== undefined },
  });

  return {
    song: data as
      | { songId: bigint; artistAddress: string; songCID: string; totalStreams: bigint; totalLikes: bigint; createdAt: bigint }
      | undefined,
    isLoading,
    error,
  };
}
```

### Best Practices for Reads

- Set `query: { enabled: <condition> }` to prevent reads when required arguments are undefined.
- Cast `data` to the expected return type; wagmi returns `unknown` by default.
- Handle `isLoading` and `error` states in the consuming component.

## Batch Reading Contract State

Use `useReadContracts` to fetch multiple values in a single RPC call.

```ts
import { useReadContracts } from 'wagmi';

const results = useReadContracts({
  contracts: [
    { address: contractAddress, abi, functionName: 'getSongById', args: [1n] },
    { address: contractAddress, abi, functionName: 'getAlbumById', args: [1n] },
  ],
});
```

## Writing to the Contract

Use `useWriteContract` for state-changing transactions.

```ts
'use client';
import { useWriteContract } from 'wagmi';
import { abi, contractAddress } from '@/config/abi';

export function useRegisterArtist() {
  const { writeContract, isPending, error } = useWriteContract();

  const register = (artistCid: string) => {
    writeContract({
      address: contractAddress,
      abi,
      functionName: 'registerArtist',
      args: [artistCid],
    });
  };

  return { register, isPending, error };
}
```

### Transaction Lifecycle

1. User triggers action in UI.
2. `writeContract` sends the transaction via the connected wallet.
3. wagmi returns a transaction hash.
4. Use `useWaitForTransactionReceipt` to wait for confirmation.

```ts
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';

function BuyButton({ tokenId }: { tokenId: bigint }) {
  const { data: hash, writeContract, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const buy = () => {
    writeContract({
      address: contractAddress,
      abi,
      functionName: 'buy',
      args: [tokenId],
      value: parseEther('0.01'),
    });
  };

  return (
    <button onClick={buy} disabled={isPending || isConfirming}>
      {isPending ? 'Confirm in wallet...' : isConfirming ? 'Confirming...' : 'Buy'}
    </button>
  );
}
```

## Listening to Contract Events

Use `useWatchContractEvent` to react to on-chain events.

```ts
import { useWatchContractEvent } from 'wagmi';

useWatchContractEvent({
  address: contractAddress,
  abi,
  eventName: 'SongRegistered',
  onLogs: (logs) => {
    console.log('New song registered:', logs);
  },
});
```

## Error Handling

Contract errors can come from several sources:

- **RPC errors**: Network or node issues.
- **Revert errors**: Solidity `require` or custom errors (e.g., `ARTISTNOTFOUND`).
- **Wallet errors**: User rejected the transaction.

Always surface actionable error messages to users and log full errors for debugging.

```ts
if (error) {
  console.error(error);
  return <p>Failed to load song. Please try again.</p>;
}
```

## Testing Contract Hooks

Mock wagmi hooks in unit tests to avoid hitting a live RPC:

```ts
vi.mock('wagmi', () => ({
  useReadContract: () => ({ data: undefined, isLoading: false, error: null }),
  useWriteContract: () => ({ writeContract: vi.fn(), isPending: false, error: null }),
}));
```

## References

- `config/abi.ts` — contract ABI and address
- `hooks/useContractData.ts` — read hooks for songs, albums, artists
- `hooks/useContractEvents.ts` — event watching
- `components/common/BuyButton.tsx` — write transaction example
