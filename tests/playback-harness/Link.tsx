import type { ComponentProps } from 'react';
/** Standalone component harness: route links use ordinary browser navigation. */
export default function Link(props: ComponentProps<'a'>) {
  return <a {...props} />;
}
