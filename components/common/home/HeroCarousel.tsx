'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import Cookies from 'js-cookie';
import { ArrowLeft, ArrowRight, Pause, Play } from 'lucide-react';
import { useAccount } from 'wagmi';
import { usePlayback, type Track } from '@/context/PlaybackContext';
import { Auth } from '@/hooks/useAuth';
import FullScreenLoader from './FullScreenLoader';

type SpotlightItem = Track & {
  eyebrow: string;
  description: string;
  accent: string;
};

const spotlightItems: SpotlightItem[] = [
  {
    id: 'music-1',
    title: 'Bigger',
    artist: 'Wiffi Drips',
    cover: '/wif.jpg',
    eyebrow: 'Trending track',
    description: 'Turn up the energy with one of this week’s most collected sounds.',
    accent: '#D2045B',
  },
  {
    id: 'music-2',
    title: 'ASILW',
    artist: 'Mchivir',
    cover: '/chilli.jpg',
    eyebrow: 'Spotlight album',
    description: 'A fresh release from an independent voice making waves right now.',
    accent: '#885FA8',
  },
  {
    id: 'music-3',
    title: 'Bad Guy',
    artist: 'Soldier Cat',
    cover: '/cat.png',
    eyebrow: 'Fan favourite',
    description: 'Discover a standout record from the AudioBlocks community.',
    accent: '#B6195B',
  },
];

const PREVIEW_DURATION = 30;
const ROTATION_INTERVAL = 6000;

const HeroCarousel = () => {
  const { setShowAuthFlow } = useDynamicContext();
  const router = useRouter();
  const { isConnected } = useAccount();
  const { setShouldTriggerSignature, loading } = Auth();
  const { playTrack } = usePlayback();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const touchStartX = useRef<number | null>(null);

  const activeItem = spotlightItems[activeIndex];

  const stopPreview = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setIsPreviewing(false);
  }, []);

  const selectSlide = useCallback(
    (index: number) => {
      stopPreview();
      setActiveIndex((index + spotlightItems.length) % spotlightItems.length);
    },
    [stopPreview]
  );

  const nextSlide = useCallback(() => {
    selectSlide(activeIndex + 1);
  }, [activeIndex, selectSlide]);

  const previousSlide = useCallback(() => {
    selectSlide(activeIndex - 1);
  }, [activeIndex, selectSlide]);

  const togglePreview = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPreviewing) {
      stopPreview();
      return;
    }

    audio.currentTime = 0;
    audio.volume = 0.8;
    const playPromise = audio.play();
    if (playPromise) {
      playPromise.then(() => setIsPreviewing(true)).catch(() => setIsPreviewing(false));
    }
  }, [isPreviewing, stopPreview]);

  const handleStream = () => {
    const token = Cookies.get('audioblocks_jwt');
    if (!isConnected) {
      setShowAuthFlow(true);
      setShouldTriggerSignature(true);
    } else if (!token) {
      setShouldTriggerSignature(true);
    } else {
      router.push('/dashboard/profile/edit');
    }
  };

  useEffect(() => {
    if (isPaused) return;
    const timer = window.setInterval(nextSlide, ROTATION_INTERVAL);
    return () => window.clearInterval(timer);
  }, [isPaused, nextSlide]);

  useEffect(() => {
    stopPreview();
  }, [activeIndex, stopPreview]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const stopAtThirtySeconds = () => {
      if (audio.currentTime >= PREVIEW_DURATION) stopPreview();
    };
    audio.addEventListener('timeupdate', stopAtThirtySeconds);
    audio.addEventListener('ended', stopPreview);
    return () => {
      audio.removeEventListener('timeupdate', stopAtThirtySeconds);
      audio.removeEventListener('ended', stopPreview);
    };
  }, [stopPreview]);

  useEffect(() => () => stopPreview(), [stopPreview]);

  const handlePointerDown = (event: React.PointerEvent<HTMLElement>) => {
    touchStartX.current = event.clientX;
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLElement>) => {
    if (touchStartX.current === null) return;
    const distance = event.clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(distance) < 40) return;
    if (distance > 0) previousSlide();
    else nextSlide();
  };

  const handleMobilePreview = () => {
    if (window.matchMedia('(max-width: 767px)').matches) togglePreview();
  };

  return (
    <section
      aria-label="Trending music spotlight"
      className="relative mx-auto h-[280px] w-full overflow-hidden text-white md:h-[400px]"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setIsPaused(false);
      }}
      onFocus={() => setIsPaused(true)}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      <div aria-hidden="true" className="absolute inset-0 bg-[#100b10]" />
      <div
        aria-hidden="true"
        className="absolute -right-20 -top-32 h-96 w-96 rounded-full blur-[110px] transition-colors duration-700"
        style={{ backgroundColor: `${activeItem.accent}80` }}
      />

      <div className="relative mx-auto flex h-full w-11/12 max-w-7xl items-center justify-between gap-6 md:w-4/5">
        <div className="z-10 max-w-xl">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#F2AFC9] md:text-sm">
            {activeItem.eyebrow}
          </p>
          <h1 className="mb-1 text-2xl font-extrabold leading-tight md:text-5xl">
            {activeItem.title}
          </h1>
          <p className="mb-2 text-sm font-medium text-[#DACFD3] md:text-lg">{activeItem.artist}</p>
          <p className="mb-4 hidden max-w-md text-sm leading-relaxed text-[#DACFD3] md:block">
            {activeItem.description}
          </p>
          <div className="flex items-center gap-3">
            <button
              className="flex items-center gap-2 rounded-full bg-[#D2045B] px-4 py-2 text-sm font-medium transition hover:bg-[#B8043F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2AFC9] md:px-6"
              onClick={handleStream}
            >
              Stream Now
              <ArrowRight aria-hidden="true" size={16} />
            </button>
            <button
              className="flex items-center gap-2 rounded-full border border-[#F2AFC9] px-4 py-2 text-sm font-medium transition hover:bg-[#885FA8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2AFC9]"
              onClick={() => {
                playTrack(activeItem);
                stopPreview();
              }}
            >
              <Play aria-hidden="true" fill="currentColor" size={14} />
              Play track
            </button>
          </div>
        </div>

        <button
          aria-label={
            isPreviewing ? `Pause preview of ${activeItem.title}` : `Preview ${activeItem.title}`
          }
          className="group relative h-40 w-40 shrink-0 overflow-hidden rounded-2xl border border-white/30 shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2AFC9] md:h-64 md:w-64"
          type="button"
          onClick={handleMobilePreview}
          onMouseEnter={togglePreview}
          onMouseLeave={stopPreview}
        >
          <Image
            fill
            priority
            alt={`${activeItem.title} by ${activeItem.artist}`}
            className="object-cover transition duration-500 group-hover:scale-105"
            sizes="(max-width: 767px) 160px, 256px"
            src={activeItem.cover}
          />
          <span className="absolute inset-0 flex items-center justify-center bg-black/30">
            {isPreviewing ? <Pause fill="white" size={28} /> : <Play fill="white" size={28} />}
          </span>
          <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-1 text-[10px] uppercase tracking-wider">
            30 sec preview
          </span>
        </button>
      </div>

      <button
        aria-label="Previous spotlight"
        className="absolute left-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/40 p-2 transition hover:bg-[#D2045B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white md:left-6"
        type="button"
        onClick={previousSlide}
      >
        <ArrowLeft size={18} />
      </button>
      <button
        aria-label="Next spotlight"
        className="absolute right-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/40 p-2 transition hover:bg-[#D2045B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white md:right-6"
        type="button"
        onClick={nextSlide}
      >
        <ArrowRight size={18} />
      </button>

      <div
        aria-label="Spotlight slides"
        className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2"
        role="tablist"
      >
        {spotlightItems.map((item, index) => (
          <button
            key={item.id}
            aria-label={`Show ${item.title}`}
            aria-selected={index === activeIndex}
            className={`h-2 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${index === activeIndex ? 'w-7 bg-[#D2045B]' : 'w-2 bg-white/60'}`}
            role="tab"
            type="button"
            onClick={() => selectSlide(index)}
          />
        ))}
      </div>

      <audio
        ref={audioRef}
        aria-hidden="true"
        preload="none"
        src={`${process.env.NEXT_PUBLIC_API_URL || ''}/stream/${activeItem.id}`}
      />
      {loading && <FullScreenLoader />}
    </section>
  );
};

export default HeroCarousel;
