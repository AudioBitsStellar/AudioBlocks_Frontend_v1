/**
 * Application Constants
 * Centralized configuration for hardcoded values used throughout the application
 */

// ===== API & NETWORK =====
export const API_CONFIG = {
  DEFAULT_TIMEOUT: 15000, // 15 seconds
  DEFAULT_RETRIES: 3,
  RETRY_DELAYS: {
    RATE_LIMIT_FALLBACK: 1000,
    BASE_BACKOFF: 1000,
  },
} as const;

// ===== CACHE DURATIONS (in milliseconds) =====
export const CACHE_DURATIONS = {
  /** 30 seconds - For frequently changing data like leaderboards */
  VERY_SHORT: 1000 * 30,
  /** 2 minutes - For real-time activity feeds */
  SHORT: 1000 * 60 * 2,
  /** 5 minutes - Standard cache for most queries */
  MEDIUM: 1000 * 60 * 5,
  /** 10 minutes - For less frequently changing data like profiles */
  LONG: 1000 * 60 * 10,
} as const;

// ===== QUERY RETRY CONFIG =====
export const RETRY_CONFIG = {
  DEFAULT: 1,
  IMPORTANT: 2,
} as const;

// ===== UI Z-INDEX SCALE =====
/**
 * Z-index scale to maintain consistent layering
 * Lower numbers = lower in stack, higher numbers = higher in stack
 */
export const Z_INDEX = {
  NEGATIVE: -10,
  BASE: 10,
  DROPDOWN: 20,
  STICKY: 30,
  SIDEBAR: 40,
  OVERLAY: 50,
  MODAL: 50,
  TOAST: 60,
  TOOLTIP: 60,
  LOADER: 9999,
} as const;

// ===== UI BREAKPOINTS =====
/**
 * Standard breakpoints matching Tailwind's defaults
 * Use these for JavaScript media queries
 */
export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  '2XL': 1536,
} as const;

// ===== VALIDATION LIMITS =====
export const VALIDATION = {
  BIO_MAX_LENGTH: 500,
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 30,
  PASSWORD_MIN_LENGTH: 8,
  SEARCH_MIN_CHARS: 3,
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
} as const;

// ===== AUTH & COOKIES =====
export const AUTH = {
  COOKIE_NAME: 'audioblocks_jwt',
  REFRESH_COOKIE_NAME: 'audioblocks_refresh_token',
  // #277 — separate HttpOnly cookie used only by middleware.ts for
  // route-gating; set/cleared server-side via app/api/session/route.ts.
  // See that file's header comment for why this can't just be a flag on
  // COOKIE_NAME above.
  SESSION_COOKIE_NAME: 'audioblocks_session',
  TOKEN_HEADER: 'Authorization',
  TOKEN_PREFIX: 'Bearer',
  COOKIE_OPTIONS: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
  },
} as const;

// ===== ERROR MESSAGES =====
export const ERROR_MESSAGES = {
  NETWORK: 'Network Error',
  UNAUTHORIZED: 'Unauthorized',
  NOT_FOUND: 'Not Found',
  TIMEOUT: 'Timeout',
  GENERIC: 'Something went wrong. Please try again.',
} as const;

// ===== HTTP STATUS CODES =====
export const HTTP_STATUS = {
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  RATE_LIMIT: 429,
  SERVER_ERROR: 500,
} as const;

// ===== API ENDPOINTS =====
export const API_ENDPOINTS = {
  // Community
  COMMUNITY_LEADERBOARD: '/api/community/leaderboard',
  COMMUNITY_VOTE: '/api/community/vote',
  COMMUNITY_MY_VOTES: '/api/community/votes/me',

  // Profile
  USER_PROFILE: '/api/user/profile',

  // Explore
  MERCH: '/api/merch',
  EVENTS: '/api/events',
} as const;

// ===== QUERY KEYS =====
export const QUERY_KEYS = {
  EXPLORE_MERCH: ['explore-merch'],
  EXPLORE_EVENTS: ['explore-events'],
  COMMUNITY_LEADERBOARD: ['community-leaderboard'],
  COMMUNITY_MY_VOTES: ['community-my-votes'],
} as const;

// ===== ANIMATION DURATIONS =====
export const ANIMATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
} as const;

// ===== BLUR EFFECTS =====
export const BLUR = {
  SM: '[100px]',
  MD: '[150px]',
  LG: '[200px]',
} as const;
