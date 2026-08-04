'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import Cookies from 'js-cookie';
import { ArrowRight } from 'lucide-react';
import { useAccount } from 'wagmi';
import { Auth } from '@/hooks/useAuth';

const Experience = () => {
  const { setShowAuthFlow } = useDynamicContext();
  const route = useRouter();
  const { isConnected } = useAccount();
  const token = Cookies.get('audioblocks_jwt');
  const { setShouldTriggerSignature } = Auth();

  const handleAuthentication = async () => {
    setShouldTriggerSignature(true);
  };

  const handleStream = () => {
    if (!isConnected) {
      setShouldTriggerSignature(true);
      setShowAuthFlow(true);
    } else if (!token) {
      setShouldTriggerSignature(true);
    } else {
      route.push('/dashboard/profile/edit');
    }
  };

  return (
    <section className="mb-15 w-4/5 m-auto">
      <div className="max-w-2xl px-4 md:px-0 text-center mx-auto mt-10">
        <h1 className="font-semibold text-[#A3A3A3] text-2xl mb-6 md:text-5xl leading-[100%] tracking-[0%] capitalize font-poppins">
          <span className="text-white">Upgrade</span> Your{' '}
          <span className="text-white">Experience </span>
          with Audioblocks
        </h1>
        <p className="text-[#A3A3A3] max-w-lg m-auto text-sm font-medium">
          No more passive listening, Stream and enjoy your music while earning on Audioblocks
        </p>
      </div>
      <div className="flex flex-col justify-center mt-6 md:flex-row gap-4">
        <button
          className="bg-[#D2045B] cursor-pointer flex items-center hover:bg-[#6C022F] hover:text-black justify-between text-white font-medium px-5 py-2 rounded-full text-sm transition"
          onClick={handleStream}
        >
          Stream Now
          <div className="bg-black rounded-full p-1 ml-2">
            <ArrowRight className="h-4 w-4 rotate-[300deg] text-white" />
          </div>
        </button>
        <Link
          className="border flex items-center hover:bg-[#885FA8] hover:text-black justify-between border-[#F2AFC9] text-white font-medium px-5 py-2 rounded-full text-sm transition"
          href="#"
        >
          Join Waitlist
          <div className="bg-[#D2045B] rounded-full p-1 ml-2">
            <ArrowRight className="h-4 w-4 rotate-[300deg] text-white" />
          </div>
        </Link>
      </div>
    </section>
  );
};

export default Experience;
