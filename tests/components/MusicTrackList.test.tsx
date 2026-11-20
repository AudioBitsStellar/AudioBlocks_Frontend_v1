import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TrackList from '@/components/music/TrackList';
import { DEFAULT_PREFERENCES, UserPreferencesProvider } from '@/context/UserPreferencesContext';
import { submitReport } from '@/lib/reportService';
import { hasAuthSession } from '@/lib/session';
import type { Track } from '@/context/PlaybackContext';

const playTrack = vi.fn();
const addToQueue = vi.fn();
// `@/context/PlaybackContext` has a pre-existing duplicate `const value` /
// undefined `actions` reference (unrelated to #854/#855) that makes the real
// PlaybackProvider fail to even parse under Vite; mock usePlayback instead of
// going through it, same workaround already used by
// tests/components/TrackList.test.tsx for the dashboard TrackList.
vi.mock('@/context/PlaybackContext', () => ({
  usePlayback: () => ({ playTrack, addToQueue }),
}));

vi.mock('@/lib/apiClient', () => ({
  default: { get: vi.fn().mockResolvedValue({}), put: vi.fn().mockResolvedValue({}) },
}));

vi.mock('@/lib/reportService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/reportService')>();
  return { ...actual, submitReport: vi.fn() };
});

vi.mock('@/lib/session', () => ({
  hasAuthSession: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const mockSubmit = vi.mocked(submitReport);
const mockHasSession = vi.mocked(hasAuthSession);

function renderList(tracks: Track[], allowExplicit?: boolean) {
  if (allowExplicit !== undefined) {
    localStorage.setItem(
      'audioblocks_user_preferences',
      JSON.stringify({ ...DEFAULT_PREFERENCES, showExplicitContent: allowExplicit })
    );
  }

  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <UserPreferencesProvider>{children}</UserPreferencesProvider>
      </QueryClientProvider>
    );
  }

  return render(<TrackList tracks={tracks} />, { wrapper: Wrapper });
}

describe('TrackList content safety and reporting (#854, #855)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasSession.mockReturnValue(true);
    mockSubmit.mockResolvedValue(undefined);
    localStorage.clear();
  });

  it('marks an explicit track with an [E] badge', () => {
    renderList([{ id: 't1', title: 'Loud Song', artist: 'Artist', cover: '', explicit: true }], true);
    expect(screen.getByLabelText('Explicit content')).toBeInTheDocument();
  });

  it('hides playback for an explicit track when the preference is off', () => {
    renderList(
      [{ id: 't1', title: 'Loud Song', artist: 'Artist', cover: '', explicit: true }],
      false
    );

    expect(screen.getByText('Hidden')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Play Loud Song' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Queue Loud Song' })).toBeDisabled();
  });

  it('plays an explicit track once the preference is on', () => {
    renderList(
      [{ id: 't1', title: 'Loud Song', artist: 'Artist', cover: '', explicit: true }],
      true
    );

    expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Play Loud Song' })).toBeEnabled();
  });

  it('opens the report dialog from a track row and submits a report', async () => {
    renderList([{ id: 't1', title: 'Some Song', artist: 'Artist', cover: '' }]);

    fireEvent.click(screen.getByRole('button', { name: 'Report Some Song' }));
    fireEvent.change(await screen.findByLabelText('Reason'), { target: { value: 'copyright' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit report' }));

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith({ kind: 'song', id: 't1' }, 'copyright', '');
    });
  });

  it('still allows reporting a track that is hidden by the explicit filter', () => {
    renderList(
      [{ id: 't1', title: 'Loud Song', artist: 'Artist', cover: '', explicit: true }],
      false
    );

    expect(screen.getByRole('button', { name: 'Report Loud Song' })).toBeEnabled();
  });
});
