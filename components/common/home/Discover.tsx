'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import Slider from 'react-slick';

type Track = {
  id: string;
  title: string;
  artist: string;
  left: string;
  price: string;
  image: string;
};

const categories = ['Trending', 'Merches', 'Tickets', 'Recently Added'];

const generateDummyTracks = (category: string) =>
  Array(6)
    .fill(null)
    .map((_, index) => ({
      id: `${category}-${index}`,
      title: `Echoes of the Soul ${index + 1}`,
      artist: 'Misty Brown',
      left: `${10 + index}/1000 Left`,
      price: `${(0.005 + index * 0.001).toFixed(3)}Ξ`,
      image: '/home/sound.jpg', // Replace with your own image
    }));

const trackData: Record<string, Track[]> = Object.fromEntries(
  categories.map((cat) => [cat, generateDummyTracks(cat)])
);

const Discover = () => {
  const [activeTab, setActiveTab] = useState('Trending');
  const sliderRef = useRef<Slider>(null);

  const settings = {
    dots: false,
    infinite: true,
    speed: 500,
    slidesToShow: 3,
    slidesToScroll: 1,
    arrows: false,
    responsive: [
      { breakpoint: 1024, settings: { slidesToShow: 2 } },
      { breakpoint: 768, settings: { slidesToShow: 1 } },
    ],
  };

  return (
    <section className="py-12 bg-black text-white">
      {/* Header */}
      <div className="flex justify-between items-center w-4/5 mx-auto">
        <h2 className="text-3xl md:text-4xl font-semibold text-[#A3A3A3] font-poppins leading-tight tracking-tight">
          Buy, Sell <span className="text-white">& Discover</span> Tracks
        </h2>
        <Link
          aria-label="Explore tracks"
          className="bg-[#1E181D] hover:bg-[#885FA8] text-[#F2AFC9] hover:text-[#1E181D] rounded-full p-5"
          href="#"
        >
          <ArrowRight aria-hidden="true" className="-rotate-45 w-6 h-6" />
        </Link>
      </div>

      {/* Tabs and Carousel */}
      <div className="flex w-4/5 pt-10 mx-auto">
        {/* Sidebar Tabs */}
        <aside className=" w-full md:w-1/5 md:mr-6 space-y-3">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`block px-4 py-2.5 min-h-[44px] text-left rounded-full text-sm font-medium transition ${
                activeTab === cat ? 'bg-pink-600 text-white' : 'hover:text-pink-400 text-white/70'
              }`}
              onClick={() => setActiveTab(cat)}
            >
              {cat}
            </button>
          ))}
          {/* Arrows */}
          <div className="flex gap-6 mt-8">
            <button
              aria-label="Scroll tracks backward"
              className="p-2.5 min-h-[44px] min-w-[44px] rounded-full cursor-pointer bg-[#1E181D] text-[#F2AFC9] hover:bg-white/20"
              onClick={() => sliderRef.current?.slickPrev()}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button
              aria-label="Scroll tracks forward"
              className="p-2.5 min-h-[44px] min-w-[44px] rounded-full cursor-pointer bg-[#1E181D] text-[#F2AFC9] hover:bg-white/20"
              onClick={() => sliderRef.current?.slickNext()}
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </aside>

        {/* Carousel Section */}
        <div className="w-full md:w-4/5">
          <Slider {...settings} ref={sliderRef}>
            {trackData[activeTab].map((track) => (
              <div key={track.id} className="px-3">
                <div className="bg-[#111] hover:bg-[#181818] rounded-lg overflow-hidden p-4 transition">
                  <Image
                    alt={`Album artwork for ${track.title} by ${track.artist}`}
                    className="h-48 w-full object-cover mb-4 rounded"
                    height={200}
                    src={track.image}
                    width={300}
                  />
                  <h3 className="text-white font-semibold text-sm">{track.title}</h3>
                  <p className="text-xs text-white/60 mb-1">{track.artist}</p>
                  <p className="text-xs text-white/60 mb-4">{track.left}</p>
                  <div className="flex justify-between items-center">
                    <button
                      aria-label={`Buy ${track.title} for ${track.price}`}
                      className="bg-white text-black text-xs px-4 py-1.5 min-h-[44px] rounded font-semibold"
                    >
                      Buy Now
                    </button>
                    <span className="text-xs">{track.price}</span>
                  </div>
                </div>
              </div>
            ))}
          </Slider>
        </div>
      </div>
    </section>
  );
};

export default Discover;
