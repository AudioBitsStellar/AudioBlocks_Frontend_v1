'use client';

const StatItem = ({ label, value }: { label: string; value: string | number }) => (
  <div className="flex flex-col items-center">
    <span className="text-4xl font-bold text-white font-['Poppins']">{value}</span>
    <span className="text-sm text-[#A3A3A3] font-['Inter']">{label}</span>
  </div>
);

/**
 * Platform statistics component
 * TODO: Integrate with backend API to fetch Soroban contract stats
 */
const PlatformStats = () => {
  return (
    <div className="flex flex-wrap justify-center gap-12 mt-16">
      <StatItem label="Artists" value="..." />
      <StatItem label="Songs" value="..." />
      <StatItem label="Albums" value="..." />
      <StatItem label="Streamers" value="..." />
    </div>
  );
};

export default PlatformStats;
