import { useState, useCallback, useRef } from 'react';
import { isValidProfileUrl } from '@/lib/profileService';

const MAX_DISPLAY_NAME = 50;
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

  if (values.website && !isValidProfileUrl(values.website)) {
    errors.website = 'Enter a valid URL starting with http:// or https://';
  }

  if (values.twitter && !TWITTER_REGEX.test(values.twitter)) {
    errors.twitter = 'Enter a valid X username (1–15 characters, letters, numbers, or _).';
  }

  return errors;
}

export function useFormState(initialValues: FormValues) {
  const initialRef = useRef<FormValues>(initialValues);
  const [values, setValues] = useState<FormValues>(initialValues);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const errors = validate(values);
  const isFormValid = Object.keys(errors).length === 0 && values.displayName.trim().length > 0;

  // ── Dirty tracking (#120) ─────────────────────────────────────────────────

  const dirtyFields = useCallback((): Record<keyof FormValues, boolean> => {
    const init = initialRef.current;
    return {
      displayName: values.displayName !== init.displayName,
      bio: values.bio !== init.bio,
      website: values.website !== init.website,
      twitter: values.twitter !== init.twitter,
    };
  }, [values]);

  const isFieldDirty = useCallback(
    (field: keyof FormValues): boolean => dirtyFields()[field],
    [dirtyFields],
  );

  const isFormDirty = useCallback(
    (): boolean => Object.values(dirtyFields()).some(Boolean),
    [dirtyFields],
  );

  // ── Field handlers ────────────────────────────────────────────────────────

  const handleChange = useCallback((field: keyof FormValues, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleBlur = useCallback((field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  // ── Reset (#120) ──────────────────────────────────────────────────────────

  /** Restore all fields to initial values and clear touched/dirty state. */
  const reset = useCallback((nextInitial?: FormValues) => {
    const base = nextInitial ?? initialRef.current;
    if (nextInitial) initialRef.current = nextInitial;
    setValues(base);
    setTouched({});
  }, []);

  // ── Submit (#120) ─────────────────────────────────────────────────────────

  /**
   * Validate all fields, mark all as touched so errors surface, and call
   * onSubmit with the current values. Sets isSubmitting during the call.
   * Resolves with the submitted values on success; rejects if validation fails.
   */
  const submit = useCallback(
    async (onSubmit: (values: FormValues) => Promise<void>): Promise<FormValues> => {
      setTouched({ displayName: true, bio: true, website: true, twitter: true });
      const currentErrors = validate(values);
      if (Object.keys(currentErrors).length > 0) {
        return Promise.reject(new Error('Form has validation errors'));
      }
      setIsSubmitting(true);
      try {
        await onSubmit(values);
        // After a successful save the server values become the new dirty baseline.
        initialRef.current = values;
        return values;
      } finally {
        setIsSubmitting(false);
      }
    },
    [values],
  );

  // ── Error helpers ─────────────────────────────────────────────────────────

  const resetTouched = useCallback(() => setTouched({}), []);

  const setAllTouched = useCallback(() => {
    setTouched({ displayName: true, bio: true, website: true, twitter: true });
  }, []);

  const fieldError = useCallback(
    (field: keyof FormErrors) => (touched[field] ? errors[field] : undefined),
    [touched, errors],
  );

  return {
    values,
    setValues,
    handleChange,
    handleBlur,
    errors,
    touched,
    isFormValid,
    isFormDirty,
    isFieldDirty,
    dirtyFields,
    isSubmitting,
    submit,
    reset,
    fieldError,
    resetTouched,
    setAllTouched,
  };
}
