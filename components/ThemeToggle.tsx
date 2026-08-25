'use client';
import { useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/context/ThemeProvider';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-8 h-8 rounded-full bg-gray-800 animate-pulse" />;
  }

  const cycleTheme = () => {
    if (theme === 'system') setTheme('light');
    else if (theme === 'light') setTheme('dark');
    else setTheme('system');
  };

  return (
    <button
      aria-label="Toggle theme"
      className="p-2 rounded-full hover:bg-gray-800 transition-colors"
      type="button"
      onClick={cycleTheme}
    >
      {theme === 'system' && <Monitor className="w-4 h-4 text-white" />}
      {theme === 'light' && <Sun className="w-4 h-4 text-white" />}
      {theme === 'dark' && <Moon className="w-4 h-4 text-white" />}
    </button>
  );
}
