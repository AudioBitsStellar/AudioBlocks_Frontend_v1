import Artists from '@/components/common/dashboard/Artists';
import CategorySection from '@/components/common/dashboard/CategorySection';
import Collections from '@/components/common/dashboard/Collections';
import EventSection from '@/components/common/dashboard/EventSection';
import Merch from '@/components/common/dashboard/Merch';
import SectionErrorBoundary from '@/components/common/SectionErrorBoundary';
import React from 'react';

const page = () => {
  return (
    <>
      <div>
        <p className="text-xs font-medium text-left text-white mb-2">Explore</p>

        <SectionErrorBoundary fallbackMessage="Failed to load categories.">
          <CategorySection />
        </SectionErrorBoundary>

        <SectionErrorBoundary fallbackMessage="Failed to load collections.">
          <Collections />
        </SectionErrorBoundary>

        <SectionErrorBoundary fallbackMessage="Failed to load events.">
          <EventSection />
        </SectionErrorBoundary>

        <SectionErrorBoundary fallbackMessage="Failed to load artists.">
          <Artists />
        </SectionErrorBoundary>

        <SectionErrorBoundary fallbackMessage="Failed to load merch.">
          <Merch />
        </SectionErrorBoundary>
      </div>
    </>
  );
};

export default page;
