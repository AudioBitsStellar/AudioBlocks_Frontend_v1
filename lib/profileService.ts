import apiClient from './apiClient';
import { API_ENDPOINTS } from './constants';

export interface UserProfile {
  id: string;
  name: string;
  username?: string;
  email?: string;
  bio?: string;
  website?: string;
  twitter?: string;
  profileImage?: string;
  joinedAt?: string;
  minutesListened?: number;
  listenerType?: string;
}

export interface UpdateProfilePayload {
  name: string;
  bio: string;
  website: string;
  twitter: string;
}

export async function getProfile(): Promise<UserProfile> {
  const res = await apiClient.get(API_ENDPOINTS.USER_PROFILE);
  return res.data?.user ?? res.data;
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<UserProfile> {
  const res = await apiClient.put(API_ENDPOINTS.USER_PROFILE, payload);
  return res.data?.user ?? res.data;
}
