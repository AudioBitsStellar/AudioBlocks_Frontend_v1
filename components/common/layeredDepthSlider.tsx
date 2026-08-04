'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SlideItem {
  id: number;
  title: string;
  subtitle: string;
  color: string;
  gradient: string;
  textColor?: string;
}

interface LayeredDepthSliderProps {
  slides?: SlideItem[];
  interval?: number;
  pauseOnHover?: boolean;
  showControls?: boolean;
  showProgress?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const defaultSlides: SlideItem[] = [
  {
    id: 1,
    title: 'Mountain Peak',
    subtitle: 'Breathtaking alpine adventures await',
    color: 'bg-blue-600',
    gradient: 'from-blue-500 via-blue-600 to-indigo-700',
    textColor: 'text-white',
  },
  {
    id: 2,
    title: 'Ocean Waves',
    subtitle: 'Dive into crystal clear waters',
    color: 'bg-teal-600',
    gradient: 'from-teal-400 via-teal-600 to-cyan-700',
    textColor: 'text-white',
  },
  {
    id: 3,
    title: 'Forest Trail',
    subtitle: 'Walk through ancient woodlands',
    color: 'bg-green-600',
    gradient: 'from-green-500 via-green-600 to-emerald-700',
    textColor: 'text-white',
  },
  {
    id: 4,
    title: 'Desert Sunset',
    subtitle: 'Golden horizons stretch endlessly',
    color: 'bg-orange-600',
    gradient: 'from-orange-400 via-orange-600 to-red-700',
    textColor: 'text-white',
  },
  {
    id: 5,
    title: 'City Lights',
    subtitle: 'Urban energy pulses through the night',
    color: 'bg-purple-600',
    gradient: 'from-purple-500 via-purple-600 to-pink-700',
    textColor: 'text-white',
  },
  {
    id: 6,
    title: 'Arctic Ice',
    subtitle: 'Pristine wilderness in frozen beauty',
    color: 'bg-cyan-600',
    gradient: 'from-cyan-400 via-cyan-600 to-blue-700',
    textColor: 'text-white',
  },
];

export default function LayeredDepthSlider({
  slides = defaultSlides,
  interval = 4000,
  pauseOnHover = true,
  showControls = true,
  showProgress = true,
  size = 'md',
}: LayeredDepthSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef<NodeJS.Timeout | null>(null);

  // Size configurations
  const sizeConfig = {
    sm: { width: 'w-80', height: 'h-48', text: 'text-lg' },
    md: { width: 'w-96', height: 'h-64', text: 'text-xl' },
    lg: { width: 'w-[28rem]', height: 'h-80', text: 'text-2xl' },
  };

  const config = sizeConfig[size];

  // Auto-advance slides
  useEffect(() => {
    if (isHovered && pauseOnHover) return;

    intervalRef.current = setInterval(() => {
      slideNext();
    }, interval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [currentIndex, interval, isHovered, pauseOnHover, slideNext]);

  // Progress animation
  useEffect(() => {
    if (isHovered && pauseOnHover) return;

    setProgress(0);
    const startTime = Date.now();

    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / interval) * 100, 100);
      setProgress(newProgress);

      if (newProgress < 100) {
        progressRef.current = setTimeout(updateProgress, 16); // ~60fps
      }
    };

    updateProgress();

    return () => {
      if (progressRef.current) clearTimeout(progressRef.current);
    };
  }, [currentIndex, interval, isHovered, pauseOnHover]);

  const slideNext = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentIndex((prev) => (prev + 1) % slides.length);
    setProgress(0);
    setTimeout(() => setIsAnimating(false), 800);
  }, [isAnimating, slides.length]);

  const slidePrev = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
    setProgress(0);
    setTimeout(() => setIsAnimating(false), 800);
  };

  const goToSlide = (index: number) => {
    if (index !== currentIndex && !isAnimating) {
      setIsAnimating(true);
      setCurrentIndex(index);
      setProgress(0);
      setTimeout(() => setIsAnimating(false), 800);
    }
  };

  const handleMouseEnter = () => {
    if (pauseOnHover) {
      setIsHovered(true);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (progressRef.current) clearTimeout(progressRef.current);
    }
  };

  const handleMouseLeave = () => {
    if (pauseOnHover) {
      setIsHovered(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-6">
      {/* Main Slider Container */}
      <div
        className={`relative ${config.width} ${config.height} perspective-1000`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="relative w-full h-full preserve-3d">
          {slides.map((slide, index) => {
            const offset = (index - currentIndex + slides.length) % slides.length;

            // Calculate transform values for layered depth effect
            let translateX = 0;
            let translateY = 0;
            let translateZ = 0;
            let scale = 1;
            let opacity = 1;
            let zIndex = 0;
            let rotateY = 0;
            let blur = 0;

            if (offset === 0) {
              // Active slide - front and center
              zIndex = 50;
              scale = 1;
              opacity = 1;
            } else if (offset === 1) {
              // Next slide - right side, slightly behind
              translateX = 40;
              translateY = 10;
              translateZ = -30;
              scale = 0.92;
              opacity = 0.85;
              zIndex = 40;
              rotateY = -8;
            } else if (offset === slides.length - 1) {
              // Previous slide - left side, slightly behind
              translateX = -40;
              translateY = 10;
              translateZ = -30;
              scale = 0.92;
              opacity = 0.85;
              zIndex = 40;
              rotateY = 8;
            } else if (offset === 2) {
              // Second next - further right and back
              translateX = 70;
              translateY = 20;
              translateZ = -60;
              scale = 0.84;
              opacity = 0.7;
              zIndex = 30;
              rotateY = -15;
              blur = 1;
            } else if (offset === slides.length - 2) {
              // Second previous - further left and back
              translateX = -70;
              translateY = 20;
              translateZ = -60;
              scale = 0.84;
              opacity = 0.7;
              zIndex = 30;
              rotateY = 15;
              blur = 1;
            } else {
              // Far background slides
              translateX = 0;
              translateY = 30;
              translateZ = -100;
              scale = 0.76;
              opacity = 0.5;
              zIndex = 20;
              blur = 2;
            }

            return (
              <div
                key={slide.id}
                className={`absolute inset-0 transition-all duration-800 ease-out cursor-pointer`}
                style={{
                  transform: `
                    translateX(${translateX}px) 
                    translateY(${translateY}px) 
                    translateZ(${translateZ}px) 
                    scale(${scale}) 
                    rotateY(${rotateY}deg)
                  `,
                  opacity,
                  zIndex,
                  filter: blur > 0 ? `blur(${blur}px)` : 'none',
                  transitionTimingFunction: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                }}
                onClick={() => goToSlide(index)}
              >
                <div
                  className={`w-full h-full bg-gradient-to-br ${slide.gradient} rounded-2xl shadow-2xl overflow-hidden relative group`}
                  style={{
                    boxShadow:
                      offset === 0
                        ? '0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)'
                        : '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.05)',
                  }}
                >
                  {/* Background Pattern */}
                  <div
                    className="absolute inset-0 opacity-20"
                    style={{
                      backgroundImage: `
                        radial-gradient(circle at 25% 25%, rgba(255,255,255,0.3) 0%, transparent 50%),
                        radial-gradient(circle at 75% 75%, rgba(255,255,255,0.2) 0%, transparent 50%)
                      `,
                    }}
                  />

                  {/* Content */}
                  <div
                    className={`absolute inset-0 p-6 flex flex-col justify-between ${slide.textColor || 'text-white'}`}
                  >
                    {/* Top Section - Icon/Logo Area */}
                    <div className="space-y-2">
                      <div className="w-12 h-12 bg-white/20 rounded-xl backdrop-blur-sm flex items-center justify-center">
                        <div className="w-6 h-6 bg-white/40 rounded-lg" />
                      </div>
                    </div>

                    {/* Bottom Section - Text Content */}
                    <div className="space-y-3">
                      <h3 className={`${config.text} font-bold leading-tight`}>{slide.title}</h3>
                      <p className="text-white/90 text-sm leading-relaxed">{slide.subtitle}</p>

                      {/* Progress bar for active slide */}
                      {offset === 0 && showProgress && (
                        <div className="flex items-center space-x-3 pt-2">
                          <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-white transition-all duration-100 ease-linear"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-white/70 font-medium min-w-[2rem]">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Navigation Controls */}
        {showControls && (
          <>
            <Button
              className="absolute left-4 top-1/2 transform -translate-y-1/2 z-60 bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm"
              disabled={isAnimating}
              size="icon"
              variant="outline"
              onClick={slidePrev}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <Button
              className="absolute right-4 top-1/2 transform -translate-y-1/2 z-60 bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm"
              disabled={isAnimating}
              size="icon"
              variant="outline"
              onClick={slideNext}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      {/* Slide Indicators */}
      <div className="flex space-x-2">
        {slides.map((_, index) => (
          <button
            key={index}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              index === currentIndex ? 'bg-blue-500 scale-110' : 'bg-gray-300 hover:bg-gray-400'
            }`}
            onClick={() => goToSlide(index)}
          />
        ))}
      </div>

      {/* Status Display */}
      <div className="text-center space-y-1">
        <div className="text-lg font-semibold text-gray-800">
          {String(currentIndex + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
        </div>
        <div className="text-sm text-gray-500">
          {isHovered && pauseOnHover ? 'Paused' : 'Auto-playing'}
        </div>
      </div>
    </div>
  );
}
