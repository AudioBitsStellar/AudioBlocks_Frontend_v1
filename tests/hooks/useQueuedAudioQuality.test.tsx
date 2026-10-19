import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlaybackProvider, usePlayback } from '@/context/PlaybackContext';
import { DEFAULT_PREFERENCES, UserPreferencesProvider } from '@/context/UserPreferencesContext';
import { useQueuedAudio } from '@/hooks/useQueuedAudio';
import { attachAudioSource } from '@/lib/hlsPlayer';

vi.mock('@/lib/hlsPlayer', () => ({
  attachAudioSource: vi.fn(() => ({ resume: vi.fn(), destroy: vi.fn(), setMaxBitrate: vi.fn() })),
}));

function Harness() {
  const { deckARef, deckBRef } = useQueuedAudio();
  const { playTracks } = usePlayback();
  return (
    <>
      <audio ref={deckARef} data-testid="a" />
      <audio ref={deckBRef} data-testid="b" />
      <button
        onClick={() => playTracks([{ id: 'one', title: 'One', artist: '', cover: '' }])}
      >
        Start
      </button>
    </>
  );
}

function renderHarness() {
  return render(
    <UserPreferencesProvider>
      <PlaybackProvider>
        <Harness />
      </PlaybackProvider>
    </UserPreferencesProvider>
  );
}

/** Options passed to the most recent `attachAudioSource` call. */
function lastSourceOptions() {
  const calls = vi.mocked(attachAudioSource).mock.calls;
  return calls[calls.length - 1]?.[2];
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('streaming quality cap in the queued audio hook (#590)', () => {
  it('passes the data saver ceiling to the HLS source when that setting is saved', async () => {
    localStorage.setItem(
      'audioblocks_user_preferences',
      JSON.stringify({ ...DEFAULT_PREFERENCES, audioQuality: 'data-saver' })
    );
    renderHarness();
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    await waitFor(() => expect(attachAudioSource).toHaveBeenCalled());
    expect(lastSourceOptions()).toMatchObject({ maxBitrateKbps: 64 });
  });

  it('leaves Auto uncapped when Save-Data and the data saver toggle are off', async () => {
    renderHarness();
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    await waitFor(() => expect(attachAudioSource).toHaveBeenCalled());
    expect(lastSourceOptions()?.maxBitrateKbps).toBeUndefined();
  });

  it('maps a legacy saved "medium" setting to Normal (128 kbps)', async () => {
    localStorage.setItem(
      'audioblocks_user_preferences',
      JSON.stringify({ ...DEFAULT_PREFERENCES, audioQuality: 'medium' })
    );
    renderHarness();
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    await waitFor(() => expect(attachAudioSource).toHaveBeenCalled());
    expect(lastSourceOptions()).toMatchObject({ maxBitrateKbps: 128 });
  });
});
