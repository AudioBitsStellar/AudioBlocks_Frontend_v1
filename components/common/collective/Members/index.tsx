'use client';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import Slider from 'react-slick';
import { NextArrow, PrevArrow } from './navigation';

const Members = () => {
  const collectiveArtists = [
    {
      name: 'Misty Brown',
      role: 'Artist',
      image: '/tech.jpg',
    },
    {
      name: 'Misty Brown',
      role: 'Artist',
      image: '/home/frame2.jpg',
    },
    {
      name: 'Misty Brown',
      role: 'Artist',
      image: '/image2.jpg',
    },
    {
      name: 'Misty Brown',
      role: 'Artist',
      image: '/home/frame1.jpg',
    },
  ];

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
      <section className="w-4/5 mx-auto py-10">
        <div className="flex justify-between border-b border-[#151515] pb-7 items-center">
          <h1 className="font-semibold text-[#A3A3A3] text-2xl md:text-4xl leading-[100%] tracking-[0%] capitalize font-poppins">
            <span className="text-white">Meet</span> The Collective
          </h1>
          <button className="bg-[#1E181D] cursor-pointer rounded-full p-5">
            <ArrowRight className="text-7xl -rotate-45 text-[#F2AFC9]" />
          </button>
        </div>

        <div className="relative py-4">
          <Slider {...collectiveSettings}>
            {collectiveArtists.map((artist, index) => (
              <div key={index} className="px-4">
                <div className="w-full h-55 rounded-lg overflow-hidden mx-auto">
                  <Image
                    alt={artist.name}
                    className="w-full h-full object-cover"
                    height={150}
                    src={artist.image}
                    width={150}
                  />
                </div>
                <div className="py-2 text-center md:text-left text-white">
                  <p className="text-lg font-bold">{artist.name}</p>
                  <p className="text-sm  font-normal">{artist.role}</p>
                </div>
              </div>
            ))}
          </Slider>
        </div>
      </section>
    </>
  );
};

export default Members;
