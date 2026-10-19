# Stellar Transaction Flow for Frontend Contributors

This document outlines how AudioBlocks integrates Stellar blockchain transactions on the frontend and how contributors should handle transaction-related features.

## Overview

AudioBlocks uses the Stellar blockchain to:
- Manage asset ownership and transfers
- Track artist payments and royalties
- Validate NFT transfers and approvals
- Record transactions on an immutable ledger

## Key Components

### Transaction Context & State Management

**Location**: `context/` and `hooks/`

- `useNFTTransfer()` — handles NFT transfer flows
- `useNFTApproval()` — manages approval workflows
- `useTransactionHistory()` — retrieves past transactions

### UI Components for Transactions

**Location**: `components/`

- `NftTransfer.tsx` — NFT transfer form and status
- `NftApproval.tsx` — Approval confirmation
- `GasEstimateDisplay.tsx` — Gas fee estimation
- `ExplorerLink.tsx` — Links to Stellar expert explorer

## Transaction Flow Diagram

```
1. User Action (Transfer/Approve)
   ↓
2. Frontend Validation & Gas Estimation
   ↓
3. Wallet Connection (MetaMask/Dynamic)
   ↓
4. Sign Transaction (Stellar protocol)
   ↓
5. Submit to Blockchain
   ↓
6. Backend Indexing (Stellar event listener)
   ↓
7. UI State Update (transaction confirmed/failed)
```

## Implementation Guidelines

### When Building Transfer Features

1. Use `useNFTTransfer()` hook to manage state
2. Show `GasEstimateDisplay` before final confirmation
3. Use `ExplorerLink` to let users view confirmed transactions
4. Handle loading states with skeleton loaders
5. Provide error boundaries (see [Dashboard Error Boundaries](./docs/))

### When Handling Wallet Interactions

1. Import wallet utilities from `@/lib/walletUtil` or similar
2. Ensure the user's wallet is connected before transaction flows
3. Catch and display user-friendly error messages for:
   - Wallet disconnections
   - Insufficient balance
   - Transaction rejections
   - Network errors

### Environment Configuration

Required env vars:
- `NEXT_PUBLIC_API_URL` — Backend API endpoint for transaction verification
- `NEXT_PUBLIC_STELLAR_NETWORK` — Stellar network (testnet/public)
- Wallet provider keys (MetaMask, Dynamic Labs)

## Common Patterns

### Fetching Transaction History

```typescript
const { transactions, isLoading } = useTransactionHistory(userAddress);

if (isLoading) return <Skeleton />;
return (
  <div>
    {transactions.map(tx => (
      <TransactionRow key={tx.id} tx={tx} />
    ))}
  </div>
);
```

### Initiating a Transfer

```typescript
const { initiateTransfer, status } = useNFTTransfer();

const handleTransfer = async (recipient, amount) => {
  const result = await initiateTransfer(recipient, amount);
  if (result.success) {
    // Show success message
  } else {
    // Show error
  }
};
```

### Displaying Stellar Explorer Links

```typescript
import ExplorerLink from '@/components/ExplorerLink';

<ExplorerLink
  type="transaction"
  hash="xxxxxxxxxxxxxxx"
  className="text-blue-500 hover:underline"
>
  View on Stellar Expert
</ExplorerLink>
```

## Error Handling

All transaction operations should:
1. Catch errors at the hook level
2. Provide user-friendly error messages (no raw error codes)
3. Use error boundary components for UI failures
4. Log transaction errors for debugging

## Testing Transactions

To test locally:
1. Use Stellar testnet configuration
2. Request testnet lumens (XLM) from the faucet
3. Test both success and failure scenarios
4. Verify transactions on [Stellar Expert](https://stellar.expert/)

## Backend Integration

The backend listens to Stellar events and:
- Verifies transaction authenticity
- Updates artist payment records
- Triggers notifications
- Maintains transaction history

For questions about backend verification, see the [AudioBlock Backend Documentation](https://github.com/AudioBitsStellar/AudioBlock_Backend).

## Troubleshooting

### Transaction Stuck in Pending

Check the transaction hash on [Stellar Expert](https://stellar.expert/) to verify network status.

### Wallet Connection Issues

1. Ensure MetaMask/wallet extension is installed
2. Verify network is set to the correct Stellar network
3. Check browser console for connection errors

### High Gas Estimates

Gas estimates can vary based on network congestion. Always show the estimate before final confirmation.

## Resources

- [Stellar Documentation](https://developers.stellar.org/)
- [Stellar Testnet Faucet](https://friendbot.stellar.org/)
- [Stellar Expert Explorer](https://stellar.expert/)
- [AudioBlock Backend Repo](https://github.com/AudioBitsStellar/AudioBlock_Backend)
