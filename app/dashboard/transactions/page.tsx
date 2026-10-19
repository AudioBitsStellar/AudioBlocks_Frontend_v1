'use client';

import { useState, useMemo, useEffect } from 'react';
import { Search, Filter, Download, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useTransaction } from '@/context/TransactionContext';
import TransactionTable from '@/components/dashboard/TransactionTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import type { Transaction } from '@/context/TransactionContext';

const TRANSACTION_TYPES = ['all', 'buy', 'sell', 'list', 'cancel_listing', 'bid', 'transfer', 'mint'] as const;
const TRANSACTION_STATUSES = ['all', 'pending', 'confirmed', 'failed'] as const;

type TransactionTypeFilter = (typeof TRANSACTION_TYPES)[number];
type TransactionStatusFilter = (typeof TRANSACTION_STATUSES)[number];

const TransactionsPage = () => {
  useScrollRestoration('transactions');
  const { transactions: localTransactions, clearAllTransactions } = useTransaction();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TransactionTypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<TransactionStatusFilter>('all');
  const [page, setPage] = useState(1);

  const { data: backendTransactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ['transactions', page],
    queryFn: async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
        const response = await fetch(`${apiUrl}/activity/onchain?page=${page}&limit=20`);
        if (!response.ok) return [];
        const data = await response.json();
        return Array.isArray(data) ? data : data.transactions || [];
      } catch {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const allTransactions = useMemo(() => {
    const hashSet = new Set(backendTransactions.map((t) => t.hash));
    const pendingLocal = localTransactions.filter((t) => !hashSet.has(t.hash));
    return [...pendingLocal, ...backendTransactions].sort(
      (a, b) => b.timestamp - a.timestamp
    );
  }, [localTransactions, backendTransactions]);

  // Filter transactions based on search and filters
  const filteredTransactions = useMemo(() => {
    return allTransactions.filter((transaction) => {
      // Search by transaction hash
      const matchesSearch = searchQuery === '' ||
        transaction.hash.toLowerCase().includes(searchQuery.toLowerCase());

      // Filter by transaction type
      const matchesType = typeFilter === 'all' || transaction.type === typeFilter;

      // Filter by transaction status
      const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [allTransactions, searchQuery, typeFilter, statusFilter]);

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear all transaction history? This cannot be undone.')) {
      clearAllTransactions();
    }
  };

  const handleExport = () => {
    // In a real implementation, this would export to CSV or JSON
    alert('Export functionality would be implemented here');
  };

  const handleRefresh = () => {
    // This would refresh transaction data from the blockchain
    alert('Refresh functionality would be implemented here');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Transaction History</h1>
          <p className="text-sm text-gray-400 mt-1">
            Track and manage your blockchain transactions
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="destructive" size="sm" onClick={handleClearAll}>
            Clear All
          </Button>
        </div>
      </div>

      <Card className="border-border-dark bg-surface-input">
        <CardHeader className="pb-3">
          <CardTitle className="text-white">Filters & Search</CardTitle>
          <CardDescription className="text-gray-400">
            Filter transactions by type, status, or search by hash
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by transaction hash..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-surface-input border-border-dark text-white"
            />
          </div>

          {/* Filter Buttons */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-300">Type:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {TRANSACTION_TYPES.map((type) => (
                  <Badge
                    key={type}
                    variant={typeFilter === type ? 'default' : 'outline'}
                    className={`cursor-pointer ${
                      typeFilter === type
                        ? 'bg-brand text-white'
                        : 'bg-surface-input text-gray-400 border-border-dark'
                    }`}
                    onClick={() => setTypeFilter(type)}
                  >
                    {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-300">Status:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {TRANSACTION_STATUSES.map((status) => (
                  <Badge
                    key={status}
                    variant={statusFilter === status ? 'default' : 'outline'}
                    className={`cursor-pointer ${
                      statusFilter === status
                        ? 'bg-brand text-white'
                        : 'bg-surface-input text-gray-400 border-border-dark'
                    }`}
                    onClick={() => setStatusFilter(status)}
                  >
                    {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Count Summary */}
      <div className="flex flex-wrap gap-4">
        <Card className="flex-1 min-w-[200px] border-border-dark bg-surface-input">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-white">{filteredTransactions.length}</div>
            <p className="text-sm text-gray-400">Total Transactions</p>
          </CardContent>
        </Card>
        
        <Card className="flex-1 min-w-[200px] border-border-dark bg-surface-input">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-500">
              {filteredTransactions.filter(t => t.status === 'pending').length}
            </div>
            <p className="text-sm text-gray-400">Pending</p>
          </CardContent>
        </Card>
        
        <Card className="flex-1 min-w-[200px] border-border-dark bg-surface-input">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-500">
              {filteredTransactions.filter(t => t.status === 'confirmed').length}
            </div>
            <p className="text-sm text-gray-400">Confirmed</p>
          </CardContent>
        </Card>
        
        <Card className="flex-1 min-w-[200px] border-border-dark bg-surface-input">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-500">
              {filteredTransactions.filter(t => t.status === 'failed').length}
            </div>
            <p className="text-sm text-gray-400">Failed</p>
          </CardContent>
        </Card>
      </div>

      {/* Transaction Table */}
      <TransactionTable transactions={filteredTransactions} />

      {filteredTransactions.length === 0 && (
        <Card className="border-border-dark bg-surface-input text-center py-12">
          <CardContent>
            <p className="text-gray-400">No transactions found</p>
            <p className="text-sm text-gray-500 mt-2">
              {transactions.length === 0 
                ? 'You haven&apos;t made any transactions yet.' 
                : 'Try adjusting your filters or search query.'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TransactionsPage;