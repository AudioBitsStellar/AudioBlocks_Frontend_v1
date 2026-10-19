import { notFound } from 'next/navigation';
import { isFeatureEnabled } from '@/lib/featureFlags';
import CommunityTabs from './_components/CommunityTabs';

/**
 * Community voting and leaderboard (#637).
 *
 * The endpoints behind this page (`/api/community/*`) do not exist on the
 * backend yet, so the whole route is hidden behind
 * `NEXT_PUBLIC_FEATURE_COMMUNITY_VOTING` and resolves to the dashboard 404
 * page while the flag is off. Rendering happens in the client component, so no
 * community API request is issued when the route is unreachable.
 */
const CommunityPage = () => {
  if (!isFeatureEnabled('communityVoting')) {
    notFound();
  }

  return <CommunityTabs />;
};

export default CommunityPage;
