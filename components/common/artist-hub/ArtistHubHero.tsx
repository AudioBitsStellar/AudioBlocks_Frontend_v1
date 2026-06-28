'use client';

import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import PlatformStats from './PlatformStats';

const ArtistHubHero = () => {
  return (
    <section className="min-h-screen flex flex-col items-center justify-normal relative overflow-hidden">
      {/* Starry Background Effect */}
      <div className="absolute inset-0 opacity-30">
        {/* Scattered white dots for starry effect */}
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
            }}
          />
        ))}
      </div>

      {/* Text Content */}
      <div className="relative z-10 max-w-6xl mt-20 mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
        {/* Main Heading */}
        <div className="max-w-[580px] space-y-4">
          <h1 className="font-['Poppins'] font-extrabold text-[48px] leading-[100%] tracking-[0%] text-center text-white">
            Monetize, Grow & Engage
          </h1>

          <p className="font-['Inter'] font-medium text-[20px] leading-[150%] tracking-[-2%] text-center text-[#A3A3A3] max-w-3xl mx-auto">
            Build a real music career with tools designed to help you connect with your fans and get
            paid.
          </p>
        </div>

        {/* CTA Buttons */}
         <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
           {/* <button className="px-8 py-4 bg-gradient-to-r from-[#D2045B] to-[#FF6B9D] text-white font-bold rounded-full hover:scale-105 transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl font-['Poppins']">
             Claim Your Profile
             <ArrowRight className="h-5 w-5" />
           </button> */}
           <button className="mt-6 w-[189px] h-[48px] px-4 py-2 rounded-full bg-[#D2045B] hover:bg-[#B8043F] text-white font-medium text-sm flex justify-center items-center gap-2">
             Claim Your Profile
             <div className="bg-black rounded-full p-1">
               <ArrowRight className="h-4 w-4 rotate-[300deg]" />
             </div>
           </button>
 
           <button className="mt-6 w-[189px] h-[48px] px-4 py-2 rounded-full bg-transparent border-[1px] border-[#885FA8] hover:bg-[#B8043F] text-white font-medium text-sm flex justify-center items-center gap-2">
           Upload New Track
             <div className="bg-black rounded-full p-1">
               <ArrowRight className="h-4 w-4 rotate-[300deg]" />
             </div>
           </button>
         </div>

         <PlatformStats />
       </div>


      {/* Hero Image at Center */}
      <div className="relative z-10 mt-12 flex justify-center">
        <div className="relative w-[1145px] h-[494px]">
          <Image src="/artist_hub/HeroImage.png" alt="Hero Image" fill className="object-contain" />
        </div>
      </div>
    </section>
  );
};

export default ArtistHubHero;
