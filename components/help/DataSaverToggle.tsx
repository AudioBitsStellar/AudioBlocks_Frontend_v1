'use client';
import { useDataSaver } from '@/hooks/useDataSaver';
export default function DataSaverToggle() {
  const enabled = useDataSaver();
  return (
    <label className="flex items-center justify-between gap-4 rounded-lg border border-border-dark p-4">
      <span>
        <span className="block font-medium">Data saver</span>
        <span className="text-sm text-on-muted">
          Skip speculative loading of the next track. Browser data saver is always respected.
        </span>
      </span>
      <input
        aria-label="Data saver"
        checked={enabled}
        className="h-5 w-5 shrink-0"
        type="checkbox"
        onChange={(event) => {
          try {
            localStorage.setItem('audioblocks_data_saver', String(event.target.checked));
          } catch {
            /* storage may be unavailable */
          }
          window.dispatchEvent(new Event('audioblocks:data-saver'));
        }}
      />
    </label>
  );
}
