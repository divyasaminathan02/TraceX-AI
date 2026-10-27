/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#070B14',
          900: '#0D1527',
          850: '#111D35',
          800: '#182744',
          700: '#223861',
        },
        slate: {
          850: '#161F30',
          900: '#0F172A',
        },
        brand: {
          cyan: '#06B6D4',
          teal: '#14B8A6',
          emerald: '#10B981',
          blue: '#3B82F6',
          indigo: '#6366F1',
        },
        risk: {
          low: '#10B981',      // Emerald
          medium: '#F59E0B',   // Amber
          high: '#F97316',     // Orange
          critical: '#EF4444', // Red
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 20px -3px rgba(6, 182, 212, 0.25)',
        'glow-red': '0 0 20px -3px rgba(239, 68, 68, 0.25)',
        'subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px -1px rgba(0, 0, 0, 0.2)',
      }
    },
  },
  plugins: [],
}
