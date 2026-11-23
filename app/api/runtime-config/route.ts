/**
 * Runtime configuration endpoint (#815).
 *
 * Returns the current feature flags and other runtime settings that can be
 * changed without rebuilding. This allows ops to toggle features on/off server-side
 * for instant effect without redeploying.
 *
 * Currently reads from environment variables, but can be extended to read from
 * a config server, database, or feature flag service (LaunchDarkly, Unleash, etc).
 */

import { NextResponse } from 'next/server';

export async function GET() {
  const featureFlags = {
    merch: process.env.NEXT_PUBLIC_FEATURE_MERCH,
    events: process.env.NEXT_PUBLIC_FEATURE_EVENTS,
    communityVoting: process.env.NEXT_PUBLIC_FEATURE_COMMUNITY_VOTING,
    artistPerks: process.env.NEXT_PUBLIC_FEATURE_ARTIST_PERKS,
  };

  return NextResponse.json({
    featureFlags,
  });
}
