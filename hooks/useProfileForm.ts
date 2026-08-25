'use client';

import { useEffect, useCallback, useRef, useMemo } from 'react';
import { useFormState, FormValues } from '@/hooks/useFormState';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useGetProfile, useUpdateProfile } from '@/hooks/useProfile';

const DRAFT_STORAGE_KEY = 'audioblocks_profile_draft';

export interface UseProfileFormReturn {
  values: FormValues;
  isDirty: boolean;
  isLoading: boolean;
  isSubmitting: boolean;
  submitError: string | null;
  handleChange: (field: keyof FormValues, value: string) => void;
  handleBlur: (field: string) => void;
  fieldError: (field: keyof FormValues) => string | undefined;
  isFormValid: boolean;
  handleSubmit: () => Promise<void>;
  resetForm: () => void;
  discardDraft: () => void;
  hasDraft: boolean;
}

export function useProfileForm(): UseProfileFormReturn {
  const { data: profile, isLoading } = useGetProfile();
  const { mutateAsync: saveProfile, isPending: isSubmitting } = useUpdateProfile();

  const serverValues: FormValues = useMemo(
    () => ({
      displayName: profile?.name ?? '',
      bio: profile?.bio ?? '',
      website: profile?.website ?? '',
      twitter: profile?.twitter ?? '',
    }),
    [profile?.name, profile?.bio, profile?.website, profile?.twitter]
  );

  const [draft, setDraft] = useLocalStorage<FormValues | null>(DRAFT_STORAGE_KEY, null);

  const initialValues = draft ?? serverValues;
  const form = useFormState(initialValues);

  // Once profile loads, seed the form if no draft is already in use.
  const seeded = useRef(false);
  useEffect(() => {
    if (!isLoading && profile && !seeded.current) {
      seeded.current = true;
      if (!draft) {
        form.setValues(serverValues);
      }
    }
  }, [isLoading, profile, draft, form, serverValues]);

  // Auto-save draft to localStorage whenever values change.
  useEffect(() => {
    const hasMeaningfulChange =
      form.values.displayName !== serverValues.displayName ||
      form.values.bio !== serverValues.bio ||
      form.values.website !== serverValues.website ||
      form.values.twitter !== serverValues.twitter;

    setDraft(hasMeaningfulChange ? form.values : null);
  }, [form.values, serverValues, setDraft]);

  const isDirty =
    form.values.displayName !== serverValues.displayName ||
    form.values.bio !== serverValues.bio ||
    form.values.website !== serverValues.website ||
    form.values.twitter !== serverValues.twitter;

  const submitError = useRef<string | null>(null);

  const handleSubmit = useCallback(async () => {
    form.setAllTouched();
    if (!form.isFormValid) return;

    submitError.current = null;
    try {
      await saveProfile({
        name: form.values.displayName.trim(),
        bio: form.values.bio,
        website: form.values.website,
        twitter: form.values.twitter,
      });
      setDraft(null);
      form.resetTouched();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save profile.';
      submitError.current = msg;
    }
  }, [form, saveProfile, setDraft]);

  const resetForm = useCallback(() => {
    form.setValues(serverValues);
    form.resetTouched();
    setDraft(null);
  }, [form, serverValues, setDraft]);

  const discardDraft = useCallback(() => {
    setDraft(null);
    form.setValues(serverValues);
    form.resetTouched();
  }, [form, serverValues, setDraft]);

  return {
    values: form.values,
    isDirty,
    isLoading,
    isSubmitting,
    submitError: submitError.current,
    handleChange: form.handleChange,
    handleBlur: form.handleBlur,
    fieldError: form.fieldError,
    isFormValid: form.isFormValid,
    handleSubmit,
    resetForm,
    discardDraft,
    hasDraft: draft !== null,
  };
}
