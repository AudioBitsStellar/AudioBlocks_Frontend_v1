const requiredEnvVars = ['NEXT_PUBLIC_API_URL', 'NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID'] as const;

/** Name of an environment variable required by the application. */
export type RequiredEnv = (typeof requiredEnvVars)[number];

/**
 * Environment values after validation and whitespace normalization.
 *
 * @property NEXT_PUBLIC_API_URL - Base URL used for API requests.
 * @property NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID - Dynamic Labs environment ID used for login.
 */
export interface ValidatedEnv {
  NEXT_PUBLIC_API_URL: string;
  NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID: string;
}

/**
 * Reads the required variables through literal `process.env.NEXT_PUBLIC_*`
 * accesses. Next.js only inlines statically-referenced variables into the
 * client bundle, so `process.env[key]` would always be empty in the browser.
 */
function readEnv(): Record<RequiredEnv, string | undefined> {
  return {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID: process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID,
  };
}

/**
 * Validates required environment variables and returns their normalized values.
 *
 * @returns The validated application environment configuration.
 * @throws Error when one or more required environment variables are missing.
 */
export function validateEnv(): ValidatedEnv {
  const values = readEnv();
  const missing = requiredEnvVars.filter((key) => !values[key] || values[key]!.trim() === '');

  if (missing.length > 0) {
    const message = `Missing required environment variables: ${missing.join(', ')}. Please check your .env.local or .env file.`;
    if (typeof window !== 'undefined') {
      console.error(message);
    }
    throw new Error(message);
  }

  return {
    NEXT_PUBLIC_API_URL: values.NEXT_PUBLIC_API_URL!.trim(),
    NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID: values.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID!.trim(),
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
