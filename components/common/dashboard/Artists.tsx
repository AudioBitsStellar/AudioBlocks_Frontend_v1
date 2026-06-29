'use client';
import Image from 'next/image';
import Slider from 'react-slick';
import { ArrowUpRight } from 'lucide-react';
import { NextArrow, PrevArrow } from './landing/NavigationArrow';
import Link from 'next/link';
import { artistsData } from './data';

const Artists = () => {
  const collectiveSettings = {
    dots: false,
    infinite: true,
    speed: 500,
    slidesToShow: 4,
    slidesToScroll: 1,
    nextArrow: <NextArrow />,
    prevArrow: <PrevArrow />,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 1,
          infinite: true,
        },
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 1,
        },
      },
      {
        breakpoint: 480,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
        },
      },
    ],
  };
  return (
    <>
      <section className="">
        <div className="flex justify-between items-center pb-6 border-b">
          <h1 className="text-2xl font-semibold text-on-muted font-poppins leading-tight tracking-tight">
            Artists
          </h1>
          <Link
            href="/dashboard/all-artists"
            className="bg-[#1E181D] hover:bg-[#885FA8] text-[#A3A3A3] hover:text-[#1E181D] rounded-full p-3"
          >
            <ArrowUpRight className="w-5 h-5" />
          </Link>
        </div>

        <div className="relative py-4">
          <Slider {...collectiveSettings}>
            {artistsData.map((artist, index) => (
              <div key={index} className="px-4">
                <div className="w-full h-40 rounded-lg overflow-hidden mx-auto">
                  <Image
                    src={artist.image}
                    alt={artist.artist}
                    width={150}
                    height={150}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="py-2 text-center md:text-left text-white">
                  <p className="text-sm font-bold">{artist.song}</p>
                  <p className="text-xs text-on-muted font-normal">{artist.artist}</p>
                  <p className="text-sm  font-medium">{artist.description}</p>
                </div>
              </div>
            ))}
          </Slider>
        </div>
      </section>
    </>
  );
};

export default Artists;
