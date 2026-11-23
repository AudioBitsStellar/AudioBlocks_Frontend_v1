import type { TransactionSummary as Summary } from '@/lib/chainSafety';

export function TransactionSummary({ summary }: { summary: Summary }) {
  return <dl className="space-y-2 text-sm break-all">
    {(['item', 'price', 'royalties', 'fees', 'recipient'] as const).map(field => (
      <div key={field}><dt className="capitalize text-gray-400">{field}</dt><dd>{summary[field]}</dd></div>
    ))}
  </dl>;
}
