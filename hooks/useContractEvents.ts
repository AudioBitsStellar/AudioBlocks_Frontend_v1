/**
 * React hook for listening to contract events
 * Issue #322: Implement event listening for contract events
 */

import { useEffect, useState, useCallback } from 'react';
import { setupMultipleListeners, queryPastEvents } from '@/lib/web3Utils';

interface UseContractEventsOptions {
  contract: any;
  events: Record<string, (...args: any[]) => void>;
  enabled?: boolean;
  listenToPast?: boolean;
  fromBlock?: number;
}

interface UseContractEventsReturn {
  isListening: boolean;
  error: Error | null;
  pastEvents: any[];
}

/**
 * Hook to listen for contract events and update UI
 * @param options - Configuration options
 * @returns Listening state and past events
 */
export function useContractEvents({
  contract,
  events,
  enabled = true,
  listenToPast = false,
  fromBlock = 0,
}: UseContractEventsOptions): UseContractEventsReturn {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [pastEvents, setPastEvents] = useState<any[]>([]);

  useEffect(() => {
    if (!contract || !enabled) {
      setIsListening(false);
      return;
    }

    setIsListening(true);
    setError(null);

    // Set up event listeners
    const cleanup = setupMultipleListeners(contract, events);

    // Query past events if requested
    if (listenToPast) {
      const fetchPastEvents = async () => {
        try {
          const allPastEvents: any[] = [];
          for (const eventName of Object.keys(events)) {
            const eventsForName = await queryPastEvents(contract, eventName, fromBlock);
            allPastEvents.push(...eventsForName);
          }
          setPastEvents(allPastEvents);
        } catch (err) {
          setError(err instanceof Error ? err : new Error('Failed to fetch past events'));
        }
      };

      fetchPastEvents();
    }

    // Cleanup on unmount
    return () => {
      cleanup();
      setIsListening(false);
    };
  }, [contract, enabled, listenToPast, fromBlock]);

  return { isListening, error, pastEvents };
}

/**
 * Hook to listen for a single contract event
 * @param contract - Ethers contract instance
 * @param eventName - Event name to listen for
 * @param callback - Callback function when event fires
 * @param enabled - Whether to enable listening
 * @returns Listening state
 */
export function useSingleContractEvent(
  contract: any,
  eventName: string,
  callback: (...args: any[]) => void,
  enabled: boolean = true
): { isListening: boolean } {
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    if (!contract || !enabled) {
      setIsListening(false);
      return;
    }

    setIsListening(true);
    contract.on(eventName, callback);

    return () => {
      contract.off(eventName, callback);
      setIsListening(false);
    };
  }, [contract, eventName, enabled]);

  return { isListening };
}

/**
 * Hook to query past contract events
 * @param contract - Ethers contract instance
 * @param eventName - Event name to query
 * @param fromBlock - Starting block number
 * @param toBlock - Ending block number
 * @returns Past events and loading state
 */
export function usePastContractEvents(
  contract: any,
  eventName: string,
  fromBlock: number = 0,
  toBlock: number | string = 'latest'
): { events: any[]; isLoading: boolean; error: Error | null; refetch: () => void } {
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchEvents = useCallback(async () => {
    if (!contract) return;

    setIsLoading(true);
    setError(null);

    try {
      const pastEvents = await queryPastEvents(contract, eventName, fromBlock, toBlock);
      setEvents(pastEvents);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch past events'));
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, [contract, eventName, fromBlock, toBlock]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return { events, isLoading, error, refetch: fetchEvents };
}
