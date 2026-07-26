/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Deep canvas scale
        ink: {
          950: '#05070e',
          900: '#090c16',
          850: '#0c101d',
          800: '#101527',
          700: '#161c33',
        },
        // Electric indigo — the brand primary
        primary: {
          50: '#eef1ff',
          100: '#e0e5ff',
          200: '#c6cfff',
          300: '#a4b1ff',
          400: '#8290ff',
          500: '#6478ff',
          600: '#4d5eff',
          700: '#3d49e0',
          800: '#323bb0',
          900: '#2b338c',
        },
        accent: {
          violet: '#a855f7',
          cyan: '#22d3ee',
          emerald: '#34d399',
          amber: '#fbbf24',
          rose: '#fb7185',
        },
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        // Legacy aliases still referenced in a few places
        brand: {
          blue: '#4d5eff',
          'dark-blue': '#3d49e0',
        },
      },
      boxShadow: {
        subtle: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
        card: '0 8px 30px -12px rgba(0, 0, 0, 0.55)',
        'glow-primary': '0 8px 32px -8px rgba(100, 120, 255, 0.45)',
        'glow-violet': '0 8px 32px -8px rgba(168, 85, 247, 0.4)',
      },
      maxWidth: {
        '8xl': '90rem',
      },
    },
  },
  plugins: [],
}
