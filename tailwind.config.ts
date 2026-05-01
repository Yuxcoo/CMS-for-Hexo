import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#172026',
        paper: '#f7f8f5',
        line: '#dbe1dc',
        moss: '#4e6f58',
        coral: '#c75f4f',
        sky: '#5e8298'
      },
      boxShadow: {
        panel: '0 8px 24px rgba(23, 32, 38, 0.08)'
      }
    }
  },
  plugins: []
};

export default config;
