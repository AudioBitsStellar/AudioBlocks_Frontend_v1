'use client';

import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import Cookies from 'js-cookie';
import { Auth } from '@/hooks/useAuth';
import FullScreenLoader from './FullScreenLoader';

const Hero = () => {
  const { setShowAuthFlow } = useDynamicContext();
  const route = useRouter();
  const { isConnected } = useAccount();
  const token = Cookies.get('audioblocks_jwt');
  const { setShouldTriggerSignature, loading } = Auth();

  const handleStream = () => {
    if (!isConnected) {
      setShowAuthFlow(true);
      setShouldTriggerSignature(true);
    } else if (!token) {
      setShouldTriggerSignature(true);
    } else {
      route.push('/dashboard/profile/edit');
    }
  };
  return (
    <section aria-label="Hero" className="relative h-screen text-white py-35 overflow-hidden">
      <div className="absolute right-40 top-2 bg-[#490D3E80] rounded-full w-100 h-100 blur-[100px]" aria-hidden="true" />
      <div className="w-4/5 mx-auto flex flex-col-reverse md:flex-row items-center justify-between">
        <div className="">
          <h1 className="text-3xl md:text-4xl font-extrabold leading-tight mb-6">
            Discover Tomorrow’s <br className="hidden md:block" /> Music Today
          </h1>
          <p className="text-[#DACFD3] font-normal text-base md:text-lg leading-[1.6] mb-8">
            Stream authentic, ad-free music from emerging voices. <br className="hidden md:block" />
            Built for listeners who care and artists who dare.
          </p>
          <div className="flex flex-col md:flex-row gap-4">
            <button
              onClick={handleStream}
              aria-label="Stream Now"
              className="bg-[#D2045B] cursor-pointer flex items-center justify-between text-white font-medium px-6 py-2 rounded-full text-sm hover:bg-[#6C022F] hover:text-black transition focus-visible:ring-2 focus-visible:ring-[#D2045B] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              Stream Now
              <div className="bg-black rounded-full p-1 ml-2" aria-hidden="true">
                <ArrowRight className="h-4 w-4 rotate-[300deg] text-white" />
              </div>
            </button>
            <Link
              href="#"
              aria-label="Join Waitlist"
              className="border flex items-center justify-between border-[#F2AFC9] text-white font-medium px-6 py-2 rounded-full text-sm hover:bg-[#885FA8] hover:text-black transition focus-visible:ring-2 focus-visible:ring-[#F2AFC9] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              Join Waitlist
              <div className="bg-[#D2045B] rounded-full p-1 ml-2" aria-hidden="true">
                <ArrowRight className="h-4 w-4 rotate-[300deg] text-white" />
              </div>
            </Link>
          </div>
        </div>

        <div className="relative flex items-center justify-center" aria-hidden="true">
          <div className="relative w-[250px] h-[250px] z-20 rounded-2xl overflow-hidden border border-[#D9D9D9]">
            <Image
              src="/home/frame1.jpg"
              alt=""
              fill
              className="rounded-2xl object-cover"
            />
          </div>

          <div className="absolute -top-15 -left-14 scale-x-[-1]  w-[250px] h-[250px] z-10 border border-[#885FA833] rounded-2xl overflow-hidden">
            <Image
              src="/home/frame2.jpg"
              alt=""
              fill
              className="rounded-2xl object-cover opacity-90"
            />
          </div>
        </div>
      </div>

      <div className="bottom-0 left-0 w-full" aria-hidden="true">
        <Image
          src="/home/hero2.svg"
          alt=""
          width={1600}
          height={100}
          className="w-full h-auto"
        />
      </div>

      {loading && <FullScreenLoader />}
    </section>


  );
};

export default Hero;
