'use client';
import { useEffect, useState } from 'react';
type Connection = EventTarget & { saveData?: boolean };
export function useDataSaver(): boolean {
  const [enabled, setEnabled] = useState(true); // No speculative work before browser preferences are read.
  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: Connection }).connection;
    const update = () => {
      let preference = false;
      try {
        preference = localStorage.getItem('audioblocks_data_saver') === 'true';
      } catch {
        /* storage is optional */
      }
      setEnabled(!!connection?.saveData || preference);
    };
    update();
    connection?.addEventListener('change', update);
    window.addEventListener('storage', update);
    window.addEventListener('audioblocks:data-saver', update);
    return () => {
      connection?.removeEventListener('change', update);
      window.removeEventListener('storage', update);
      window.removeEventListener('audioblocks:data-saver', update);
    };
  }, []);
  return enabled;
}
