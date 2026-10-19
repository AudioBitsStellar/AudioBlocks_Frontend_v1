/**
 * `GET /api/users/profile` body (AudioBlock_Backend `UserService.toProfileResponse`).
 * Public profiles (`GET /api/users/:id/public`) expose the subset in
 * `toPublicProfile` below.
 */
export interface MockOwnProfile {
  id: string;
  username: string;
  name: string;
  email: string;
  bio: string | null;
  profileImage: string | null;
  avatarIpfsHash: string | null;
  pageCover: string | null;
  website: string | null;
  role: 'listener' | 'artist' | 'admin';
  walletAddress: string | null;
  stellarPublicKey: string | null;
  isProfilePublic: boolean;
  twitterUsername: string | null;
  totalStreams: number;
  totalStreamTime: number;
  uniqueListeners: number;
  rewardPoints: number;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export const mockOwnProfileFixture: MockOwnProfile = {
  id: '7d2e4b30-0000-4000-8000-000000000001',
  username: 'alexia',
  name: 'Alexia Stephen',
  email: 'alexia@example.com',
  bio: 'Music enthusiast and Web3 audio collector',
  profileImage: '/AFRO.jpg',
  avatarIpfsHash: null,
  pageCover: null,
  website: 'https://alexia.example.com',
  role: 'listener',
  walletAddress: null,
  stellarPublicKey: 'GABQGAYDAMBQGAYDAMBQGAYDAMBQGAYDAMBQGAYDAMBQGAYDAMBQHGPC',
  isProfilePublic: true,
  twitterUsername: 'alexiastephen',
  totalStreams: 0,
  totalStreamTime: 0,
  uniqueListeners: 0,
  rewardPoints: 120,
  emailVerified: true,
  createdAt: '2024-11-02T08:00:00.000Z',
  updatedAt: '2025-03-15T10:30:00.000Z',
};

export function toPublicProfile(profile: MockOwnProfile) {
  const { id, username, name, bio, profileImage, avatarIpfsHash, pageCover, website, role } =
    profile;
  const { totalStreams, totalStreamTime, uniqueListeners } = profile;
  return {
    id,
    username,
    name,
    bio,
    profileImage,
    avatarIpfsHash,
    pageCover,
    website,
    role,
    totalStreams,
    totalStreamTime,
    uniqueListeners,
  };
}
