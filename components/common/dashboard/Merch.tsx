'use client';
import Image from 'next/image';
import Slider from 'react-slick';
import { ArrowUpRight } from 'lucide-react';
import { NextArrow, PrevArrow } from './landing/NavigationArrow';
import Link from 'next/link';
import { useGetMerch } from '@/hooks/useExplore';

const collectiveSettings = {
  dots: false,
  infinite: true,
  speed: 500,
  slidesToShow: 4,
  slidesToScroll: 1,
  nextArrow: <NextArrow />,
  prevArrow: <PrevArrow />,
  responsive: [
    { breakpoint: 1024, settings: { slidesToShow: 3, slidesToScroll: 1, infinite: true } },
    { breakpoint: 768, settings: { slidesToShow: 2, slidesToScroll: 1 } },
    { breakpoint: 480, settings: { slidesToShow: 1, slidesToScroll: 1 } },
  ],
};

const MerchSkeleton = () => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="animate-pulse">
        <div className="w-full h-40 rounded-lg bg-gray-800" />
        <div className="py-2 space-y-1">
          <div className="h-4 w-3/4 bg-gray-800 rounded" />
          <div className="h-3 w-1/2 bg-gray-800 rounded" />
          <div className="h-3 w-1/3 bg-gray-800 rounded" />
        </div>
      </div>
    ))}
  </div>
);

const Merch = () => {
  const { data: items, isLoading, isError } = useGetMerch();

  return (
    <section>
      <div className="flex justify-between items-center pb-6 border-b">
        <h1 className="text-2xl font-semibold text-[#A3A3A3] font-poppins leading-tight tracking-tight">
          Merch
        </h1>
        <Link
          href="#"
          className="bg-[#1E181D] hover:bg-[#885FA8] text-[#A3A3A3] hover:text-[#1E181D] rounded-full p-3"
        >
          <ArrowUpRight className="w-5 h-5" />
        </Link>
      </div>

      {isLoading ? (
        <MerchSkeleton />
      ) : isError ? (
        <p className="py-8 text-center text-sm text-red-400">
          Failed to load merch. Please try again later.
        </p>
      ) : !items || items.length === 0 ? (
        <p className="py-8 text-center text-sm text-[#A3A3A3]">
          No merch available yet.
        </p>
      ) : (
        <div className="relative py-4 overflow-hidden">
          <Slider {...collectiveSettings} aria-roledescription="carousel" aria-label="Merch carousel">
            {items.map((item) => (
              <div key={item.id} className="px-4">
                <div className="w-full h-40 rounded-lg overflow-hidden mx-auto">
                  <Image
                    src={item.image}
                    alt={item.artist}
                    width={150}
                    height={150}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="py-2 text-center md:text-left text-white">
                  <p className="text-sm font-bold">{item.song}</p>
                  <p className="text-xs text-[#A3A3A3] font-normal">{item.artist}</p>
                  <p className="text-sm font-medium">{item.description}</p>
                </div>
              </div>
            ))}
          </Slider>
        </div>
      )}
    </section>
  );
};

export default Merch;
