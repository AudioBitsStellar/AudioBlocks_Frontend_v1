'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NatureSlide {
  id: number;
  title: string;
  description: string;
  artist: string;
  image: string;
  gradient: string;
  textColor?: string;
}

interface NatureDepthSliderProps {
  interval?: number;
  showControls?: boolean;
  showProgress?: boolean;
  autoPlay?: boolean;
}

const natureSlides: NatureSlide[] = [
  {
    id: 1,
    title: 'Music My Way',
    description:
      'Dancing lights paint the arctic sky in ethereal colors, making music that make the stars dance',
    artist: 'Northern Norway',
    image: '/nft.svg',
    gradient: '1000 Bids',
  },
  {
    id: 2,
    title: 'Coral Reef Paradise',
    description:
      'Underwater wonderland teeming with vibrant marine life, a symphony of colors and sounds',
    artist: 'Wiffi Drips',
    image: '/wif.jpg',
    gradient: '5000 Bids',
  },
  {
    id: 3,
    title: 'SILWY',
    description:
      "Raw power of earth's molten core creating new landscapes, a fiery dance of creation",
    artist: 'Mchivir',
    image: '/chilli.jpg',
    gradient: '2000 Bids',
  },
];

function getReducedMotionPreference(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export default function NatureDepthSlider({
  interval = 5000,
  showControls = true,
  showProgress = true,
  autoPlay = true,
}: NatureDepthSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(getReducedMotionPreference);
  const [isPlaying, setIsPlaying] = useState(() => autoPlay && !getReducedMotionPreference());
  const [progress, setProgress] = useState(0);

  const goToSlide = (index: number) => {
    setCurrentIndex((index + natureSlides.length) % natureSlides.length);
    setProgress(0);
  };

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (event: MediaQueryListEvent) => {
      setReducedMotion(event.matches);
      setIsPlaying(autoPlay && !event.matches);
      if (event.matches) setProgress(0);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [autoPlay]);

  useEffect(() => {
    if (!autoPlay || reducedMotion || !isPlaying || natureSlides.length < 2) return;

    const progressTimer = window.setInterval(() => {
      setProgress((value) => Math.min(100, value + 100 / Math.max(1, interval / 100)));
    }, 100);
    const slideTimer = window.setInterval(() => {
      setCurrentIndex((index) => (index + 1) % natureSlides.length);
      setProgress(0);
    }, interval);

    return () => {
      window.clearInterval(progressTimer);
      window.clearInterval(slideTimer);
    };
  }, [autoPlay, interval, isPlaying, reducedMotion]);

  const slide = natureSlides[currentIndex];

  return (
    <section
      aria-label="Featured marketplace items"
      className="relative overflow-hidden rounded-xl"
    >
      <div className="relative min-h-[420px]">
        <Image
          fill
          alt={slide.title}
          className="object-cover"
          priority={currentIndex === 0}
          src={slide.image}
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 flex min-h-[420px] flex-col justify-end p-6 text-white md:p-10">
          <p className="text-sm font-medium">{slide.artist}</p>
          <h2 className="mt-2 text-3xl font-bold">{slide.title}</h2>
          <p className="mt-3 max-w-xl text-sm text-white/80">{slide.description}</p>
          <p className="mt-4 font-semibold">{slide.gradient}</p>
        </div>
      </div>

      {showControls && (
        <div className="absolute inset-x-0 top-1/2 z-20 flex -translate-y-1/2 justify-between px-4">
          <Button
            aria-label="Previous slide"
            size="icon"
            type="button"
            variant="outline"
            onClick={() => goToSlide(currentIndex - 1)}
          >
            <ArrowLeft />
          </Button>
          <Button
            aria-label="Next slide"
            size="icon"
            type="button"
            variant="outline"
            onClick={() => goToSlide(currentIndex + 1)}
          >
            <ArrowRight />
          </Button>
        </div>
      )}

      {showProgress && (
        <div aria-hidden="true" className="absolute bottom-0 left-0 right-0 z-20 h-1 bg-white/20">
          <div className="h-full bg-white" style={{ width: `${reducedMotion ? 0 : progress}%` }} />
        </div>
      )}
    </section>
  );
}
