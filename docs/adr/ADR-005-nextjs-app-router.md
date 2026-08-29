# ADR-005: Use Next.js 14 App Router

## Status

Accepted

## Context

The application needs server-side rendering for SEO, API routes, and a modern routing model. The Pages Router was the established option, but the App Router became stable and offers better data fetching patterns.

## Decision

Use Next.js 14 App Router.

## Consequences

### Positive

- Server Components by default reduce client-side JavaScript.
- Nested layouts simplify shared UI across route segments.
- Route handlers colocate API logic with related pages.
- Better integration with React Suspense and streaming.

### Negative

- Some third-party libraries require `"use client"` wrappers.
- Migration from Pages Router patterns requires team learning.
- App Router is newer; some edge-case documentation is still maturing.

## References

- `app/layout.tsx`
- `app/page.tsx`
- `app/api/`
