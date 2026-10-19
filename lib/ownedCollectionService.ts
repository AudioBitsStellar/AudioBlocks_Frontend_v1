import apiClient from './apiClient';
import { API_ENDPOINTS } from './constants';
import { unwrapList } from './api/unwrap';

export interface OwnedCollectionItem {
  songId: number;
  songCID: string;
  artistAddress: string;
  totalStreams: number;
  totalLikes: number;
  createdAt: number;
}

export async function getOwnedCollection(address: string): Promise<OwnedCollectionItem[]> {
  const res = await apiClient.get(API_ENDPOINTS.OWNED_COLLECTION(address));
  return unwrapList(res);
}
