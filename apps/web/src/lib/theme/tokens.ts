export const TOKENS = {
  surfaces: {
    void: '#070B12',
    base: '#0B1220',
    raised: '#121C2E',
    overlay: '#1A2740',
    glass: 'rgba(11, 18, 32, 0.78)',
  },
  lines: {
    subtle: 'rgba(148, 184, 255, 0.08)',
    strong: 'rgba(148, 184, 255, 0.18)',
  },
  ink: {
    primary: '#E8F0FE',
    secondary: '#93A5C4',
    tertiary: '#5B6B8C',
  },
  brand: {
    heat: '#FF8A3D',
    flood: '#2DD4BF',
    gradient: 'linear-gradient(135deg, #FF8A3D 0%, #FFC53D 38%, #2DD4BF 100%)',
  },
  risk: {
    0: '#2DD4BF', // 0-20 low
    1: '#FBBF24', // 21-40 moderate
    2: '#FB923C', // 41-60 high
    3: '#F43F5E', // 61-80 severe
    4: '#E11D48', // 81-100 extreme
  },
  confidence: {
    good: '#34D399',
    moderate: '#FBBF24',
    limited: '#F87171',
  },
  motion: {
    dur1: '120ms',
    dur2: '240ms',
    dur3: '420ms',
    easeOut: 'cubic-bezier(0.22, 1, 0.36, 1)',
    easeSpring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
} as const;