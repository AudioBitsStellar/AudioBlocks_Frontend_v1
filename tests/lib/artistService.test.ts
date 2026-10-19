import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '@/mocks/server';
import { fetchArtistProfile, getArtistPerks, getArtistSongs } from '@/lib/artistService';

describe('fetchArtistProfile', () => {
  it('resolves to null for an unknown artist so the page can 404', async () => {
    server.use(
      http.get('*/api/users/:id/public', () =>
        HttpResponse.json({ success: false, message: 'User not found' }, { status: 404 })
      )
    );
    await expect(fetchArtistProfile('missing')).resolves.toBeNull();
  });

  it('unwraps the public profile from the backend envelope', async () => {
    server.use(
      http.get('*/api/users/:id/public', () =>
        HttpResponse.json({
          success: true,
          data: { id: 'a1', username: 'alexia', name: 'Alexia', bio: null, website: null },
        })
      )
    );
    await expect(fetchArtistProfile('a1')).resolves.toMatchObject({ id: 'a1', name: 'Alexia' });
  });

  it('throws on server errors instead of reporting a missing artist', async () => {
    server.use(
      http.get('*/api/users/:id/public', () =>
        HttpResponse.json({ success: false, message: 'boom' }, { status: 500 })
      )
    );
    await expect(fetchArtistProfile('a1')).rejects.toThrow('Unable to load this artist');
  });
});

describe('getArtistSongs', () => {
  it('asks the song endpoint for the artist and returns the list', async () => {
    let requested: URL | undefined;
    server.use(
      http.get('*/api/song', ({ request }) => {
        requested = new URL(request.url);
        return HttpResponse.json({
          success: true,
          data: [{ id: 's1', title: 'First', status: 'ready', streamUrl: '/stream/s1' }],
          pagination: { page: 1, limit: 50, total: 1, totalPages: 1 },
        });
      })
    );
    const songs = await getArtistSongs('a1');
    expect(requested?.searchParams.get('artistId')).toBe('a1');
    expect(songs).toEqual([expect.objectContaining({ id: 's1', title: 'First' })]);
  });
});

describe('getArtistPerks', () => {
  it('drops perks without a title', async () => {
    server.use(
      http.get('*/api/artists/:id/perks', () =>
        HttpResponse.json({
          success: true,
          data: [{ id: 'p1', title: 'Early access' }, { id: 'p2', title: '  ' }, { id: 'p3' }],
        })
      )
    );
    const perks = await getArtistPerks('a1');
    expect(perks.map((perk) => perk.id)).toEqual(['p1']);
  });
});
