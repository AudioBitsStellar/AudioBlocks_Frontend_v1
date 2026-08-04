'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Home } from 'lucide-react';

const NotFound = () => {
  return (
    <>
      <div className="flex flex-col max-w-xl h-screen m-auto items-center justify-center min-h-screen bg-black text-[#A3A3A3] overflow-hidden">
        <div className="z-10 relative text-center px-4">
          <div className="absolute -z-10 -left-10 md:left-4 -top-10 bg-[#490D3E80] rounded-full w-70 md:w-100 h-100 blur-[100px]" />
          <Image
            alt="AudioBlocks Logo"
            className="mx-auto mb-1"
            height={150}
            src="/logo2.png"
            width={150}
          />
          <h1 className="text-2xl text-[#F4F4F5] md:text-3xl font-bold mb-4">Page Not Found</h1>
          <p className="max-w-xs mx-auto text-xs md:text-sm mb-8">
            The page you&lsquo;re looking for can&lsquo;t be found. Double-check the URL and try
            again.
          </p>
          <div className="flex items-center gap-4 justify-center">
            <Link
              className="inline-flex items-center gap-2 bg-brand hover:opacity-80 text-white px-6 py-3 rounded-full transition text-sm"
              href="/"
            >
              <Home size={16} />
              Go Home
            </Link>
            <button
              className="inline-flex items-center gap-2 bg-[#1E181D] hover:bg-[#885FA8] text-gray-300 px-6 py-3 rounded-full transition text-sm"
              onClick={() => window.history.back()}
            >
              <ArrowLeft size={16} />
              Go Back
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default NotFound;
