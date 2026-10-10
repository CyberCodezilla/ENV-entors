import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        void: '#070B12',
        base: '#0B1220',
        raised: '#121C2E',
        overlay: '#1A2740',
        line: {
          DEFAULT: 'rgba(148, 184, 255, 0.08)',
          strong: 'rgba(148, 184, 255, 0.18)',
        },
        ink: {
          DEFAULT: '#E8F0FE',
          2: '#93A5C4',
          3: '#5B6B8C',
        },
        heat: '#FF8A3D',
        flood: '#2DD4BF',
        risk: {
          0: '#2DD4BF',
          1: '#FBBF24',
          2: '#FB923C',
          3: '#F43F5E',
          4: '#E11D48',
          low: '#2DD4BF',
          moderate: '#FBBF24',
          high: '#FB923C',
          severe: '#F43F5E',
          extreme: '#E11D48',
          blocked: '#E11D48',
        },
        conf: {
          good: '#34D399',
          moderate: '#FBBF24',
          limited: '#F87171',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      borderRadius: {
        sm: '10px',
        md: '16px',
        lg: '24px',
        pill: '9999px',
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0, 0, 0, 0.45)',
        glow: '0 0 20px rgba(45, 212, 191, 0.25)',
        glowHeat: '0 0 20px rgba(255, 138, 61, 0.25)',
      },
      transitionTimingFunction: {
        'ease-out-custom': 'cubic-bezier(0.22, 1, 0.36, 1)',
        'ease-spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
};

export default config;