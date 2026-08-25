'use client';

import { useState, useEffect, useRef } from 'react';

interface Card {
  id: number;
  title: string;
  subtitle: string;
  color: string;
  gradient: string;
}

interface AutoStackedCardsProps {
  cards?: Card[];
  interval?: number;
  pauseOnHover?: boolean;
  showProgress?: boolean;
}

const defaultCards: Card[] = [
  {
    id: 1,
    title: 'Mountain Adventure',
    subtitle: 'Explore breathtaking peaks',
    color: 'bg-blue-500',
    gradient: 'from-blue-400 to-blue-600',
  },
  {
    id: 2,
    title: 'Ocean Depths',
    subtitle: 'Dive into crystal waters',
    color: 'bg-teal-500',
    gradient: 'from-teal-400 to-teal-600',
  },
  {
    id: 3,
    title: 'Forest Trails',
    subtitle: 'Walk through ancient woods',
    color: 'bg-green-500',
    gradient: 'from-green-400 to-green-600',
  },
  {
    id: 4,
    title: 'Desert Sunset',
    subtitle: 'Watch the golden horizon',
    color: 'bg-orange-500',
    gradient: 'from-orange-400 to-orange-600',
  },
  {
    id: 5,
    title: 'City Lights',
    subtitle: 'Experience urban energy',
    color: 'bg-purple-500',
    gradient: 'from-purple-400 to-purple-600',
  },
];

export default function AutoStackedCards({
  cards = defaultCards,
  interval = 4000,
  pauseOnHover = true,
  showProgress = true,
}: AutoStackedCardsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-advance cards
  useEffect(() => {
    if (isHovered && pauseOnHover) return;

    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % cards.length);
      setProgress(0); // Reset progress when card changes
    }, interval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [cards.length, interval, isHovered, pauseOnHover]);

  // Progress bar animation
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

  const handleCardClick = (index: number) => {
    if (index !== currentIndex) {
      setCurrentIndex(index);
      setProgress(0);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-6">
      {/* Main Card Stack */}
      <div
        className="relative w-80 h-96 cursor-pointer"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {cards.map((card, index) => {
          const position = (index - currentIndex + cards.length) % cards.length;
          const isActive = position === 0;
          const isNext = position === 1;
          const isPrev = position === cards.length - 1;
          const isSecondNext = position === 2;
          const isSecondPrev = position === cards.length - 2;

          // Calculate transform values for smooth stacking
          let translateX = 0;
          let translateY = 0;
          let scale = 1;
          let opacity = 1;
          let zIndex = 0;
          let rotateZ = 0;
          let blur = 0;

          if (isActive) {
            zIndex = 50;
            scale = 1;
            opacity = 1;
          } else if (isNext) {
            translateX = 12;
            translateY = 8;
            scale = 0.96;
            opacity = 0.85;
            zIndex = 40;
            rotateZ = 2;
          } else if (isPrev) {
            translateX = -12;
            translateY = 8;
            scale = 0.96;
            opacity = 0.85;
            zIndex = 40;
            rotateZ = -2;
          } else if (isSecondNext) {
            translateX = 24;
            translateY = 16;
            scale = 0.92;
            opacity = 0.7;
            zIndex = 30;
            rotateZ = 4;
            blur = 1;
          } else if (isSecondPrev) {
            translateX = -24;
            translateY = 16;
            scale = 0.92;
            opacity = 0.7;
            zIndex = 30;
            rotateZ = -4;
            blur = 1;
          } else {
            translateX = 0;
            translateY = 24;
            scale = 0.88;
            opacity = 0.5;
            zIndex = 20;
            blur = 2;
          }

          return (
            <div
              key={card.id}
              className={`absolute inset-0 transition-all duration-700 ease-out cursor-pointer`}
              style={{
                transform: `
                  translateX(${translateX}px) 
                  translateY(${translateY}px) 
                  scale(${scale}) 
                  rotateZ(${rotateZ}deg)
                `,
                opacity,
                zIndex,
                filter: blur > 0 ? `blur(${blur}px)` : 'none',
                transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
              }}
              onClick={() => handleCardClick(index)}
            >
              <div
                className={`w-full h-full bg-gradient-to-br ${card.gradient} rounded-2xl shadow-2xl overflow-hidden relative group`}
                style={{
                  boxShadow: isActive
                    ? '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1)'
                    : '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.05)',
                }}
              >
                {/* Card Content */}
                <div className="absolute inset-0 p-8 flex flex-col justify-between text-white">
                  {/* Top Section */}
                  <div className="space-y-2">
                    <div className="w-12 h-12 bg-white/20 rounded-xl backdrop-blur-sm flex items-center justify-center">
                      <div className="w-6 h-6 bg-white/40 rounded-lg" />
                    </div>
                  </div>

                  {/* Bottom Section */}
                  <div className="space-y-3">
                    <h3 className="text-2xl font-bold leading-tight">{card.title}</h3>
                    <p className="text-white/80 text-sm leading-relaxed">{card.subtitle}</p>

                    {/* Card number indicator */}
                    <div className="flex items-center space-x-2 pt-2">
                      <div className="w-8 h-1 bg-white/30 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-white transition-all duration-300"
                          style={{
                            width: isActive ? `${progress}%` : '0%',
                          }}
                        />
                      </div>
                      <span className="text-xs text-white/60 font-medium">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Subtle pattern overlay */}
                <div
                  className="absolute inset-0 opacity-10"
                  style={{
                    backgroundImage: `radial-gradient(circle at 20% 80%, rgba(255,255,255,0.2) 0%, transparent 50%), 
                                     radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 50%)`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress Indicators */}
      {showProgress && (
        <div className="flex space-x-3">
          {cards.map((_, index) => (
            <button
              key={index}
              className={`relative w-12 h-2 rounded-full overflow-hidden transition-all duration-300 ${
                index === currentIndex ? 'bg-gray-300' : 'bg-gray-200 hover:bg-gray-250'
              }`}
              onClick={() => handleCardClick(index)}
            >
              {index === currentIndex && (
                <div
                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-75 ease-linear"
                  style={{ width: `${progress}%` }}
                />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Card Counter */}
      <div className="text-center space-y-1">
        <div className="text-2xl font-bold text-gray-800">
          {String(currentIndex + 1).padStart(2, '0')} / {String(cards.length).padStart(2, '0')}
        </div>
        <div className="text-sm text-gray-500">
          {isHovered && pauseOnHover ? 'Paused' : 'Auto-playing'}
        </div>
      </div>
    </div>
  );
}
