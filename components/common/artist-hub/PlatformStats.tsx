'use client';

import { useReadContract } from 'wagmi';
import { contractAddress, abi } from '@/config/abi';

const StatItem = ({ label, value }: { label: string; value: string | number }) => (
  <div className="flex flex-col items-center">
    <span className="text-4xl font-bold text-white font-['Poppins']">{value}</span>
    <span className="text-sm text-[#A3A3A3] font-['Inter']">{label}</span>
  </div>
);

const PlatformStats = () => {
  const { data: totalArtists } = useReadContract({
    address: contractAddress,
    abi: abi,
    functionName: 'totalArtist',
  });

  const { data: totalSongs } = useReadContract({
    address: contractAddress,
    abi: abi,
    functionName: 'totalSong',
  });

  const { data: totalAlbums } = useReadContract({
    address: contractAddress,
    abi: abi,
    functionName: 'totalAlbum',
  });

  const { data: totalStreamers } = useReadContract({
    address: contractAddress,
    abi: abi,
    functionName: 'totalStreamers',
  });

  return (
    <div className="flex flex-wrap justify-center gap-12 mt-16">
      <StatItem label="Artists" value={totalArtists?.toString() || '...'} />
      <StatItem label="Songs" value={totalSongs?.toString() || '...'} />
      <StatItem label="Albums" value={totalAlbums?.toString() || '...'} />
      <StatItem label="Streamers" value={totalStreamers?.toString() || '...'} />
    </div>
  );
};

export default PlatformStats;
