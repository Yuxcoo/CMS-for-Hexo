import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        paper: 'rgb(var(--color-paper) / <alpha-value>)',
        canvas: 'rgb(var(--color-canvas) / <alpha-value>)',
        pearl: 'rgb(var(--color-pearl) / <alpha-value>)',
        line: 'rgb(var(--color-line) / <alpha-value>)',
        soft: 'rgb(var(--color-soft) / <alpha-value>)',
        blue: 'rgb(var(--color-blue) / <alpha-value>)',
        blueFocus: 'rgb(var(--color-blue-focus) / <alpha-value>)',
        blueDark: 'rgb(var(--color-blue-dark) / <alpha-value>)',
        tile: 'rgb(var(--color-tile) / <alpha-value>)',
        tile2: 'rgb(var(--color-tile-2) / <alpha-value>)',
        tile3: 'rgb(var(--color-tile-3) / <alpha-value>)',
        muted: 'rgb(var(--color-muted) / <alpha-value>)',
        darkMuted: 'rgb(var(--color-dark-muted) / <alpha-value>)',
        success: 'rgb(var(--color-success) / <alpha-value>)',
        danger: 'rgb(var(--color-danger) / <alpha-value>)'
      },
      boxShadow: {
        panel: 'none',
        product: 'rgba(0, 0, 0, 0.22) 3px 5px 30px 0'
      },
      fontFamily: {
        display: ['SF Pro Display', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        text: ['SF Pro Text', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif']
      }
    }
  },
  plugins: []
};

export default config;
