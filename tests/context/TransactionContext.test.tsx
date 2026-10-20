import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TransactionProvider, useTransaction } from '@/context/TransactionContext';
import * as StellarSDK from '@stellar/stellar-sdk';

// Mock Stellar SDK
vi.mock('@stellar/stellar-sdk', () => {
  const SorobanRpc = {
    Api: {
      GetTransactionStatus: {
        SUCCESS: 'SUCCESS',
        FAILED: 'FAILED',
        NOT_FOUND: 'NOT_FOUND',
      },
    },
    Server: vi.fn(),
  };

  return {
    SorobanRpc,
    Networks: {
      TESTNET: 'Test SDF Network ; September 2015',
      PUBLIC: 'Public Global Stellar Network ; September 2015',
    },
  };
});

// Mock toast context
vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

function TestComponent() {
  const { transactions, addTransaction, clearTransaction, clearAllTransactions } = useTransaction();

  return (
    <div>
      <div data-testid="transaction-count">{transactions.length}</div>
      <button onClick={() => addTransaction('test-hash-123', 'buy')}>Add Transaction</button>
      <button onClick={() => addTransaction('test-hash-456', 'buy', true)}>
        Add Final Transaction
      </button>
      {transactions.map((tx) => (
        <div key={tx.id} data-testid={`transaction-${tx.id}`}>
          <span data-testid={`status-${tx.id}`}>{tx.status}</span>
          <span data-testid={`hash-${tx.id}`}>{tx.hash}</span>
          <button onClick={() => clearTransaction(tx.id)}>Clear</button>
        </div>
      ))}
      <button onClick={() => clearAllTransactions()}>Clear All</button>
    </div>
  );
}

describe('TransactionContext', () => {
  let mockGetTransaction: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();

    mockGetTransaction = vi.fn();
    (StellarSDK.SorobanRpc.Server as any).mockImplementation(() => ({
      getTransaction: mockGetTransaction,
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('should add a pending transaction', async () => {
    mockGetTransaction.mockResolvedValue({
      status: StellarSDK.SorobanRpc.Api.GetTransactionStatus.NOT_FOUND,
    });

    render(
      <TransactionProvider>
        <TestComponent />
      </TransactionProvider>
    );

    const addButton = screen.getByText('Add Transaction');
    await act(async () => {
      addButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('transaction-count')).toHaveTextContent('1');
    });
  });

  it('should add a final (confirmed) transaction', async () => {
    render(
      <TransactionProvider>
        <TestComponent />
      </TransactionProvider>
    );

    const addButton = screen.getByText('Add Final Transaction');
    await act(async () => {
      addButton.click();
    });

    await waitFor(() => {
      const transactions = screen.getAllByTestId(/^transaction-/);
      expect(transactions.length).toBe(1);
      const statusElement = screen.getAllByTestId(/^status-/)[0];
      expect(statusElement).toHaveTextContent('confirmed');
    });
  });

  it('should update transaction status to confirmed via RPC polling', async () => {
    mockGetTransaction
      .mockResolvedValueOnce({
        status: StellarSDK.SorobanRpc.Api.GetTransactionStatus.NOT_FOUND,
      })
      .mockResolvedValueOnce({
        status: StellarSDK.SorobanRpc.Api.GetTransactionStatus.SUCCESS,
      });

    render(
      <TransactionProvider>
        <TestComponent />
      </TransactionProvider>
    );

    const addButton = screen.getByText('Add Transaction');
    await act(async () => {
      addButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('transaction-count')).toHaveTextContent('1');
    });

    // Advance timer to trigger polling
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    await waitFor(() => {
      const statusElements = screen.getAllByTestId(/^status-/);
      expect(statusElements[0]).toHaveTextContent('confirmed');
    });
  });

  it('should update transaction status to failed via RPC', async () => {
    mockGetTransaction.mockResolvedValue({
      status: StellarSDK.SorobanRpc.Api.GetTransactionStatus.FAILED,
    });

    render(
      <TransactionProvider>
        <TestComponent />
      </TransactionProvider>
    );

    const addButton = screen.getByText('Add Transaction');
    await act(async () => {
      addButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('transaction-count')).toHaveTextContent('1');
    });

    // Advance timer to trigger polling
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    await waitFor(() => {
      const statusElements = screen.getAllByTestId(/^status-/);
      expect(statusElements[0]).toHaveTextContent('failed');
    });
  });

  it('should persist pending transactions to localStorage', async () => {
    mockGetTransaction.mockResolvedValue({
      status: StellarSDK.SorobanRpc.Api.GetTransactionStatus.NOT_FOUND,
    });

    render(
      <TransactionProvider>
        <TestComponent />
      </TransactionProvider>
    );

    const addButton = screen.getByText('Add Transaction');
    await act(async () => {
      addButton.click();
    });

    await waitFor(() => {
      const stored = localStorage.getItem('pending_transactions');
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].hash).toBe('test-hash-123');
    });
  });

  it('should clear a specific transaction', async () => {
    mockGetTransaction.mockResolvedValue({
      status: StellarSDK.SorobanRpc.Api.GetTransactionStatus.NOT_FOUND,
    });

    render(
      <TransactionProvider>
        <TestComponent />
      </TransactionProvider>
    );

    const addButton = screen.getByText('Add Transaction');
    await act(async () => {
      addButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('transaction-count')).toHaveTextContent('1');
    });

    const clearButton = screen.getByText('Clear');
    await act(async () => {
      clearButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('transaction-count')).toHaveTextContent('0');
    });
  });

  it('should clear all transactions', async () => {
    mockGetTransaction.mockResolvedValue({
      status: StellarSDK.SorobanRpc.Api.GetTransactionStatus.NOT_FOUND,
    });

    render(
      <TransactionProvider>
        <TestComponent />
      </TransactionProvider>
    );

    const addButton = screen.getByText('Add Transaction');
    await act(async () => {
      addButton.click();
      addButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('transaction-count')).toHaveTextContent('2');
    });

    const clearAllButton = screen.getByText('Clear All');
    await act(async () => {
      clearAllButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('transaction-count')).toHaveTextContent('0');
    });
  });
});
