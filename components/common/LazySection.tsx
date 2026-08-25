'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

interface LazySectionProps {
  children: ReactNode;
  /** Reserved height (px) while unmounted, to prevent layout shift on mount. */
  minHeight: number;
  className?: string;
}

/**
 * Defers mounting `children` (expected to be a next/dynamic-wrapped, client-only
 * component) until this section scrolls within 200px of the viewport. Combined
 * with next/dynamic's own code-splitting, the section's JS chunk isn't even
 * requested until then (issue #154).
 *
 * Reserves `minHeight` before mount so the section popping in doesn't shift
 * layout below it.
 */
export default function LazySection({ children, minHeight, className }: LazySectionProps) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <div ref={ref} className={className} style={visible ? undefined : { minHeight }}>
      {visible ? children : null}
    </div>
  );
}
