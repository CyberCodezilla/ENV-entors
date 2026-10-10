import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        risk: {
          low:      '#22c55e',
          moderate: '#f59e0b',
          high:     '#ef4444',
          blocked:  '#7f1d1d',
        },
        confidence: {
          good:     '#3b82f6',
          moderate: '#a3a3a3',
          limited:  '#f97316',
        },
      },
    },
  },
  plugins: [],
};

export default config;
