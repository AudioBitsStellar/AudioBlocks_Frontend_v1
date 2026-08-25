export const ThemeScript = () => (
  <script
    dangerouslySetInnerHTML={{
      __html: `
        (function() {
          try {
            var theme = localStorage.getItem('theme-preference');
            var root = document.documentElement;
            if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
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
