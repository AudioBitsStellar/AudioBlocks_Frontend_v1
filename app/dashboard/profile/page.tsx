'use client';

import { useRouter } from 'next/navigation';
import { Headphones, History } from 'lucide-react';
import Image from 'next/image';
import { useGetProfile } from '@/hooks/useProfile';

const ProfileSkeleton = () => (
  <div className="bg-[#1E1F23] p-8 py-13 rounded-lg flex justify-between animate-pulse">
    <div className="flex items-center w-3/5 gap-4">
      <div className="w-26 h-26 rounded-lg bg-gray-700 shrink-0" style={{ width: 104, height: 104 }} />
      <div className="flex-1 space-y-3">
        <div className="h-10 w-48 bg-gray-700 rounded" />
        <div className="h-4 w-64 bg-gray-700 rounded" />
      </div>
    </div>
    <div className="h-9 w-28 bg-gray-700 rounded-full" />
  </div>
);

const ProfilePage = () => {
  const router = useRouter();
  const { data: profile, isLoading, isError } = useGetProfile();

  const joinedLabel = profile?.joinedAt
    ? `Joined ${new Date(profile.joinedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
    : 'Joined —';

  return (
    <div className="font-inter">
      <p className="text-xs font-medium text-left text-white mb-2">Profile</p>

      {isLoading ? (
        <ProfileSkeleton />
      ) : isError ? (
        <div className="bg-[#1E1F23] p-8 rounded-lg text-red-400 text-sm">
          Failed to load profile. Please refresh the page.
        </div>
      ) : (
        <div className="bg-[#1E1F23] p-8 py-13 rounded-lg text-white flex justify-between">
          <div className="flex items-center w-3/5">
            <div className="mr-3">
              <Image
                src={profile?.profileImage || '/AFRO.jpg'}
                alt="profile"
                width={300}
                height={300}
                className="w-26 h-26 m-auto object-cover rounded-lg"
              />
            </div>
            <div className="flex-1 gap-2">
              <h1 className="md:text-6xl text-3xl mb-2 text-white font-extrabold">
                {profile?.name || profile?.username || '—'}
              </h1>
              <div className="flex justify-between">
                <div className="flex">
                  <History size={15} className="mr-2" />
                  <p className="font-semibold text-xs">{joinedLabel}</p>
                </div>
                <div className="flex">
                  <History size={15} className="mr-2" />
                  <p className="font-semibold text-xs">
                    Minutes Listened: {(profile?.minutesListened ?? 0).toLocaleString()} mins
                  </p>
                </div>
                <div className="flex">
                  <Headphones size={15} className="mr-2" />
                  <p className="font-semibold text-xs">{profile?.listenerType || 'Listener'}</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <button
              onClick={() => router.push('/dashboard/profile/edit')}
              className="bg-[#B81A3C] text-white cursor-pointer text-sm font-semibold px-4 py-2 rounded-full"
            >
              Edit Profile
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
