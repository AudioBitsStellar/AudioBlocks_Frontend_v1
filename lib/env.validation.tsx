/**
 * Environment Variable Validation
 *
 * This module validates all required environment variables at startup.
 * If any required variables are missing or invalid, it will display
 * a clear error message and prevent the app from rendering.
 */

interface EnvConfig {
  // Blockchain
  chainId: number;
  rpcUrl: string;
  contractAddress: string;
  usdcAddress: string;

  // API
  apiBaseUrl: string;
  apiTimeout: number;

  // Authentication
  dynamicEnvId: string;

  // Optional
  segmentWriteKey?: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  enableDevtools: boolean;
  cacheTtl: number;
  analyticsEnabled: boolean;
}

interface ValidationResult {
  isValid: boolean;
  errors: Array<{
    variable: string;
    message: string;
    solution: string;
  }>;
}

/**
 * Validates all environment variables
 */
export function validateEnv(): ValidationResult {
  const errors: ValidationResult['errors'] = [];

  // Required: NEXT_PUBLIC_CHAIN_ID
  if (!process.env.NEXT_PUBLIC_CHAIN_ID) {
    errors.push({
      variable: 'NEXT_PUBLIC_CHAIN_ID',
      message: 'Missing required environment variable',
      solution: 'Set NEXT_PUBLIC_CHAIN_ID in .env.local (11155111 for Sepolia, 1 for mainnet)',
    });
  } else if (isNaN(Number(process.env.NEXT_PUBLIC_CHAIN_ID))) {
    errors.push({
      variable: 'NEXT_PUBLIC_CHAIN_ID',
      message: 'Invalid value - must be a number',
      solution: 'Use a valid chain ID like 11155111 or 1',
    });
  }

  // Required: NEXT_PUBLIC_RPC_URL
  if (!process.env.NEXT_PUBLIC_RPC_URL) {
    errors.push({
      variable: 'NEXT_PUBLIC_RPC_URL',
      message: 'Missing required environment variable',
      solution: 'Set NEXT_PUBLIC_RPC_URL to your RPC provider endpoint (Infura, Alchemy, etc.)',
    });
  } else if (!isValidUrl(process.env.NEXT_PUBLIC_RPC_URL)) {
    errors.push({
      variable: 'NEXT_PUBLIC_RPC_URL',
      message: 'Invalid URL format',
      solution: 'Ensure URL starts with http:// or https://',
    });
  }

  // Required: NEXT_PUBLIC_CONTRACT_ADDRESS
  if (!process.env.NEXT_PUBLIC_CONTRACT_ADDRESS) {
    errors.push({
      variable: 'NEXT_PUBLIC_CONTRACT_ADDRESS',
      message: 'Missing required environment variable',
      solution: 'Set NEXT_PUBLIC_CONTRACT_ADDRESS to the AudioBlocks smart contract address',
    });
  } else if (!isValidAddress(process.env.NEXT_PUBLIC_CONTRACT_ADDRESS)) {
    errors.push({
      variable: 'NEXT_PUBLIC_CONTRACT_ADDRESS',
      message: 'Invalid Ethereum address format',
      solution: 'Address must start with 0x and contain 40 hex characters',
    });
  }

  // Required: NEXT_PUBLIC_USDC_ADDRESS
  if (!process.env.NEXT_PUBLIC_USDC_ADDRESS) {
    errors.push({
      variable: 'NEXT_PUBLIC_USDC_ADDRESS',
      message: 'Missing required environment variable',
      solution: 'Set NEXT_PUBLIC_USDC_ADDRESS to the USDC token contract address',
    });
  } else if (!isValidAddress(process.env.NEXT_PUBLIC_USDC_ADDRESS)) {
    errors.push({
      variable: 'NEXT_PUBLIC_USDC_ADDRESS',
      message: 'Invalid Ethereum address format',
      solution: 'Address must start with 0x and contain 40 hex characters',
    });
  }

  // Required: NEXT_PUBLIC_API_BASE_URL
  if (!process.env.NEXT_PUBLIC_API_BASE_URL) {
    errors.push({
      variable: 'NEXT_PUBLIC_API_BASE_URL',
      message: 'Missing required environment variable',
      solution: 'Set NEXT_PUBLIC_API_BASE_URL to your backend API endpoint',
    });
  } else if (!isValidUrl(process.env.NEXT_PUBLIC_API_BASE_URL)) {
    errors.push({
      variable: 'NEXT_PUBLIC_API_BASE_URL',
      message: 'Invalid URL format',
      solution: 'Ensure URL starts with http:// or https://',
    });
  }

  // Required: NEXT_PUBLIC_DYNAMIC_ENV_ID
  if (!process.env.NEXT_PUBLIC_DYNAMIC_ENV_ID) {
    errors.push({
      variable: 'NEXT_PUBLIC_DYNAMIC_ENV_ID',
      message: 'Missing required environment variable',
      solution: 'Set NEXT_PUBLIC_DYNAMIC_ENV_ID with your Dynamic Labs environment ID',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Gets the validated environment configuration
 */
export function getEnvConfig(): EnvConfig {
  const validation = validateEnv();

  if (!validation.isValid) {
    throw new Error(
      `Environment configuration is invalid:\n${validation.errors
        .map((err) => `- ${err.variable}: ${err.message}\n  → ${err.solution}`)
        .join('\n')}`
    );
  }

  return {
    chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID!),
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL!,
    contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!,
    usdcAddress: process.env.NEXT_PUBLIC_USDC_ADDRESS!,
    apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL!,
    apiTimeout: Number(process.env.NEXT_PUBLIC_API_TIMEOUT || 30000),
    dynamicEnvId: process.env.NEXT_PUBLIC_DYNAMIC_ENV_ID!,
    segmentWriteKey: process.env.NEXT_PUBLIC_SEGMENT_WRITE_KEY,
    logLevel: (process.env.NEXT_PUBLIC_LOG_LEVEL || 'info') as EnvConfig['logLevel'],
    enableDevtools: process.env.NEXT_PUBLIC_ENABLE_DEVTOOLS === 'true',
    cacheTtl: Number(process.env.NEXT_PUBLIC_CACHE_TTL || 300000),
    analyticsEnabled: process.env.NEXT_PUBLIC_ANALYTICS_ENABLED !== 'false',
  };
}

/**
 * Validates if a string is a valid URL
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates if a string is a valid Ethereum address
 */
function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Error component for displaying validation errors
 */
export function EnvConfigErrorBoundary({ children }: { children: React.ReactNode }) {
  try {
    getEnvConfig();
    return <>{children}</>;
  } catch (error) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-red-50 p-4">
        <div className="max-w-lg rounded-lg bg-white p-6 shadow-lg">
          <h1 className="mb-2 text-xl font-bold text-red-600">⚠️ Configuration Error</h1>
          <p className="mb-4 text-gray-700">
            The application cannot start due to missing or invalid environment variables.
          </p>
          <pre className="overflow-auto rounded bg-gray-100 p-4 text-sm text-gray-800">
            {error instanceof Error ? error.message : 'Unknown error'}
          </pre>
          <p className="mt-4 text-sm text-gray-600">
            See <code className="bg-gray-100 px-1">.env.example</code> and{' '}
            <code className="bg-gray-100 px-1">docs/ENVIRONMENT_VARIABLES.md</code> for setup
            instructions.
          </p>
        </div>
      </div>
    );
  }
}
