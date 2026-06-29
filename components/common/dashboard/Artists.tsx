'use client';
import Image from 'next/image';
import Slider from 'react-slick';
import { ArrowUpRight } from 'lucide-react';
import { NextArrow, PrevArrow } from './landing/NavigationArrow';
import Link from 'next/link';
import { useGetChainArtists } from '@/hooks/useExplore';
import { Skeleton } from '@/components/ui/skeleton';

const IPFS_GATEWAY = 'https://ipfs.io/ipfs/';

const fallbackArtists = [
  { song: 'Echoes of the Soul', artist: 'Misty Brown', description: 'New Album', image: '/tech.jpg' },
  { song: 'Echoes of the Soul', artist: 'Misty Brown', description: 'New Album', image: '/image2.jpg' },
  { song: 'Echoes of the Soul', artist: 'Misty Brown', description: 'New Album', image: '/tech.jpg' },
  { song: 'Echoes of the Soul', artist: 'Misty Brown', description: 'New Album', image: '/image1.jpg' },
];

const sliderSettings = {
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

function shortenAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

const Artists = () => {
  const { artists, isLoading } = useGetChainArtists();

  const hasChainData = artists.length > 0;

  return (
    <section>
      <div className="flex justify-between items-center pb-6 border-b">
        <h2 className="text-2xl font-semibold text-on-muted font-poppins leading-tight tracking-tight">
          Artists
        </h2>
        <Link
          href="#"
          aria-label="View all artists"
          className="bg-[#1E181D] hover:bg-[#885FA8] text-[#A3A3A3] hover:text-[#1E181D] rounded-full p-3"
        >
          <ArrowUpRight aria-hidden="true" className="w-5 h-5" />
        </Link>
      </div>

      <div className="relative py-4">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="px-4">
                <Skeleton className="w-full h-40 rounded-lg" />
                <Skeleton className="h-4 mt-2 w-3/4" />
                <Skeleton className="h-3 mt-1 w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <Slider {...sliderSettings}>
            {(hasChainData
              ? artists.map((a) => ({
                  song: `Artist #${a.artistId.toString()}`,
                  artist: shortenAddress(a.artistAddress),
                  description: a.artistCid ? 'On-chain Artist' : 'Registered Artist',
                  image: a.artistCid.startsWith('Qm') || a.artistCid.startsWith('baf')
                    ? `${IPFS_GATEWAY}${a.artistCid}`
                    : '/tech.jpg',
                }))
              : fallbackArtists
            ).map((item, index) => (
              <div key={index} className="px-4">
                <div className="w-full h-40 rounded-lg overflow-hidden mx-auto">
                  <Image
                    src={item.image}
                    alt={item.artist}
                    width={150}
                    height={150}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/tech.jpg'; }}
                  />
                </div>
                <div className="py-2 text-center md:text-left text-white">
                  <p className="text-sm font-bold">{item.song}</p>
                  <p className="text-xs text-on-muted font-normal">{item.artist}</p>
                  <p className="text-sm font-medium">{item.description}</p>
                </div>
              </div>
            ))}
          </Slider>
        )}
      </div>
    </section>
  );
};

export default Artists;
