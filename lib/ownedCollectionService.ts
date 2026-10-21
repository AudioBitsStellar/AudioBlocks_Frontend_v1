import { unwrapList } from './api/unwrap';
import apiClient from './apiClient';
import { API_ENDPOINTS } from './constants';

export interface OwnedCollectionItem {
  songId: number;
  songCID: string;
  artistAddress: string;
  totalStreams: number;
  totalLikes: number;
  createdAt: number;
  /** Song title, when the backend or indexer provides it. */
  title?: string | null;
  /** Artist display name, when available. */
  artistName?: string | null;
  /** Artwork URL, when available. */
  coverUrl?: string | null;
  /** On-chain token ID, linking to the Soroban NFT */
  onChainTokenId?: string | null;
}

/**
 * Fetch owned NFTs for a Stellar address from the backend indexer.
 * 
 * Note: The backend endpoint doesn't exist yet. This needs to be coordinated
 * with the backend team to create an endpoint like GET /api/users/:address/nfts
 * that queries the IndexedEvent table for tokens owned by the given Stellar address.
 * 
 * @param address - Stellar public key (G... address)
 */
export async function getOwnedCollection(address: string): Promise<OwnedCollectionItem[]> {
  // TODO: Update to the actual backend endpoint once it's available
  // The backend should provide: GET /api/users/:address/nfts
  // which queries IndexedEvent data linked to onChainTokenId
  const res = await apiClient.get(API_ENDPOINTS.OWNED_COLLECTION(address));
  return unwrapList(res);
}
