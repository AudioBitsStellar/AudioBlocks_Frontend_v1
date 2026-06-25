import apiClient from './apiClient';

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
  const res = await apiClient.get('/api/user/profile');
  return res.data?.user ?? res.data;
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<UserProfile> {
  const res = await apiClient.put('/api/user/profile', payload);
  return res.data?.user ?? res.data;
}
