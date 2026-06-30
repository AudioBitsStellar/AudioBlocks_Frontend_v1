import { Settings } from 'react-slick';
import { NextArrow, PrevArrow } from './landing/NavigationArrow';

const responsiveSettings = [
  { breakpoint: 1024, settings: { slidesToShow: 3, slidesToScroll: 1, infinite: true } },
  { breakpoint: 768, settings: { slidesToShow: 2, slidesToScroll: 1 } },
  { breakpoint: 480, settings: { slidesToShow: 1, slidesToScroll: 1 } },
];

export function getCarouselSettings(overrides: Partial<Settings> = {}): Settings {
  return {
    dots: false,
    infinite: true,
    speed: 500,
    slidesToShow: 4,
    slidesToScroll: 1,
    nextArrow: <NextArrow />,
    prevArrow: <PrevArrow />,
    responsive: responsiveSettings,
    ...overrides,
  };
}
