'use client';

import { useEffect, useRef, useState } from 'react';
import { useLoading } from '@/context/LoadingContext';
import { usePlayback } from '@/context/PlaybackContext';
import {
  ANNOUNCEMENT_EVENT,
  AnnouncementDetail,
  useAnnounce,
} from '@/hooks/useAnnounce';

type LiveMessage = {
  id: number;
  message: string;
};

export default function AccessibilityAnnouncer() {
  const { playlist, currentIndex, queue, trackError } = usePlayback();
  const { isAnyLoading } = useLoading();
  const announce = useAnnounce();
  const [politeMessage, setPoliteMessage] = useState<LiveMessage>({ id: 0, message: '' });
  const [assertiveMessage, setAssertiveMessage] = useState<LiveMessage>({
    id: 0,
    message: '',
  });
  const previousTrackId = useRef<string | null>(null);
  const previousQueueLength = useRef<number | null>(null);
  const previousLoading = useRef(false);

  useEffect(() => {
    const handleAnnouncement = (event: Event) => {
      const detail = (event as CustomEvent<AnnouncementDetail>).detail;
      if (!detail?.message) return;

      if (detail.priority === 'assertive') {
        setAssertiveMessage((previous) => ({ id: previous.id + 1, message: detail.message }));
      } else {
        setPoliteMessage((previous) => ({ id: previous.id + 1, message: detail.message }));
      }
    };

    window.addEventListener(ANNOUNCEMENT_EVENT, handleAnnouncement);
    return () => window.removeEventListener(ANNOUNCEMENT_EVENT, handleAnnouncement);
  }, []);

  useEffect(() => {
    const track = playlist[currentIndex];
    if (!track || previousTrackId.current === null) {
      previousTrackId.current = track?.id ?? null;
      return;
    }

    if (track.id !== previousTrackId.current) {
      announce(`Now playing ${track.title} by ${track.artist}`, 'polite');
      previousTrackId.current = track.id;
    }
  }, [announce, currentIndex, playlist]);

  useEffect(() => {
    if (previousQueueLength.current === null) {
      previousQueueLength.current = queue.length;
      return;
    }

    if (queue.length !== previousQueueLength.current) {
      const count = queue.length === 1 ? '1 track' : `${queue.length} tracks`;
      announce(`Queue updated. ${count} in queue.`, 'polite');
      previousQueueLength.current = queue.length;
    }
  }, [announce, queue.length]);

  useEffect(() => {
    if (trackError) announce(trackError, 'assertive');
  }, [announce, trackError]);

  useEffect(() => {
    const loading = isAnyLoading();
    if (previousLoading.current && !loading) announce('Loading complete', 'polite');
    previousLoading.current = loading;
  }, [announce, isAnyLoading, isAnyLoading()]);

  return (
    <>
      <div
        key={`polite-${politeMessage.id}`}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {politeMessage.message}
      </div>
      <div
        key={`assertive-${assertiveMessage.id}`}
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {assertiveMessage.message}
      </div>
    </>
  );
}
