import { useState, useCallback } from 'react';

const MAX_DISPLAY_NAME = 50;
const MAX_BIO = 160; // 500 chars limit mentioned in issue, wait! The issue says "Bio over 500 chars shows limit error". The current code says `MAX_BIO = 160`. I should update it to 500.
const URL_REGEX = /^https?:\/\/.+\..+/;
const TWITTER_REGEX = /^@?[A-Za-z0-9_]{1,15}$/;

export interface FormValues {
  displayName: string;
  bio: string;
  website: string;
  twitter: string;
}

export interface FormErrors {
  displayName?: string;
  bio?: string;
  website?: string;
  twitter?: string;
  coverImage?: string;
}

export function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};

  if (!values.displayName.trim()) {
    errors.displayName = 'Name is required';
  } else if (values.displayName.trim().length > MAX_DISPLAY_NAME) {
    errors.displayName = `Display name must be ${MAX_DISPLAY_NAME} characters or fewer.`;
  }

  if (values.bio.length > 500) {
    errors.bio = `Bio must be 500 characters or fewer.`;
  }

  if (values.website && !URL_REGEX.test(values.website)) {
    errors.website = 'Enter a valid URL starting with http:// or https://';
  }

  if (values.twitter && !TWITTER_REGEX.test(values.twitter)) {
    errors.twitter = 'Enter a valid X username (1–15 characters, letters, numbers, or _).';
  }

  return errors;
}

export function useFormState(initialValues: FormValues) {
  const [values, setValues] = useState<FormValues>(initialValues);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const errors = validate(values);
  const isFormValid = Object.keys(errors).length === 0 && values.displayName.trim().length > 0;

  const handleChange = useCallback((field: keyof FormValues, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleBlur = useCallback((field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const resetTouched = useCallback(() => {
    setTouched({});
  }, []);

  const setAllTouched = useCallback(() => {
    setTouched({ displayName: true, bio: true, website: true, twitter: true });
  }, []);

  const fieldError = useCallback((field: keyof FormErrors) => {
    return touched[field] ? errors[field] : undefined;
  }, [touched, errors]);

  return {
    values,
    setValues,
    handleChange,
    handleBlur,
    errors,
    touched,
    isFormValid,
    fieldError,
    resetTouched,
    setAllTouched,
  };
}
