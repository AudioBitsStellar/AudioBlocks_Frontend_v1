import apiClient from './apiClient';
import { API_ENDPOINTS } from './constants';
import { songToTrack, type SongResponse } from './tracks';
import type { Track } from '@/context/PlaybackContext';

/** Results requested per page from GET /api/song/search. */
export const SEARCH_PAGE_SIZE = 20;

export interface SearchArtist {
  id: string;
  name: string;
  image?: string;
}

export interface SongSearchPage {
  songs: Track[];
  artists: SearchArtist[];
  /** Next page number to request, or null when there are no more results. */
  nextPage: number | null;
}

export interface SongSearchParams {
  q: string;
  genre?: string | null;
  page?: number;
  limit?: number;
  signal?: AbortSignal;
}

/** Query string for GET /api/song/search (q, optional genre, page, limit). */
export function buildSongSearchUrl({ q, genre, page = 1, limit = SEARCH_PAGE_SIZE }: SongSearchParams): string {
  const params = new URLSearchParams({ q: q.trim(), page: String(page), limit: String(limit) });
  if (genre && genre.trim()) params.set('genre', genre.trim());
  return `${API_ENDPOINTS.SONG_SEARCH}?${params.toString()}`;
}

type RawArtist = { id?: string | number; _id?: string; name?: string; username?: string; image?: string; avatar?: string };

function toArtist(a: RawArtist): SearchArtist | null {
  const id = a.id ?? a._id;
  const name = a.name ?? a.username;
  if (id === undefined || !name) return null;
  return { id: String(id), name, image: a.image ?? a.avatar };
}

/**
 * Searches songs (and artists, when the backend includes them).
 *
 * Accepts the response shapes the API uses elsewhere: a bare array, or an
 * object with the songs under `data`/`songs`/`results`, optional `artists`,
 * and pagination via `nextPage`, `hasMore`, or `total`. When none of those are
 * present, a full page is taken to mean another page may exist.
 */
export async function searchSongs(params: SongSearchParams): Promise<SongSearchPage> {
  const page = params.page ?? 1;
  const limit = params.limit ?? SEARCH_PAGE_SIZE;
  const res = await apiClient.get(buildSongSearchUrl({ ...params, page, limit }), { signal: params.signal });
  const body = res.data ?? {};
  const payload = body && !Array.isArray(body) && typeof body.data === 'object' && !Array.isArray(body.data) && body.data !== null ? body.data : body;

  const rawSongs: unknown = Array.isArray(payload)
    ? payload
    : (payload.songs ?? payload.results ?? (Array.isArray(body.data) ? body.data : []));
  const songs = Array.isArray(rawSongs)
    ? (rawSongs as SongResponse[]).filter((s) => s && s.id !== undefined).map((s) => songToTrack(s))
    : [];

  const rawArtists: unknown = Array.isArray(payload) ? [] : payload.artists;
  const artists = Array.isArray(rawArtists)
    ? (rawArtists as RawArtist[]).map(toArtist).filter((a): a is SearchArtist => a !== null)
    : [];

  const meta = Array.isArray(payload) ? {} : { ...body, ...payload };
  let nextPage: number | null;
  if (typeof meta.nextPage === 'number') nextPage = meta.nextPage;
  else if (meta.nextPage === null) nextPage = null;
  else if (typeof meta.hasMore === 'boolean') nextPage = meta.hasMore ? page + 1 : null;
  else if (typeof meta.total === 'number') nextPage = page * limit < meta.total ? page + 1 : null;
  else nextPage = songs.length >= limit ? page + 1 : null;

  return { songs, artists, nextPage };
}
