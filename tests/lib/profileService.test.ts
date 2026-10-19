import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiClient from '@/lib/apiClient';
import { API_ENDPOINTS } from '@/lib/constants';
import { getProfile, isValidProfileUrl, updateProfile } from '@/lib/profileService';
import type { UpdateProfilePayload } from '@/lib/profileService';

vi.mock('@/lib/apiClient', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));

const mockGet = vi.mocked(apiClient.get);
const mockPut = vi.mocked(apiClient.put);

const payload: UpdateProfilePayload = {
  name: 'Alexia Stephen',
  bio: 'Producer',
  website: 'https://alexia.example.com',
  twitter: '@alexia',
};

describe('profileService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isValidProfileUrl', () => {
    it.each(['https://example.com', 'http://example.com/path?q=1', 'https://sub.example.co.uk'])(
      'accepts %s',
      (value) => {
        expect(isValidProfileUrl(value)).toBe(true);
      }
    );

    it.each([
      ['a bare hostname', 'example.com'],
      ['a non-http protocol', 'ftp://example.com'],
      ['a javascript URL', 'javascript:alert(1)'],
      ['embedded credentials', 'https://user:pass@example.com'],
      ['a username only', 'https://user@example.com'],
      ['leading whitespace', ' https://example.com'],
      ['an empty string', ''],
    ])('rejects %s', (_label, value) => {
      expect(isValidProfileUrl(value)).toBe(false);
    });
  });

  describe('getProfile', () => {
    it('requests the profile endpoint and unwraps `user`', async () => {
      const user = { id: 'u1', name: 'Alexia' };
      mockGet.mockResolvedValueOnce({ data: { user } } as never);

      await expect(getProfile()).resolves.toEqual(user);
      expect(mockGet).toHaveBeenCalledWith(API_ENDPOINTS.USER_PROFILE);
    });

    it('requests /api/users/profile and unwraps the backend `data` envelope', async () => {
      const profile = { id: 'u1', name: 'Alexia' };
      mockGet.mockResolvedValueOnce({ data: { success: true, data: profile } } as never);

      await expect(getProfile()).resolves.toEqual(profile);
      expect(mockGet).toHaveBeenCalledWith('/api/users/profile');
    });

    it('returns the raw body when there is no `user` wrapper', async () => {
      mockGet.mockResolvedValueOnce({ data: { id: 'u2', name: 'Bare' } } as never);

      await expect(getProfile()).resolves.toEqual({ id: 'u2', name: 'Bare' });
    });

    it('keeps optional fields undefined when the API omits them', async () => {
      mockGet.mockResolvedValueOnce({ data: { user: { id: 'u3', name: 'Min' } } } as never);

      const profile = await getProfile();

      expect(profile.bio).toBeUndefined();
      expect(profile.minutesListened).toBeUndefined();
    });

    it('propagates request errors', async () => {
      mockGet.mockRejectedValueOnce(new Error('not found'));

      await expect(getProfile()).rejects.toThrow('not found');
    });
  });

  describe('updateProfile', () => {
    it('puts the payload to the profile endpoint and unwraps `user`', async () => {
      const user = { id: 'u1', ...payload };
      mockPut.mockResolvedValueOnce({ data: { user } } as never);

      await expect(updateProfile(payload)).resolves.toEqual(user);
      expect(mockPut).toHaveBeenCalledWith(API_ENDPOINTS.USER_PROFILE, payload);
    });

    it('skips the website check when no website is given', async () => {
      mockPut.mockResolvedValueOnce({ data: { id: 'u1' } } as never);

      await updateProfile({ ...payload, website: '' });

      expect(mockPut).toHaveBeenCalledTimes(1);
    });

    it('rejects an invalid website without calling the API', async () => {
      await expect(
        updateProfile({ ...payload, website: 'https://user:pass@example.com' })
      ).rejects.toThrow('Website must be a valid HTTP(S) URL without credentials.');

      expect(mockPut).not.toHaveBeenCalled();
    });

    it('propagates API errors from the update call', async () => {
      mockPut.mockRejectedValueOnce(new Error('server error'));

      await expect(updateProfile(payload)).rejects.toThrow('server error');
    });
  });
});
