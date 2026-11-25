import Image from 'next/image';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Down for maintenance | AudioBlocks',
  description: 'AudioBlocks is briefly offline for planned maintenance.',
  robots: { index: false, follow: false },
};

/**
 * Site-wide maintenance page (#858).
 *
 * Served by `middleware.ts` for every route when `MAINTENANCE_MODE` is on.
 * Static and unauthenticated by design: it must render even when the API,
 * auth, and every other backend dependency are down.
 */
export default function MaintenancePage() {
  return (
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
        <h1 className="text-2xl text-[#F4F4F5] md:text-3xl font-bold mb-4">
          We&rsquo;ll be right back
        </h1>
        <p className="max-w-xs mx-auto text-xs md:text-sm">
          AudioBlocks is undergoing planned maintenance. Streaming, purchases and the dashboard
          are briefly unavailable &mdash; please check back shortly.
        </p>
      </div>
    </div>
  );
}
