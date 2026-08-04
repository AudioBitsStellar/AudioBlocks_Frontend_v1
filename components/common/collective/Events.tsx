'use client';
import Image from 'next/image';
import { ArrowRight, Star } from 'lucide-react';
import Slider from 'react-slick';
import { NextArrow, PrevArrow } from './Members/navigation';

const Events = () => {
  // Data for Upcoming Events
  const upcomingEvents = [
    {
      name: 'Fresher’s Day',
      image: '/audio.jpg',
      date: '1:30 PM - 27/7/2025',
      going: 16,
      price: '0.005ETH',
    },
    {
      name: 'Music Concert',
      date: '1:30 PM - 27/7/2025',
      going: 16,
      price: '0.005ETH',
      image: '/home/frame1.jpg',
    },
    {
      name: 'Music Concert',
      date: '1:30 PM - 27/7/2025',
      going: 16,
      price: '0.005ETH',
      image: '/AFRO.jpg',
    },
  ];

  const eventsSettings = {
    dots: false,
    infinite: true,
    speed: 500,
    slidesToShow: 2.8,
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
          slidesToShow: 1,
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
        {/* Upcoming Events Section */}
        <section className="w-4/5 mx-auto">
          <div className="flex relative justify-between border-b border-[#151515] pb-5 items-center">
            <div className="absolute  -z-10 -left-10 md:-left-70 -top-10 bg-[#490D3E80] rounded-full w-70 md:w-100 h-100 blur-[150px]" />
            <h1 className="font-semibold text-[#A3A3A3] text-2xl md:text-4xl leading-[100%] tracking-[0%] capitalize font-poppins">
              <span className="text-white">Upcoming</span> Events
            </h1>
            <button className="bg-[#1E181D] cursor-pointer rounded-full p-5">
              <ArrowRight className="text-7xl -rotate-45 text-[#F2AFC9]" />
            </button>
          </div>

          <div className="relative py-12">
            <Slider {...eventsSettings}>
              {upcomingEvents.map((event, index) => (
                <div key={index} className="px-4 shadow-2xl">
                  <div className="bg-[#1E1E1E3D] rounded-2xl">
                    <div className="w-full h-64 rounded-lg overflow-hidden mx-auto">
                      <Image
                        alt={event.name}
                        className="w-full h-full object-cover"
                        height={256}
                        src={event.image}
                        width={256}
                      />
                    </div>

                    <div className="p-4 space-y-2">
                      <p className="text-base font-bold">{event.name}</p>
                      <p className="text-xs text-white/70">{event.date}</p>

                      <div className="flex justify-between items-center mt-2">
                        <div className="flex items-center text-xs gap-2 text-white/70">
                          <Star className="w-4 h-4 text-white" />
                          {event.going} Going • {event.price}
                        </div>
                        <button className="font-semibold text-xs border rounded-xl px-4 py-2">
                          Buy Ticket
                        </button>
                      </div>
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

export default Events;
