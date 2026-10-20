import apiClient, { NotFoundError } from './apiClient';
import { API_ENDPOINTS } from './constants';
import { unwrap } from './api/unwrap';

interface LyricsPayload {
  lyrics?: unknown;
  language?: string;
}

/**
 * GET /api/song/:id/lyrics → `{ success, data: { lyrics, language? } }`.
 * Resolves to `null` when there are no lyrics to show: the backend answers 404
 * both for a song without lyrics and for lyrics whose rights are not confirmed.
 */
export async function fetchSongLyrics(songId: string): Promise<string | null> {
  try {
    const res = await apiClient.get(API_ENDPOINTS.SONG_LYRICS(songId));
    const payload = unwrap<LyricsPayload | null>(res);
    return typeof payload?.lyrics === 'string' && payload.lyrics.trim() ? payload.lyrics : null;
  } catch (error) {
    if (error instanceof NotFoundError) return null;
    throw error;
  }
}
