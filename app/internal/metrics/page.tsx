import Link from 'next/link';

export default function InternalMetricsIndexPage() {
  return (
    <ul className="flex flex-col gap-2 text-sm">
      <li>
        <Link className="text-brand hover:underline" href="/internal/metrics/playback">
          Playback quality metrics →
        </Link>
      </li>
      <li>
        <Link className="text-brand hover:underline" href="/internal/metrics/web-vitals">
          Web Vitals per route →
        </Link>
      </li>
    </ul>
  );
}
