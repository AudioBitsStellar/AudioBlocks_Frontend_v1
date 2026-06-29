'use client';

import { ArrowUpRight, CornerDownRight } from 'lucide-react';

const listenerFeatures = [
  {
    title: 'Discover New Music',
    description: 'Find underground gems and fresh tracks from emerging African artists.',
  },
  {
    title: 'Stream Without Disruption',
    description: 'Ad-free, high-quality music streaming designed for music lovers.',
  },
  {
    title: 'Earn as You Listen',
    description: 'Collect points and rewards by engaging with tracks.',
  },
  {
    title: 'Support Artists Directly',
    description: 'Tip your favorite creators or buy digital merch to help them grow.',
  },
];

const artistFeatures = [
  {
    title: 'Upload and Share Your Music',
    description: 'Easily publish your tracks to reach a growing community of listeners.',
  },
  {
    title: 'Earn with Every Stream',
    description: 'Get paid fairly through streaming, tips, subscriptions, and fan support.',
  },
  {
    title: 'Sell Digital Merch & NFTs',
    description: 'Create your digital storefront to sell exclusive tracks, collectibles, and more.',
  },
  {
    title: 'Get Discovered & Funded',
    description: 'Join to gain visibility to grow your reach.',
  },
];

const HowItWorks = () => {
  return (
    <section aria-labelledby="how-it-works-heading" className="py-15 w-4/5 m-auto text-white">
      <div className="max-w-lg mx-auto text-center mb-12">
        <h2 id="how-it-works-heading" className="font-semibold text-[#A3A3A3] text-2xl mb-2 md:text-4xl leading-[100%] tracking-[0%] capitalize font-poppins">
          How it <span className="text-white">Works </span>
        </h2>
        <p className="text-[#A3A3A3] text-sm font-medium">
          Discover how AudioBlocks connects artists and listeners through a seamless streaming and
          earning experience.
        </p>
      </div>

      <div className="grid grid-cols-1 relative md:grid-cols-2 gap-8 max-w-6xl mx-auto">
        <div className="absolute -z-10 md:left-100 -left-9 top-2 bg-[#490D3E80] rounded-full w-70 md:w-100 h-100 blur-[150px]" />

        {/* Listeners Card */}
        <div className="border border-[#D2045B33] rounded-2xl p-6 relative">
          <h3 className="text-lg font-semibold mb-3 text-white">Listeners</h3>
          <p className="text-sm font-medium text-[#A3A3A3] mb-6">
            Unlock a whole new way to enjoy music. From seamless listening to earning while you
            stream
          </p>
          <ul className="space-y-3">
            {listenerFeatures.map((feature, i) => (
              <li
                key={i}
                className="flex items-left px-4 py-3 border border-[#2E2E2E] rounded-lg hover:border-[#D2045B33]
                "
              >
                <div className="p-2 mr-2 rounded-full border hover:border-[#F2AFC9]">
                  <CornerDownRight size={16} />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">{feature.title}</span>
                  <p className="text-[10px] font-normal">{feature.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Artists Card */}
        <div className="border border-[#27272B] rounded-2xl p-6 relative">
          <div className='flex justify-between items-center'>
            <h3 className="text-lg font-semibold mb-3 text-white">Artists</h3>
            <button aria-label="Learn more about AudioBlocks for Artists" className="border-[#F2AFC9] border-[0.1px] cursor-pointer rounded-full p-1 focus-visible:ring-2 focus-visible:ring-[#F2AFC9] focus-visible:ring-offset-2 focus-visible:ring-offset-black">
              <ArrowUpRight aria-hidden="true" className="top-6 right-6 text-[#F2AFC9] w-5 h-5" />
            </button>
          </div>
          <p className="text-sm font-medium text-[#A3A3A3] mb-6">
            Grow your art, reach new fans, and get paid fairly. AudioBlocks empowers the next wave
            of African music creators.
          </p>
          <ul className="space-y-3">
            {artistFeatures.map((feature, i) => (
              <li
                key={i}
                className="flex items-left px-4 py-3 border border-[#2E2E2E] rounded-lg hover:border-[#D2045B33]
                "
              >
                <div className="p-2 mr-2 rounded-full border hover:border-[#F2AFC9]">
                  <CornerDownRight size={16} />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">{feature.title}</span>
                  <p className="text-[10px] font-normal">{feature.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
