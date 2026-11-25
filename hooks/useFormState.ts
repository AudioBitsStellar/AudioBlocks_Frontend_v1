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

export interface FieldSchema {
  required?: string;
  maxLength?: { length: number; message: string };
  pattern?: { test: RegExp; message: string };
  custom?: (value: string) => string | undefined;
}

export type FormSchema = Record<keyof FormValues, FieldSchema>;

export const profileFormSchema: FormSchema = {
  displayName: {
    required: 'Name is required',
    maxLength: {
      length: MAX_DISPLAY_NAME,
      message: `Display name must be ${MAX_DISPLAY_NAME} characters or fewer.`,
    },
  },
  bio: {
    maxLength: { length: 500, message: 'Bio must be 500 characters or fewer.' },
  },
  website: {
    custom: (value) =>
      value && !isValidProfileUrl(value)
        ? 'Enter a valid URL starting with http:// or https://'
        : undefined,
  },
  twitter: {
    pattern: {
      test: TWITTER_REGEX,
      message: 'Enter a valid X username (1–15 characters, letters, numbers, or _).',
    },
  },
};

export function validate(values: FormValues, schema: FormSchema = profileFormSchema): FormErrors {
  const errors: FormErrors = {};
  (Object.keys(schema) as Array<keyof FormValues>).forEach((field) => {
    const rule = schema[field];
    const value = values[field] ?? '';
    if (rule.required && !value.trim()) {
      errors[field] = rule.required;
      return;
    }
    if (rule.maxLength && value.length > rule.maxLength.length) {
      errors[field] = rule.maxLength.message;
      return;
    }
    if (value && rule.pattern && !rule.pattern.test.test(value)) {
      errors[field] = rule.pattern.message;
      return;
    }
    const custom = rule.custom?.(value);
    if (custom) errors[field] = custom;
  });
  return errors;
}

export function useFormState(initialValues: FormValues, schema: FormSchema = profileFormSchema) {
  const initialRef = useRef<FormValues>(initialValues);
  const [values, setValues] = useState<FormValues>(initialValues);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const errors = validate(values, schema);
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
      const currentErrors = validate(values, schema);
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
    [schema, values],
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
