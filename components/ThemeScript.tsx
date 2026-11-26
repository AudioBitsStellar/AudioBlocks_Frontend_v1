import { THEME_STORAGE_KEY } from '@/context/ThemeProvider';

export const ThemeScript = () => (
  <script
    dangerouslySetInnerHTML={{
      __html: `
        (function() {
          try {
            var theme = localStorage.getItem('${THEME_STORAGE_KEY}');
            var root = document.documentElement;
            if (theme === 'dark' || ((!theme || theme === 'system') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
              root.classList.add('dark');
            } else {
              root.classList.add('light');
            }
          } catch (e) {}
        })();
      `,
    }}
  />
);
