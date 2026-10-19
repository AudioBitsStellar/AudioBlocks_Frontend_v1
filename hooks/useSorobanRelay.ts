import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface SorobanRelayParams {
  operation: string;
  params: Record<string, any>;
}

interface UseSorobanRelayReturn {
  relay: (config: SorobanRelayParams) => Promise<any>;
  isPending: boolean;
  error: Error | null;
}

export function useSorobanRelay(): UseSorobanRelayReturn {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const relay = useCallback(
    async (config: SorobanRelayParams): Promise<any> => {
      setIsPending(true);
      setError(null);

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api';
        const endpoint = `${apiUrl}/soroban/relay`;

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(config),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
          throw new Error(errorData.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        return data;
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        setError(errorObj);
        throw errorObj;
      } finally {
        setIsPending(false);
      }
    },
    []
  );

  return { relay, isPending, error };
}
