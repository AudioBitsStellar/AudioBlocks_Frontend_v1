'use client';

import Image from 'next/image';
import { ArrowRight } from 'lucide-react';

const ArtistFeatures = () => {
  return (
    <section className="py-20 ">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Title */}
        <div className="text-center mb-16">
          <h2 className="font-['Poppins'] mx-auto w-[60%] font-semibold text-[40px] leading-[100%] tracking-[0%] text-center capitalize text-white">
            Everything You Need To Track, Grow, And Monetize Your Music
          </h2>
        </div>

        {/* Top Row - 3 Cards */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-8">
          {/* Artist Insights Card */}
          <div className="md:col-span-3">
            <Image
              alt="Artist Insights"
              className="w-full h-auto object-contain"
              height={500}
              src="/artist_hub/Artist_insight.svg"
              width={400}
            />
          </div>

          {/* Artist Dashboard Card */}
          <div className="md:col-span-6">
            <Image
              alt="Artist Dashboard"
              className="w-full h-auto object-contain"
              height={500}
              src="/artist_hub/Artist_dashboard.svg"
              width={800}
            />
          </div>

          {/* Creative Web3 Tool Card */}
          <div className="md:col-span-3">
            <Image
              alt="Creative Web3 Tool"
              className="w-full h-auto object-contain"
              height={500}
              src="/artist_hub/Web3_tools.svg"
              width={400}
            />
          </div>
        </div>

        {/* Bottom Row - 2 Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Know What You Earn Card */}
          <div>
            <Image
              alt="Know What You Earn, When You Earn It"
              className="w-full h-auto object-contain"
              height={400}
              src="/artist_hub/Earn_it.svg"
              width={600}
            />
          </div>

          {/* Track Your Creative Milestones Card */}
          <div className="bg-[#171016] p-8 border-[1px] rounded-[23.54px]  border-[#333333] flex flex-col justify-between h-full">
            <div>
              {/* Title */}
              <div className="mb-6">
                <h3 className="font-['Poppins'] font-bold text-2xl text-white leading-tight">
                  Track Your
                </h3>
                <h3 className="font-['Poppins'] font-bold text-3xl text-white leading-tight">
                  Creative Milestones
                </h3>
              </div>

              {/* Description */}
              <p className="font-['Inter'] font-medium text-[16px] leading-[150%] text-[#A3A3A3] mb-8">
                Introducing the Artist Milestone System, a clear path from first upload to joining
                the <span className="font-bold text-white">AudioBlocks</span> Collective. Progress
                as an artist isn&apos;t guesswork anymore, with{' '}
                <span className="font-bold text-white">AudioBlocks</span>, every step you take
                toward growth is recorded and celebrated.
              </p>
            </div>

            {/* CTA Button */}
            <div className="mt-auto">
              <button className="bg-[#D2045B] hover:bg-[#B8043F] text-white font-bold px-6 py-3 rounded-full flex items-center gap-3 transition-all duration-200">
                Get Started
                <div className="bg-black rounded-full p-1">
                  <ArrowRight className="h-4 w-4 rotate-45" />
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ArtistFeatures;
