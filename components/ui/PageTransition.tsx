'use client';

import { useState, useEffect, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion, type Transition } from 'framer-motion';

const variants = {
  enter: { opacity: 1 },
  exit: { opacity: 0 },
};

const transition: Transition = { duration: 0.2, ease: 'easeInOut' };

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  if (reducedMotion) {
    return <>{children}</>;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        animate="enter"
        exit="exit"
        initial="enter"
        transition={transition}
        variants={variants}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
