# Asset Optimization Guide

## Overview
This document outlines the asset optimization strategy for the AudioBlocks Frontend, addressing issues with oversized static assets in the `public/` directory.

## Current Issues

### Large Files (>500 KB)
- `public/smart.svg` - 16 MB (contains embedded base64 raster images)
- `public/collective.svg` - 1.2 MB (contains embedded raster images)
- `public/home/Container4.svg` - 1.2 MB (contains embedded raster images)
- `public/cat.png` - 1.1 MB (placeholder image, could be WebP)
- `public/zoom.png` - 908 KB (could be optimized)
- `public/home/frame*.jpg` - 340-544 KB each (could use next/image)
- `public/logo.png` - 388 KB (SVG preferred)

## Optimization Strategies

### 1. SVGs with Embedded Rasters
**Action**: Extract the raster and serve separately via `next/image`

SVGs like `smart.svg`, `collective.svg`, and container images contain embedded base64 images. These:
- Bypass SVG compression benefits
- Cannot be optimized by next/image
- Are slower to load on mobile networks

**Solution**:
1. Extract embedded images as separate PNG/WebP files
2. Replace SVG with proper vector artwork or use `next/image` for the raster
3. Use `next/image` with `sizes` prop for responsive loading

### 2. PNG/JPG Images
**Action**: Convert to WebP or AVIF and use next/image

**Process**:
```bash
# Convert PNG to WebP
cwebp -q 80 public/cat.png -o public/cat.webp

# Convert JPG to WebP
cwebp -q 80 public/home/frame1.jpg -o public/home/frame1.webp
```

**Implementation in code**:
```tsx
import Image from 'next/image';

<Image
  src="/cat.webp"
  alt="Placeholder"
  width={300}
  height={300}
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  priority={false}
/>
```

### 3. Logo Optimization
**Target**: Reduce from 388 KB to <50 KB

- Consider SVG format (typically 3-5 KB when properly vectorized)
- Ensure no embedded raster data
- Test at different sizes for clarity

### 4. Size Limit Enforcement
A CI check via `.size-limit.js` prevents regressions:
- Individual public files: 500 KB max
- Enforced on every build
- Allows forks to skip gracefully if size-limit fails

## Implementation Checklist

- [x] Add size limit check to .size-limit.js
- [ ] Identify SVGs with embedded rasters via inspection
- [ ] Extract and optimize embedded images
- [ ] Convert high-resolution placeholders (cat.png, zoom.png) to WebP
- [ ] Replace frame JPGs with next/image
- [ ] Optimize logo (SVG + vectorize)
- [ ] Update image imports to use next/image with proper sizes
- [ ] Test Lighthouse LCP improvement on affected pages
- [ ] Verify cross-origin audio CORS compatibility

## CORS Requirements for Audio

When optimizing assets served from different origins (e.g., S3), ensure CORS headers are set:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET
```

The `<audio>` element may require `crossOrigin="anonymous"` attribute.

## Performance Targets

- Before: public/ = 25 MB
- Target: public/ ≤ 10 MB
- LCP improvement: Target 15-20% faster initial load on mobile

## References
- [Next.js Image Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/images)
- [Web.dev Image Optimization](https://web.dev/image-optimization/)
- [size-limit Documentation](https://github.com/ai/size-limit)
