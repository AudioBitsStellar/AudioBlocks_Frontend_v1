import { Settings } from 'react-slick';
import { NextArrow, PrevArrow } from './landing/NavigationArrow';

const responsiveSettings = [
  { breakpoint: 1024, settings: { slidesToShow: 3, slidesToScroll: 1, infinite: true } },
  { breakpoint: 768, settings: { slidesToShow: 2, slidesToScroll: 1 } },
  { breakpoint: 480, settings: { slidesToShow: 1, slidesToScroll: 1 } },
];

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function getCarouselSettings(overrides: Partial<Settings> = {}): Settings {
  const reducedMotion = prefersReducedMotion();

  return {
    dots: false,
    infinite: true,
    speed: reducedMotion ? 0 : 500,
    slidesToShow: 4,
    slidesToScroll: 1,
    nextArrow: <NextArrow />,
    prevArrow: <PrevArrow />,
    responsive: responsiveSettings,
    ...overrides,
    ...(reducedMotion ? { autoplay: false, speed: 0 } : {}),
  };
}
