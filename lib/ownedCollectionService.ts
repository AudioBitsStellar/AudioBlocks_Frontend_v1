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
}

export async function getOwnedCollection(address: string): Promise<OwnedCollectionItem[]> {
  const res = await apiClient.get(API_ENDPOINTS.OWNED_COLLECTION(address));
  return unwrapList(res);
}
