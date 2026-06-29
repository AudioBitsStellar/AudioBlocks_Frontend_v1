'use client';
import { ArrowUpRight, Star } from 'lucide-react';
import Image from 'next/image';
import Slider from 'react-slick';
import { NextArrow, PrevArrow } from '../collective/Members/navigation';
import Link from 'next/link';
import { useGetEvents } from '@/hooks/useExplore';

const eventsSettings = {
  dots: false,
  infinite: true,
  speed: 500,
  slidesToShow: 2.8,
  slidesToScroll: 1,
  nextArrow: <NextArrow />,
  prevArrow: <PrevArrow />,
  responsive: [
    { breakpoint: 1024, settings: { slidesToShow: 2, slidesToScroll: 1, infinite: true } },
    { breakpoint: 768, settings: { slidesToShow: 1.2, slidesToScroll: 1, infinite: true } },
    { breakpoint: 480, settings: { slidesToShow: 1, slidesToScroll: 1 } },
  ],
};

const EventSkeleton = () => (
  <div className="grid grid-cols-3 gap-4 py-12">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="animate-pulse rounded-2xl overflow-hidden">
        <div className="w-full h-44 bg-gray-800 rounded-lg" />
      </div>
    ))}
  </div>
);

const EventSection = () => {
  const { data: events, isLoading, isError } = useGetEvents();

  return (
    <div>
      <section>
        <div className="flex justify-between items-center pb-6 border-b">
          <h1 className="text-2xl font-semibold text-[#A3A3A3] font-poppins leading-tight tracking-tight">
            Event
          </h1>
          <Link
            href="#"
            className="bg-[#1E181D] hover:bg-[#885FA8] text-[#A3A3A3] hover:text-[#1E181D] rounded-full p-3"
          >
            <ArrowUpRight className="w-5 h-5" />
          </Link>
        </div>

        {isLoading ? (
          <EventSkeleton />
        ) : isError ? (
          <p className="py-8 text-center text-sm text-red-400">
            Failed to load events. Please try again later.
          </p>
        ) : !events || events.length === 0 ? (
          <p className="py-8 text-center text-sm text-[#A3A3A3]">
            No upcoming events yet.
          </p>
        ) : (
          <div className="relative py-12 overflow-hidden">
            <Slider {...eventsSettings} aria-roledescription="carousel" aria-label="Events carousel">
              {events.map((event) => (
                <div key={event.id} className="px-4 shadow-2xl">
                  <div className="rounded-2xl relative overflow-hidden">
                    <div className="w-full relative h-44 rounded-lg overflow-hidden mx-auto">
                      <Image
                        src={event.image}
                        alt={event.name}
                        width={256}
                        height={256}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-2 absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#1A1A1A] to-transparent space-y-1">
                      <p className="text-base font-bold">{event.name}</p>
                      <p className="text-xs text-white/70">{event.date}</p>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center text-xs gap-2 text-white/70">
                          <Star className="w-4 h-4 text-white" />
                          {event.going} Going • {event.price}
                        </div>
                        <button className="font-semibold cursor-pointer text-xs border rounded-xl px-4 py-2">
                          Buy Ticket
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </Slider>
          </div>
        )}
      </section>
    </div>
  );
};

export default EventSection;
