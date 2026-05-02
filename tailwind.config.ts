import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1d1d1f',
        paper: '#f5f5f7',
        canvas: '#ffffff',
        pearl: '#fafafc',
        line: '#e0e0e0',
        soft: '#f0f0f0',
        blue: '#0066cc',
        blueFocus: '#0071e3',
        blueDark: '#2997ff',
        tile: '#272729',
        tile2: '#2a2a2c',
        tile3: '#252527',
        muted: '#7a7a7a',
        darkMuted: '#cccccc',
        success: '#0a7f3f',
        danger: '#b42318'
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
