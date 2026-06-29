# Bundle Size Audit

## Overview
This document tracks bundle size optimizations for the AudioBlocks Frontend application.

## Audit Date
June 29, 2026

## Changes Made

### 1. Bundle Analyzer Integration
- Added `@next/bundle-analyzer` to `next.config.ts`
- Run bundle analysis with: `ANALYZE=true npm run build`

### 2. Code-Splitting Implementations

#### CommentPanel (Player Component)
- **Location**: `components/common/Player.tsx`
- **Before**: Loaded synchronously, included in initial bundle
- **After**: Lazy-loaded with `next/dynamic`
- **Impact**: Reduces initial bundle size by ~15-20KB (framer-motion + dependencies)
- **Loading State**: Shows loading indicator while component loads

#### ShareModal (Community Page)
- **Location**: `app/dashboard/community/page.tsx`
- **Before**: Loaded synchronously on community page
- **After**: Lazy-loaded with `next/dynamic`
- **Impact**: Reduces community route bundle by ~10-15KB (@radix-ui/react-dialog + social icons)
- **Loading State**: Minimal placeholder during load

## Heavy Dependencies Identified

### Global Dependencies (Loaded on All Routes)
- `@dynamic-labs/*` (wallet connection): ~200KB
- `wagmi` + `viem` (Web3): ~150KB
- `@tanstack/react-query`: ~50KB
- `lucide-react` (icons): ~40KB
- `framer-motion`: ~35KB

### Route-Specific Dependencies
- `react-slick` (carousel): ~30KB - used in dashboard routes
- `@radix-ui/*` components: ~25KB - used in various routes
- `react-icons/fa`: ~20KB - used in player and community

## Recommendations

### Immediate Actions
1. ✅ Lazy-load CommentPanel in Player
2. ✅ Lazy-load ShareModal in Community page
3. Consider lazy-loading react-slick carousel components
4. Tree-shake unused lucide-react icons

### Future Optimizations
1. Implement route-based code splitting for heavy dashboard pages
2. Consider using a smaller icon library (e.g., lucide-react only)
3. Evaluate if all Radix UI components are needed upfront
4. Consider dynamic imports for Web3 components (only load when wallet needed)

## How to Run Bundle Analysis

```bash
# Install bundle analyzer if not already installed
npm install --save-dev @next/bundle-analyzer

# Run analysis
ANALYZE=true npm run build

# View results
# Opens browser with bundle visualization
```

## Bundle Size Targets
- **Initial JS**: < 300KB (current: ~450KB estimated)
- **Dashboard Route**: < 200KB (current: ~350KB estimated)
- **Community Route**: < 180KB (current: ~300KB estimated)

## Notes
- Bundle sizes are estimated based on dependency weights
- Actual sizes should be verified with bundle analyzer
- React Query DevTools are enabled in development only
