'use client';

import Image from 'next/image';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useGetProfile, useUpdateProfile } from '@/hooks/useProfile';
import AvatarCrop from '@/components/common/dashboard/AvatarCrop';
import { toast } from 'sonner';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_MB = 5;

const MAX_DISPLAY_NAME = 50;
const MAX_BIO = 160;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const URL_REGEX = /^https?:\/\/.+\..+/;
const TWITTER_REGEX = /^@?[A-Za-z0-9_]{1,15}$/;

interface FormErrors {
  displayName?: string;
  bio?: string;
  website?: string;
  twitter?: string;
  coverImage?: string;
}

function validate(
  displayName: string,
  bio: string,
  website: string,
  twitter: string
): FormErrors {
  const errors: FormErrors = {};

  if (!displayName.trim()) {
    errors.displayName = 'Display name is required.';
  } else if (displayName.trim().length > MAX_DISPLAY_NAME) {
    errors.displayName = `Display name must be ${MAX_DISPLAY_NAME} characters or fewer.`;
  }

  if (bio.length > MAX_BIO) {
    errors.bio = `Bio must be ${MAX_BIO} characters or fewer.`;
  }

  if (website && !URL_REGEX.test(website)) {
    errors.website = 'Enter a valid URL starting with http:// or https://';
  }

  if (twitter && !TWITTER_REGEX.test(twitter)) {
    errors.twitter = 'Enter a valid X username (1–15 characters, letters, numbers, or _).';
  }

  return errors;
}

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

  const isFormValid =
    Object.keys(errors).length === 0 && displayName.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Mark all fields as touched so errors show on submit attempt
    setTouched({ displayName: true, bio: true, website: true, twitter: true });
    if (!isFormValid) return;
    update(
      { name: displayName, bio, website, twitter },
      {
        onSuccess: () => {
          setIsDirty(false);
          router.push('/dashboard/profile');
        },
      }
    );
  };

  const fieldError = (field: keyof FormErrors) =>
    touched[field] ? errors[field] : undefined;

  return (
    <div className="min-h-screen">
      <div className="mb-4">
        <button
          onClick={handleBack}
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
          <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6" noValidate>
            {/* Display Name */}
            <div>
              <label className="block mb-2 text-base font-medium">
                Display name <span className="text-pink-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Add Display name"
                maxLength={MAX_DISPLAY_NAME + 1}
                className={`w-full bg-[#1A1A1A] text-white rounded-lg px-4 py-2 placeholder:text-sm placeholder:text-[#4B4B4B] focus:outline-none ${
                  fieldError('displayName') ? 'ring-1 ring-red-500' : ''
                }`}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onBlur={() => handleBlur('displayName')}
                aria-invalid={!!fieldError('displayName')}
                aria-describedby={fieldError('displayName') ? 'displayName-error' : undefined}
              />
              <div className="flex justify-between mt-1">
                {fieldError('displayName') ? (
                  <p id="displayName-error" className="text-red-400 text-xs">
                    {fieldError('displayName')}
                  </p>
                ) : (
                  <span />
                )}
                <span className="text-xs text-gray-500 ml-auto">
                  {displayName.length}/{MAX_DISPLAY_NAME}
                </span>
              </div>
            </div>

            {/* Bio */}
            <div>
              <label className="block mb-2 text-base font-medium">Short bio</label>
              <input
                type="text"
                placeholder="Tell about yourself in a few words"
                maxLength={MAX_BIO + 1}
                className={`w-full bg-[#1A1A1A] text-white rounded-lg px-4 py-2 placeholder:text-sm placeholder:text-[#4B4B4B] focus:outline-none ${
                  fieldError('bio') ? 'ring-1 ring-red-500' : ''
                }`}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                onBlur={() => handleBlur('bio')}
                aria-invalid={!!fieldError('bio')}
                aria-describedby={fieldError('bio') ? 'bio-error' : undefined}
              />
              <div className="flex justify-between mt-1">
                {fieldError('bio') ? (
                  <p id="bio-error" className="text-red-400 text-xs">
                    {fieldError('bio')}
                  </p>
                ) : (
                  <span />
                )}
                <span className="text-xs text-gray-500 ml-auto">
                  {bio.length}/{MAX_BIO}
                </span>
              </div>
            </div>

            {/* Website */}
            <div>
              <label className="block mb-2 text-base font-medium">Website URL</label>
              <input
                type="url"
                placeholder="https://"
                className={`w-full bg-[#1A1A1A] text-white rounded-lg px-4 py-2 placeholder:text-sm placeholder:text-[#4B4B4B] focus:outline-none ${
                  fieldError('website') ? 'ring-1 ring-red-500' : ''
                }`}
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                onBlur={() => handleBlur('website')}
                aria-invalid={!!fieldError('website')}
                aria-describedby={fieldError('website') ? 'website-error' : undefined}
              />
              {fieldError('website') && (
                <p id="website-error" className="text-red-400 text-xs mt-1">
                  {fieldError('website')}
                </p>
              )}
            </div>

            {/* Twitter / X */}
            <div>
              <label className="block mb-2 text-base font-medium">X (Twitter)</label>
              <input
                type="text"
                placeholder="Enter your X username"
                className={`w-full bg-[#1A1A1A] text-white rounded-lg px-4 py-2 placeholder:text-sm placeholder:text-[#4B4B4B] focus:outline-none ${
                  fieldError('twitter') ? 'ring-1 ring-red-500' : ''
                }`}
                value={twitter}
                onChange={(e) => setTwitter(e.target.value)}
                onBlur={() => handleBlur('twitter')}
                aria-invalid={!!fieldError('twitter')}
                aria-describedby={fieldError('twitter') ? 'twitter-error' : undefined}
              />
              {fieldError('twitter') && (
                <p id="twitter-error" className="text-red-400 text-xs mt-1">
                  {fieldError('twitter')}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isPending || !isFormValid}
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
            {errors.coverImage && (
              <p className="text-red-400 text-xs mb-2">{errors.coverImage}</p>
            )}
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
