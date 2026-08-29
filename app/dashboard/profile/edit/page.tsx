'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import AvatarCrop from '@/components/common/dashboard/AvatarCrop';
import { useFormState } from '@/hooks/useFormState';
import { useGetProfile, useUpdateProfile } from '@/hooks/useProfile';
import { sanitizeUserInput } from '@/lib/sanitize';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_MB = 5;
const MAX_DISPLAY_NAME = 50;
const MAX_BIO = 500;

const EditProfile = () => {
  const router = useRouter();
  const { data: profile, isLoading } = useGetProfile();
  const { mutate: update, isPending } = useUpdateProfile();

  const {
    values,
    setValues,
    handleChange,
    handleBlur,
    errors,
    isFormValid,
    fieldError,
    setAllTouched,
  } = useFormState({
    displayName: '',
    bio: '',
    website: '',
    twitter: '',
  });

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string>('');
  const [isDirty, setIsDirty] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setValues({
        displayName: profile.name || profile.username || '',
        bio: profile.bio || '',
        website: profile.website || '',
        twitter: profile.twitter || '',
      });
    }
  }, [profile, setValues]);

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
    // Mark all fields as touched so errors show on submit attempt
    setAllTouched();
    if (!isFormValid) return;
    update(
      {
        name: sanitizeUserInput(values.displayName),
        bio: sanitizeUserInput(values.bio),
        website: values.website,
        twitter: values.twitter,
      },
      {
        onSuccess: () => {
          setIsDirty(false);
          router.push('/dashboard/profile');
        },
      }
    );
  };

  const handleBack = () => {
    router.push('/dashboard/profile');
  };

  return (
    <div className="min-h-screen">
      <div className="mb-4">
        <button
          className="bg-pink-600 cursor-pointer font-semibold text-xs px-4 py-3 rounded-lg"
          onClick={handleBack}
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
          <form noValidate className="lg:col-span-2 space-y-6" onSubmit={handleSubmit}>
            {/* Display Name */}
            <div>
              <label className="block mb-2 text-base font-medium">
                Display name <span className="text-pink-500">*</span>
              </label>
              <input
                aria-describedby={fieldError('displayName') ? 'displayName-error' : undefined}
                aria-invalid={!!fieldError('displayName')}
                className={`w-full bg-[#1A1A1A] text-white rounded-lg px-4 py-2 placeholder:text-sm placeholder:text-[#4B4B4B] focus:outline-none ${
                  fieldError('displayName') ? 'ring-1 ring-red-500' : ''
                }`}
                maxLength={MAX_DISPLAY_NAME + 1}
                placeholder="Add Display name"
                type="text"
                value={values.displayName}
                onBlur={() => handleBlur('displayName')}
                onChange={(e) => handleChange('displayName', e.target.value)}
              />
              <div className="flex justify-between mt-1">
                {fieldError('displayName') ? (
                  <p className="text-red-400 text-xs" id="displayName-error">
                    {fieldError('displayName')}
                  </p>
                ) : (
                  <span />
                )}
                <span className="text-xs text-gray-500 ml-auto">
                  {values.displayName.length}/{MAX_DISPLAY_NAME}
                </span>
              </div>
            </div>

            {/* Bio */}
            <div>
              <label className="block mb-2 text-base font-medium">Short bio</label>
              <input
                aria-describedby={fieldError('bio') ? 'bio-error' : undefined}
                aria-invalid={!!fieldError('bio')}
                className={`w-full bg-[#1A1A1A] text-white rounded-lg px-4 py-2 placeholder:text-sm placeholder:text-[#4B4B4B] focus:outline-none ${
                  fieldError('bio') ? 'ring-1 ring-red-500' : ''
                }`}
                maxLength={MAX_BIO + 1}
                placeholder="Tell about yourself in a few words"
                type="text"
                value={values.bio}
                onBlur={() => handleBlur('bio')}
                onChange={(e) => handleChange('bio', e.target.value)}
              />
              <div className="flex justify-between mt-1">
                {fieldError('bio') ? (
                  <p className="text-red-400 text-xs" id="bio-error">
                    {fieldError('bio')}
                  </p>
                ) : (
                  <span />
                )}
                <span className="text-xs text-gray-500 ml-auto">
                  {values.bio.length}/{MAX_BIO}
                </span>
              </div>
            </div>

            {/* Website */}
            <div>
              <label className="block mb-2 text-base font-medium">Website URL</label>
              <input
                aria-describedby={fieldError('website') ? 'website-error' : undefined}
                aria-invalid={!!fieldError('website')}
                className={`w-full bg-[#1A1A1A] text-white rounded-lg px-4 py-2 placeholder:text-sm placeholder:text-[#4B4B4B] focus:outline-none ${
                  fieldError('website') ? 'ring-1 ring-red-500' : ''
                }`}
                placeholder="https://"
                type="url"
                value={values.website}
                onBlur={() => handleBlur('website')}
                onChange={(e) => handleChange('website', e.target.value)}
              />
              {fieldError('website') && (
                <p className="text-red-400 text-xs mt-1" id="website-error">
                  {fieldError('website')}
                </p>
              )}
            </div>

            {/* Twitter / X */}
            <div>
              <label className="block mb-2 text-base font-medium">X (Twitter)</label>
              <input
                aria-describedby={fieldError('twitter') ? 'twitter-error' : undefined}
                aria-invalid={!!fieldError('twitter')}
                className={`w-full bg-[#1A1A1A] text-white rounded-lg px-4 py-2 placeholder:text-sm placeholder:text-[#4B4B4B] focus:outline-none ${
                  fieldError('twitter') ? 'ring-1 ring-red-500' : ''
                }`}
                placeholder="Enter your X username"
                type="text"
                value={values.twitter}
                onBlur={() => handleBlur('twitter')}
                onChange={(e) => handleChange('twitter', e.target.value)}
              />
              {fieldError('twitter') && (
                <p className="text-red-400 text-xs mt-1" id="twitter-error">
                  {fieldError('twitter')}
                </p>
              )}
            </div>

            <button
              className="bg-pink-600 text-white px-6 py-2 rounded-md font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isPending || !isFormValid}
              type="submit"
            >
              {isPending ? 'Saving…' : 'Save'}
            </button>
          </form>

          <div className="bg-[#1A1A1A] h-85 rounded-xl shadow-md p-3 flex flex-col max-w-xs">
            <Image
              alt="User Profile"
              className="rounded-lg mb-4 object-cover w-full h-40"
              height={200}
              src={avatarPreview || profile?.profileImage || '/dashboard/profiledefault.png'}
              width={300}
            />
            <h3 className="font-semibold text-lg mb-1">Profile</h3>
            <p className="text-sm font-medium text-gray-400 text-left mb-4">
              Make your profile stand out with a striking avatar
            </p>
            {errors.coverImage && <p className="text-red-400 text-xs mb-2">{errors.coverImage}</p>}
            <button
              className="border cursor-pointer font-semibold border-white w-full rounded-md px-4 py-2 text-sm hover:bg-white hover:text-black transition"
              type="button"
              onClick={() => fileInputRef.current?.click()}
            >
              Change Avatar
            </button>
            <p className="text-[10px] text-gray-500 text-center mt-2">
              JPEG, PNG, WebP or GIF. Max {MAX_SIZE_MB}MB.
            </p>
            <input
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              type="file"
              onChange={handleImageSelect}
            />
          </div>
        </div>
      )}

      <AvatarCrop
        imageSrc={rawImageSrc}
        open={cropOpen}
        onCropComplete={handleCropComplete}
        onOpenChange={setCropOpen}
      />
    </div>
  );
};

export default EditProfile;
