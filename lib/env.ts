const requiredEnvVars = [
  'NEXT_PUBLIC_API_URL',
] as const;

export type RequiredEnv = typeof requiredEnvVars[number];

export interface ValidatedEnv {
  NEXT_PUBLIC_API_URL: string;
}

function validateEnv(): ValidatedEnv {
  const missing = requiredEnvVars.filter((key) => !process.env[key] || process.env[key]!.trim() === '');

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

export function getValidatedEnv(): ValidatedEnv {
  if (!cachedEnv) {
    cachedEnv = validateEnv();
  }
  return cachedEnv;
}
