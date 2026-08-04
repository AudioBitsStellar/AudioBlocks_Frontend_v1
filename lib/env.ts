const requiredEnvVars = ['NEXT_PUBLIC_API_URL'] as const;

/** Name of an environment variable required by the application. */
export type RequiredEnv = (typeof requiredEnvVars)[number];

/**
 * Environment values after validation and whitespace normalization.
 *
 * @property NEXT_PUBLIC_API_URL - Base URL used for API requests.
 */
export interface ValidatedEnv {
  NEXT_PUBLIC_API_URL: string;
}

/**
 * Validates required environment variables and returns their normalized values.
 *
 * @returns The validated application environment configuration.
 * @throws Error when one or more required environment variables are missing.
 */
export function validateEnv(): ValidatedEnv {
  const missing = requiredEnvVars.filter(
    (key) => !process.env[key] || process.env[key]!.trim() === '',
  );

  if (missing.length > 0) {
    const message = `Missing required environment variables: ${missing.join(', ')}. Please check your .env.local or .env file.`;
    if (typeof window !== 'undefined') {
      console.error(message);
    }
    throw new Error(message);
  }

  return {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL!.trim(),
  };
}

let cachedEnv: ValidatedEnv | null = null;

/**
 * Returns the validated environment configuration, caching it after the first
 * successful validation.
 *
 * @returns The cached validated environment configuration.
 * @throws Error when a required environment variable is missing.
 */
export function getValidatedEnv(): ValidatedEnv {
  if (!cachedEnv) {
    cachedEnv = validateEnv();
  }
  return cachedEnv;
}
