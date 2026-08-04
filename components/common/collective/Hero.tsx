import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const Hero = () => {
  return (
    <>
      <div className="relative -mt-20 pt-20 w-full h-[500px] md:h-screen flex items-center justify-center text-white">
        <div className="absolute right-50 top-2 bg-[#490D3E80] opacity- rounded-full w-100 h-100 blur-[100px]" />
        <Image
          fill
          priority
          alt="Featured content"
          className="object-cover z-20"
          src="/home/hero1.svg"
        />
        <div className="relative z-30 max-w-2xl m-auto text-center px-4">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4">
            Where Rising Artists Become Global Creators
          </h2>
          <p className="text-base md:text-lg  text-zinc-200 mb-8">
            AudioBlocks Collective is an invite-only initiative that accelerates promising artists
            through smart contracts, external distribution, and marketing support.
          </p>

          {/* CTA Button */}
          <div className="flex items-center justify-center mt-7 md:mt-20 ">
            <Link
              className="bg-[#D2045B] flex items-center justify-between text-white font-medium px-6 py-3 rounded-full text-sm hover:bg-[#b8034b] transition"
              href="#"
            >
              Learn More
              <div className="bg-black rounded-full p-1 ml-2">
                <ArrowRight className="h-4 w-4 rotate-[300deg] text-white" />
              </div>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default Hero;
