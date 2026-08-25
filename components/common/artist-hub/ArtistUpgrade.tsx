'use client';

import { ArrowRight, ArrowUp } from 'lucide-react';

const ArtistUpgrade = () => {
  return (
    <section className=" flex flex-col items-center justify-center  relative overflow-hidden">
      {/* Main Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Multi-line Title */}
        <div className="mb-8">
          <h1 className="font-['Poppins'] font-semibold text-[48px] leading-[120%] tracking-[0%] text-center text-white mb-2">
            Upgrade <span className="text-[#A3A3A3]"> Your </span> Experience
          </h1>
          <h2 className="font-['Poppins'] font-semibold text-[48px] leading-[120%] tracking-[0%] text-center text-[#A3A3A3]">
            with Audioblocks
          </h2>
        </div>

        {/* Subtitle */}
        <div className="mb-12">
          <p className="font-['Inter']  w-[60%]  font-medium text-[20px] leading-[150%] tracking-[-2%] text-center text-[#A3A3A3] max-w-3xl mx-auto">
            No more passive listening, Stream and enjoy your music while earning on Audioblocks
          </p>
        </div>

        {/* Call-to-Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center pb-20">
          {/* Claim Your Profile Button */}
          <button className="px-6 py-3 bg-[#D2045B] text-white font-bold rounded-full hover:scale-105 transition-all duration-200 flex items-center gap-3 shadow-lg hover:shadow-xl">
            Claim Your Profile
            <div className="bg-black rounded-full p-1">
              <ArrowUp className="h-4 w-4 rotate-45" />
            </div>
          </button>

          {/* Join Waitlist Button */}
          <button className="px-6 py-3 bg-transparent text-white font-bold rounded-full hover:scale-105 transition-all duration-200 flex items-center gap-3 shadow-lg hover:shadow-xl border-[1px] border-[#F2AFC9]">
            Join waitlist
            <div className="bg-black rounded-full p-1">
              <ArrowUp className="h-4 w-4 rotate-45" />
            </div>
          </button>
        </div>
      </div>
    </section>
  );
};

export default ArtistUpgrade;
