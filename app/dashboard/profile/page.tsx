'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Headphones, History, LogIn, UserPlus } from 'lucide-react';
import ErrorState from '@/components/common/ErrorState';
import { useLogout } from '@/hooks/useLogout';
import { useGetProfile } from '@/hooks/useProfile';
import { AuthError, NotFoundError } from '@/lib/apiClient';

const ProfileSkeleton = () => (
  <div
    aria-busy="true"
    aria-label="Loading profile"
    className="bg-[#1E1F23] p-8 py-13 rounded-lg flex justify-between animate-pulse"
    role="status"
  >
    <div className="flex items-center w-3/5 gap-4">
      <div
        className="w-26 h-26 rounded-lg bg-gray-700 shrink-0"
        style={{ width: 104, height: 104 }}
      />
      <div className="flex-1 space-y-3">
        <div className="h-10 w-48 bg-gray-700 rounded" />
        <div className="h-4 w-64 bg-gray-700 rounded" />
      </div>
    </div>
    <div className="h-9 w-28 bg-gray-700 rounded-full" />
  </div>
);

const buttonClass =
  'flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand hover:bg-brand-hover rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand';

/**
 * Error branch of the profile page. Distinguishes an expired session, a profile
 * that has not been created yet and any other failure (network, 5xx).
 */
const ProfileError = ({
  error,
  onRetry,
  isRetrying,
}: {
  error: unknown;
  onRetry: () => void;
  isRetrying: boolean;
}) => {
  const { logout, isLoggingOut } = useLogout();

  if (error instanceof AuthError) {
    return (
      <div className="bg-[#1E1F23] rounded-lg">
        <ErrorState
          illustration={<LogIn className="text-brand" size={48} />}
          message="Your session has expired. Sign in again to see your profile."
          title="You're signed out"
        />
        <div className="flex justify-center pb-10">
          <button
            className={buttonClass}
            disabled={isLoggingOut}
            type="button"
            onClick={() => logout({ redirectTo: '/', showToast: false })}
          >
            Sign in again
          </button>
        </div>
      </div>
    );
  }

  if (error instanceof NotFoundError) {
    return (
      <div className="bg-[#1E1F23] rounded-lg">
        <ErrorState
          illustration={<UserPlus className="text-brand" size={48} />}
          message="We couldn't find a profile for your account yet. Add a few details to get started."
          title="Finish setting up your profile"
        />
        <div className="flex justify-center pb-10">
          <Link className={buttonClass} href="/dashboard/profile/edit">
            Set up profile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#1E1F23] rounded-lg">
      <ErrorState
        isRetrying={isRetrying}
        message="We couldn't load your profile. Check your connection and try again."
        title="Failed to load profile"
        variant="network"
        onRetry={onRetry}
      />
    </div>
  );
};

const ProfilePage = () => {
  const router = useRouter();
  const { data: profile, isLoading, isError, error, refetch, isRefetching } = useGetProfile();

  const joinedLabel = profile?.joinedAt
    ? `Joined ${new Date(profile.joinedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
    : 'Joined —';

  return (
    <div className="font-inter">
      <p className="text-xs font-medium text-left text-white mb-2">Profile</p>

      {isLoading ? (
        <ProfileSkeleton />
      ) : isError ? (
        <ProfileError error={error} isRetrying={isRefetching} onRetry={() => void refetch()} />
      ) : (
        <div className="bg-[#1E1F23] p-8 py-13 rounded-lg text-white flex justify-between">
          <div className="flex items-center w-3/5">
            <div className="mr-3">
              <Image
                alt="profile"
                className="w-26 h-26 m-auto object-cover rounded-lg"
                height={300}
                src={profile?.profileImage || '/AFRO.jpg'}
                width={300}
              />
            </div>
            <div className="flex-1 gap-2">
              <h1 className="md:text-6xl text-3xl mb-2 text-white font-extrabold">
                {profile?.name || profile?.username || '—'}
              </h1>
              <div className="flex justify-between">
                <div className="flex">
                  <History className="mr-2" size={15} />
                  <p className="font-semibold text-xs">{joinedLabel}</p>
                </div>
                <div className="flex">
                  <History className="mr-2" size={15} />
                  <p className="font-semibold text-xs">
                    Minutes Listened: {(profile?.minutesListened ?? 0).toLocaleString()} mins
                  </p>
                </div>
                <div className="flex">
                  <Headphones className="mr-2" size={15} />
                  <p className="font-semibold text-xs">{profile?.listenerType || 'Listener'}</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <button
              className="bg-[#B81A3C] text-white cursor-pointer text-sm font-semibold px-4 py-2 rounded-full"
              onClick={() => router.push('/dashboard/profile/edit')}
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
