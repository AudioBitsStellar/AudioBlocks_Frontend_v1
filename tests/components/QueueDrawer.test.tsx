import type { ReactNode } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueueDrawer } from '@/components/common/QueueDrawer';
import { PlaybackProvider, type Track } from '@/context/PlaybackContext';
import { ANNOUNCEMENT_EVENT, type AnnouncementDetail } from '@/hooks/useAnnounce';

vi.mock('next/image', () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={src} />
  ),
}));

const track = (n: number): Track => ({
  id: `t${n}`,
  title: `Song ${n}`,
  artist: `Artist ${n}`,
  cover: '/cover.jpg',
  url: `https://audio.example/${n}.mp3`,
});

function renderDrawer(count = 3) {
  localStorage.setItem(
    'audioblocks_queue',
    JSON.stringify(Array.from({ length: count }, (_, i) => track(i + 1)))
  );
  const wrapper = ({ children }: { children: ReactNode }) => (
    <PlaybackProvider>{children}</PlaybackProvider>
  );
  return render(<QueueDrawer open onOpenChange={() => {}} />, { wrapper });
}

const titles = () =>
  screen.getAllByRole('listitem').map((li) => within(li).getByText(/^Song \d+$/).textContent);

let announcements: string[];
const onAnnounce = (e: Event) =>
  announcements.push((e as CustomEvent<AnnouncementDetail>).detail.message);

beforeEach(() => {
  localStorage.clear();
  announcements = [];
  window.addEventListener(ANNOUNCEMENT_EVENT, onAnnounce);
});

afterEach(() => {
  window.removeEventListener(ANNOUNCEMENT_EVENT, onAnnounce);
});

describe('QueueDrawer keyboard and touch reordering (#744)', () => {
  it('offers Move up / Move down buttons on every row', () => {
    renderDrawer();

    for (const n of [1, 2, 3]) {
      expect(screen.getByRole('button', { name: `Move Song ${n} up` })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: `Move Song ${n} down` })).toBeInTheDocument();
    }
  });

  it('disables moving the first track up and the last track down', () => {
    renderDrawer();

    expect(screen.getByRole('button', { name: 'Move Song 1 up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Song 3 down' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Song 2 up' })).toBeEnabled();
  });

  it('moves a track down with the keyboard (Enter on the focused button)', async () => {
    const user = userEvent.setup();
    renderDrawer();

    screen.getByRole('button', { name: 'Move Song 1 down' }).focus();
    await user.keyboard('{Enter}');

    expect(titles()).toEqual(['Song 2', 'Song 1', 'Song 3']);
  });

  it('moves a track up', async () => {
    const user = userEvent.setup();
    renderDrawer();

    await user.click(screen.getByRole('button', { name: 'Move Song 3 up' }));

    expect(titles()).toEqual(['Song 1', 'Song 3', 'Song 2']);
  });

  it('works with a plain tap (touch has no drag-and-drop)', () => {
    renderDrawer();

    fireEvent.click(screen.getByRole('button', { name: 'Move Song 2 down' }));

    expect(titles()).toEqual(['Song 1', 'Song 3', 'Song 2']);
  });

  it('announces the new position', async () => {
    const user = userEvent.setup();
    renderDrawer(5);

    await user.click(screen.getByRole('button', { name: 'Move Song 1 down' }));
    await user.click(screen.getByRole('button', { name: 'Move Song 3 up' }));

    expect(announcements).toEqual([
      "Moved 'Song 1' to position 2 of 5",
      "Moved 'Song 3' to position 2 of 5",
    ]);
  });

  it('keeps focus on the moved track so repeated presses keep moving it', async () => {
    const user = userEvent.setup();
    renderDrawer();

    screen.getByRole('button', { name: 'Move Song 1 down' }).focus();
    await user.keyboard('{Enter}{Enter}');

    expect(titles()).toEqual(['Song 2', 'Song 3', 'Song 1']);
    // At the end of the list the "down" button is disabled, so focus moves to "up".
    expect(screen.getByRole('button', { name: 'Move Song 1 up' })).toHaveFocus();
  });

  it('persists the new order through the reducer (reorderQueue)', async () => {
    const user = userEvent.setup();
    renderDrawer();

    await user.click(screen.getByRole('button', { name: 'Move Song 1 down' }));

    const saved = JSON.parse(localStorage.getItem('audioblocks_queue') ?? '[]') as Track[];
    expect(saved.map((t) => t.id)).toEqual(['t2', 't1', 't3']);
  });

  it('no longer exposes a focusable grip that does nothing', () => {
    renderDrawer();

    expect(screen.queryByRole('button', { name: /drag to reorder/i })).not.toBeInTheDocument();
  });
});
