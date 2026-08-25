'use client';

import dynamic from 'next/dynamic';
import { RecentlyPlayed } from '@/components/common/home/RecentlyPlayed';
import { Skeleton } from '@/components/ui/Skeleton';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import LazySection from '../../components/common/LazySection';

const SectionSkeleton = ({ height }: { height: number }) => (
  <Skeleton className="w-full" style={{ height }} />
);

const Featured = dynamic(() => import('../../components/common/home/Featured'), {
  ssr: false,
  loading: () => <SectionSkeleton height={360} />,
});
const SoundsSection = dynamic(() => import('@/components/common/home/SoundSection'), {
  ssr: false,
  loading: () => <SectionSkeleton height={420} />,
});
const HowItWorks = dynamic(() => import('../../components/common/home/HowItWorks'), {
  ssr: false,
  loading: () => <SectionSkeleton height={480} />,
});
const Discover = dynamic(() => import('../../components/common/home/Discover'), {
  ssr: false,
  loading: () => <SectionSkeleton height={420} />,
});
const Experience = dynamic(() => import('../../components/common/home/Experience'), {
  ssr: false,
  loading: () => <SectionSkeleton height={320} />,
});

export default function HomeSections() {
  useScrollRestoration('home');
  return (
    <>
      <RecentlyPlayed />

      <LazySection minHeight={360}>
        <Featured />
      </LazySection>
      <LazySection minHeight={420}>
        <SoundsSection />
      </LazySection>
      <LazySection minHeight={480}>
        <HowItWorks />
      </LazySection>
      <LazySection minHeight={420}>
        <Discover />
      </LazySection>
      <LazySection minHeight={320}>
        <Experience />
      </LazySection>
    </>
  );
}
