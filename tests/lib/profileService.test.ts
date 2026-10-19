import { http, HttpResponse } from 'msw';
import { describe, it, expect, vi, afterEach } from 'vitest';
import apiClient from '@/lib/apiClient';
import { API_ENDPOINTS } from '@/lib/constants';
import { getProfile, isValidProfileUrl, updateProfile } from '@/lib/profileService';
import { mockOwnProfileFixture } from '@/mocks/fixtures/users';
import { server } from '@/mocks/server';
import type { UpdateProfilePayload } from '@/lib/profileService';

const PROFILE_URL = `*${API_ENDPOINTS.USER_PROFILE}`;

const payload: UpdateProfilePayload = {
  name: 'Alexia Stephen',
  bio: 'Producer',
  website: 'https://alexia.example.com',
  twitter: '@alexia',
};

describe('profileService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
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
      await expect(getProfile()).resolves.toEqual(mockOwnProfileFixture);
    });

    it('returns the raw body when there is no `user` wrapper', async () => {
      server.use(http.get(PROFILE_URL, () => HttpResponse.json({ id: 'u2', name: 'Bare' })));

      await expect(getProfile()).resolves.toEqual({ id: 'u2', name: 'Bare' });
    });

    it('keeps optional fields undefined when the API omits them', async () => {
      server.use(
        http.get(PROFILE_URL, () => HttpResponse.json({ user: { id: 'u3', name: 'Min' } }))
      );

      const profile = await getProfile();

      expect(profile.bio).toBeUndefined();
      expect(profile.minutesListened).toBeUndefined();
    });

    it('propagates request errors', async () => {
      server.use(http.get(PROFILE_URL, () => new HttpResponse(null, { status: 404 })));

      await expect(getProfile()).rejects.toThrow();
    });
  });

  describe('updateProfile', () => {
    it('puts the payload to the profile endpoint and unwraps `user`', async () => {
      const { name, bio, website } = payload;

      await expect(updateProfile(payload)).resolves.toMatchObject({ name, bio, website });
    });

    it('skips the website check when no website is given', async () => {
      await expect(updateProfile({ ...payload, website: '' })).resolves.toMatchObject({
        website: '',
      });
    });

    it('rejects an invalid website without calling the API', async () => {
      const putSpy = vi.spyOn(apiClient, 'put');

      await expect(
        updateProfile({ ...payload, website: 'https://user:pass@example.com' })
      ).rejects.toThrow('Website must be a valid HTTP(S) URL without credentials.');

      expect(putSpy).not.toHaveBeenCalled();
    });

    it('propagates API errors from the update call', async () => {
      server.use(http.put(PROFILE_URL, () => new HttpResponse(null, { status: 404 })));

      await expect(updateProfile(payload)).rejects.toThrow();
    });
  });
});
