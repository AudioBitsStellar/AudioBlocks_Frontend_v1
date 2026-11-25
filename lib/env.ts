const requiredEnvVars = ['NEXT_PUBLIC_API_URL', 'NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID'] as const;

export type RequiredEnv = typeof requiredEnvVars[number];

export interface ValidatedEnv {
  NEXT_PUBLIC_API_URL: string;
  NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID: string;
  NEXT_PUBLIC_STELLAR_NETWORK?: 'testnet' | 'public';
}

export function validateEnv(): ValidatedEnv {
  const missing = requiredEnvVars.filter((key) => !process.env[key] || process.env[key]!.trim() === '');

  if (missing.length > 0) {
    const message = `Missing required environment variables: ${missing.join(', ')}. Please check your .env.local or .env file.`;
    console.error(message);
    throw new Error(message);
  }

  // Validate Stellar network if provided
  const stellarNetwork = process.env.NEXT_PUBLIC_STELLAR_NETWORK;
  if (stellarNetwork && stellarNetwork !== 'testnet' && stellarNetwork !== 'public') {
    const message = `Invalid NEXT_PUBLIC_STELLAR_NETWORK: "${stellarNetwork}". Must be "testnet" or "public".`;
    console.error(message);
    throw new Error(message);
  }

  return {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL!.trim(),
    NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID: process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID!.trim(),
    NEXT_PUBLIC_STELLAR_NETWORK: stellarNetwork as 'testnet' | 'public' | undefined,
  };
}

let cachedEnv: ValidatedEnv | null = null;

export function getValidatedEnv(): ValidatedEnv {
  if (!cachedEnv) {
    cachedEnv = validateEnv();
  }
  return cachedEnv;
}
