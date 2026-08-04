'use client';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import Slider from 'react-slick';
import { NextArrow, PrevArrow } from './NavigationArrow';

const Event = () => {
  // Data for Upcoming Events
  const upcomingEvents = [
    {
      name: 'Art Exhibition',
      role: 'Event',
      image: '/audio.jpg',
    },
    {
      name: 'Music Concert',
      role: 'Event',
      image: '/tech.jpg',
    },
    {
      name: 'Music Concert',
      role: 'Event',
      image: '/tech.jpg',
    },
  ];

  const settings = {
    dots: false,
    infinite: true,
    speed: 500,
    slidesToShow: 3,
    slidesToScroll: 1,
    nextArrow: <NextArrow />,
    prevArrow: <PrevArrow />,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 2,
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
      <div>
        <section className="w-11/12 mx-auto">
          <div className="flex justify-between border-b border-[#151515] pb-5 items-center">
            <h1 className="font-semibold text-2xl md:text-4xl leading-[100%] tracking-[0%] capitalize font-poppins">
              Events
            </h1>
            <button className="bg-[#1E181D] cursor-pointer rounded-full p-5">
              <ArrowRight className="text-7xl -rotate-45 text-[#F2AFC9]" />
            </button>
          </div>

          <div className="relative py-8">
            <Slider {...settings}>
              {upcomingEvents.map((event, index) => (
                <div key={index} className="px-2 shadow-2xl">
                  <div className="bg-[#1E1E1E3D] rounded-2xl  p-4">
                    <div className="w-full h-50 rounded-lg overflow-hidden mx-auto">
                      <Image
                        alt={event.name}
                        className="w-full h-full object-cover"
                        height={256}
                        src={event.image}
                        width={384}
                      />
                    </div>

                    <div className="py-2  text-center md:text-left text-white">
                      <p className="text-xl font-bold">{event.name}</p>
                      <p className="text-lg font-medium">{event.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </Slider>
          </div>
        </section>
      </div>
    </>
  );
};

export default Event;
