'use client';

import Image from 'next/image';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGetProfile, useUpdateProfile } from '@/hooks/useProfile';
import AvatarCrop from '@/components/common/dashboard/AvatarCrop';
import { toast } from 'sonner';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_MB = 5;

const EditProfile = () => {
  const router = useRouter();
  const { data: profile, isLoading } = useGetProfile();
  const { mutate: update, isPending } = useUpdateProfile();

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [twitter, setTwitter] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.name || profile.username || '');
      setBio(profile.bio || '');
      setWebsite(profile.website || '');
      setTwitter(profile.twitter || '');
    }
  }, [profile]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Please select a valid image file (JPEG, PNG, WebP, or GIF).');
      return;
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Image must be under ${MAX_SIZE_MB}MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setRawImageSrc(reader.result as string);
      setCropOpen(true);
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCropComplete = (croppedDataUrl: string) => {
    setAvatarPreview(croppedDataUrl);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    update(
      { name: displayName, bio, website, twitter },
      { onSuccess: () => router.push('/dashboard/profile') }
    );
  };

  return (
    <div className="min-h-screen">
      <div className="mb-4">
        <button
          onClick={() => router.push('/dashboard/profile')}
          className="bg-pink-600 cursor-pointer font-semibold text-xs px-4 py-3 rounded-lg"
        >
          Profile
        </button>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-800 rounded-lg w-full max-w-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-30">
          <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
            <div>
              <label className="block mb-2 text-base font-medium">Display name</label>
              <input
                type="text"
                placeholder="Add Display name"
                className="w-full bg-[#1A1A1A] text-white rounded-lg px-4 py-2 placeholder:text-sm placeholder:text-[#4B4B4B] focus:outline-none"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>

            <div>
              <label className="block mb-2 text-base font-medium">Short bio</label>
              <input
                type="text"
                placeholder="Tell about yourself in a few words"
                className="w-full bg-[#1A1A1A] text-white rounded-lg px-4 py-2 placeholder:text-sm placeholder:text-[#4B4B4B] focus:outline-none"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>

            <div>
              <label className="block mb-2 text-base font-medium">Website URL</label>
              <input
                type="url"
                placeholder="https://"
                className="w-full bg-[#1A1A1A] text-white rounded-lg px-4 py-2 placeholder:text-sm placeholder:text-[#4B4B4B] focus:outline-none"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>

            <div>
              <label className="block mb-2 text-base font-medium">X (Twitter)</label>
              <input
                type="text"
                placeholder="Enter your X username"
                className="w-full bg-[#1A1A1A] text-white rounded-lg px-4 py-2 placeholder:text-sm placeholder:text-[#4B4B4B] focus:outline-none"
                value={twitter}
                onChange={(e) => setTwitter(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="bg-pink-600 text-white px-6 py-2 rounded-md font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? 'Saving…' : 'Save'}
            </button>
          </form>

          <div className="bg-[#1A1A1A] h-85 rounded-xl shadow-md p-3 flex flex-col max-w-xs">
            <Image
              src={avatarPreview || profile?.profileImage || '/dashboard/profiledefault.png'}
              alt="User Profile"
              width={300}
              height={200}
              className="rounded-lg mb-4 object-cover w-full h-40"
            />
            <h3 className="font-semibold text-lg mb-1">Profile</h3>
            <p className="text-sm font-medium text-gray-400 text-left mb-4">
              Make your profile stand out with a striking avatar
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="border cursor-pointer font-semibold border-white w-full rounded-md px-4 py-2 text-sm hover:bg-white hover:text-black transition"
            >
              Change Avatar
            </button>
            <p className="text-[10px] text-gray-500 text-center mt-2">
              JPEG, PNG, WebP or GIF. Max {MAX_SIZE_MB}MB.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleImageSelect}
            />
          </div>
        </div>
      )}

      <AvatarCrop
        open={cropOpen}
        onOpenChange={setCropOpen}
        imageSrc={rawImageSrc}
        onCropComplete={handleCropComplete}
      />
    </div>
  );
};

export default EditProfile;
