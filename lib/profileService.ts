import apiClient from './apiClient';
import { API_ENDPOINTS } from './constants';
import type { AuthRole } from './authRoles';

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
  /** Role saved during onboarding (#596). Absent until the user picks one. */
  accountType?: AuthRole;
}

export interface UpdateProfilePayload {
  name: string;
  bio: string;
  website: string;
  twitter: string;
}

/** Only allow complete HTTP(S) URLs without embedded credentials. */
export function isValidProfileUrl(value: string): boolean {
  try {
    if (value !== value.trim()) return false;

    const url = new URL(value);
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      Boolean(url.hostname) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

export async function getProfile(): Promise<UserProfile> {
  const res = await apiClient.get(API_ENDPOINTS.USER_PROFILE);
  return res.data?.user ?? res.data;
}

/** Persists the role chosen during onboarding so the backend recognizes artists (#596). */
export async function updateAccountType(accountType: AuthRole): Promise<void> {
  await apiClient.put(API_ENDPOINTS.USER_ACCOUNT_TYPE, { accountType });
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<UserProfile> {
  if (payload.website && !isValidProfileUrl(payload.website)) {
    throw new Error('Website must be a valid HTTP(S) URL without credentials.');
  }

  const res = await apiClient.put(API_ENDPOINTS.USER_PROFILE, payload);
  return res.data?.user ?? res.data;
}
