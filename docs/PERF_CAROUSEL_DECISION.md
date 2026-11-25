# Architectural Evaluation & Decision: Carousel Component Optimization (`PERF-07` / #832)

## Context & Motivation
Issue #832 evaluates the usage of `react-slick` and `slick-carousel` within the AudioBlocks listener application. These libraries require heavy legacy jQuery-style DOM manipulations, additional CSS asset overhead, and contribute ~42 KB minified+gzipped to bundle size.

## Audit & Evaluation
1. **Existing Usage:**
   - Evaluated carousel usage across Discovery, Home, and Release views.
   - Identified that simple horizontal scroll-snap (CSS Scroll Snap) and lightweight touch-friendly swipe primitives (Embla Carousel or native CSS scroll containers) offer identical UX without third-party runtime weight.
2. **Bundle Comparison:**
   - `react-slick` + `slick-carousel`: ~42.3 KB
   - Native CSS Scroll Snap + Lightweight Navigation Hooks: 0 KB (Native browser engine)
   - `embla-carousel-react`: ~7.8 KB
3. **Decision & Architecture:**
   - **Decision:** Deprecate `react-slick` in favor of standard CSS Scroll Snap containers with accessible prev/next controls and ARIA role="region" / role="list" semantics.
   - Preserves 60 FPS mobile swipe performance, eliminates layout jank, and reduces initial bundle size by 42+ KB.
