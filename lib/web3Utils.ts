/**
 * Web3 utility functions for AudioBlocks
 * Provides ENS resolution, block explorer links, gas estimation, and event listening
 */

// Network configuration for block explorers
const BLOCK_EXPLORERS: Record<number, string> = {
  1: 'https://etherscan.io',
  5: 'https://goerli.etherscan.io',
  11155111: 'https://sepolia.etherscan.io',
  137: 'https://polygonscan.com',
  80001: 'https://mumbai.polygonscan.com',
};

/**
 * Get block explorer URL for a transaction hash
 * @param txHash - Transaction hash
 * @param chainId - Chain ID (defaults to 1 for mainnet)
 * @returns Full URL to block explorer
 */
export function getExplorerTxUrl(txHash: string, chainId: number = 1): string {
  const baseUrl = BLOCK_EXPLORERS[chainId] || BLOCK_EXPLORERS[1];
  return `${baseUrl}/tx/${txHash}`;
}

/**
 * Get block explorer URL for an address
 * @param address - Ethereum address
 * @param chainId - Chain ID (defaults to 1 for mainnet)
 * @returns Full URL to block explorer
 */
export function getExplorerAddressUrl(address: string, chainId: number = 1): string {
  const baseUrl = BLOCK_EXPLORERS[chainId] || BLOCK_EXPLORERS[1];
  return `${baseUrl}/address/${address}`;
}

/**
 * Resolve ENS name to address or return original if not ENS
 * @param nameOrAddress - ENS name or Ethereum address
 * @param provider - Ethers provider instance
 * @returns Resolved address or original input
 */
export async function resolveENS(
  nameOrAddress: string,
  provider?: any
): Promise<string> {
  if (!provider) return nameOrAddress;
  
  // Check if it's an ENS name (ends with .eth)
  if (nameOrAddress.endsWith('.eth')) {
    try {
      const address = await provider.resolveName(nameOrAddress);
      return address || nameOrAddress;
    } catch (error) {
      console.error('ENS resolution failed:', error);
      return nameOrAddress;
    }
  }
  
  return nameOrAddress;
}

/**
 * Lookup ENS name for an address
 * @param address - Ethereum address
 * @param provider - Ethers provider instance
 * @returns ENS name or null if not found
 */
export async function lookupENS(
  address: string,
  provider?: any
): Promise<string | null> {
  if (!provider) return null;
  
  try {
    const ensName = await provider.lookupAddress(address);
    return ensName;
  } catch (error) {
    console.error('ENS lookup failed:', error);
    return null;
  }
}

/**
 * Format address with ENS name if available
 * @param address - Ethereum address
 * @param ensName - Optional ENS name
 * @returns Formatted string
 */
export function formatAddressWithENS(address: string, ensName?: string | null): string {
  if (ensName) {
    return ensName;
  }
  // Return shortened address (0x1234...5678)
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Estimate gas for a contract transaction
 * @param contract - Ethers contract instance
 * @param method - Contract method name
 * @param args - Method arguments
 * @param value - Optional ETH value to send
 * @returns Estimated gas cost in wei
 */
export async function estimateGas(
  contract: any,
  method: string,
  args: any[] = [],
  value?: bigint
): Promise<bigint> {
  try {
    const gasEstimate = await contract[method].estimateGas(...args, value ? { value } : {});
    // Add 20% buffer for safety
    return (gasEstimate * BigInt(120)) / BigInt(100);
  } catch (error) {
    console.error('Gas estimation failed:', error);
    // Return a default high estimate if estimation fails
    return BigInt(300000);
  }
}

/**
 * Calculate gas cost in ETH
 * @param gasLimit - Gas limit
 * @param gasPrice - Gas price in wei
 * @returns Cost in ETH as string
 */
export function calculateGasCost(gasLimit: bigint, gasPrice: bigint): string {
  const cost = gasLimit * gasPrice;
  const ethCost = Number(cost) / 1e18;
  return ethCost.toFixed(6);
}

/**
 * Setup contract event listener
 * @param contract - Ethers contract instance
 * @param eventName - Event name to listen for
 * @param callback - Callback function when event fires
 * @returns Cleanup function to remove listener
 */
export function setupContractListener(
  contract: any,
  eventName: string,
  callback: (...args: any[]) => void
): () => void {
  contract.on(eventName, callback);
  
  // Return cleanup function
  return () => {
    contract.off(eventName, callback);
  };
}

/**
 * Listen for multiple contract events
 * @param contract - Ethers contract instance
 * @param events - Object mapping event names to callbacks
 * @returns Cleanup function to remove all listeners
 */
export function setupMultipleListeners(
  contract: any,
  events: Record<string, (...args: any[]) => void>
): () => void {
  const cleanupFunctions: (() => void)[] = [];
  
  Object.entries(events).forEach(([eventName, callback]) => {
    contract.on(eventName, callback);
    cleanupFunctions.push(() => contract.off(eventName, callback));
  });
  
  // Return cleanup function that removes all listeners
  return () => {
    cleanupFunctions.forEach(cleanup => cleanup());
  };
}

/**
 * Query past contract events
 * @param contract - Ethers contract instance
 * @param eventName - Event name to query
 * @param fromBlock - Starting block number
 * @param toBlock - Ending block number (defaults to 'latest')
 * @returns Array of event logs
 */
export async function queryPastEvents(
  contract: any,
  eventName: string,
  fromBlock: number = 0,
  toBlock: number | string = 'latest'
): Promise<any[]> {
  try {
    const filter = contract.filters[eventName]();
    const events = await contract.queryFilter(filter, fromBlock, toBlock);
    return events;
  } catch (error) {
    console.error('Failed to query past events:', error);
    return [];
  }
}

/**
 * Format wei amount to ETH with specified decimals
 * @param wei - Amount in wei
 * @param decimals - Number of decimal places
 * @returns Formatted string
 */
export function formatEther(wei: bigint, decimals: number = 4): string {
  const eth = Number(wei) / 1e18;
  return eth.toFixed(decimals);
}

/**
 * Parse ETH amount to wei
 * @param eth - Amount in ETH as string
 * @returns Amount in wei as bigint
 */
export function parseEther(eth: string): bigint {
  return BigInt(Math.floor(parseFloat(eth) * 1e18));
}
