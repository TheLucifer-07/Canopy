/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        canopy: {
          bg: '#080909',
          surface: '#101211',
          elevated: '#171A18',
          border: '#29302B',
          text: '#F5F5F0',
          secondary: '#A7AAA5',
          muted: '#70766F',
          green: '#43D391',
          ai: '#A78BFA',
          human: '#54B9E8'
        },
        bg: '#0B0D10',
        surface: '#11151A',
        elevated: '#171B21',
        canvas: '#07090C',
        border: '#272D35',
        text: '#F5F7FA',
        secondary: '#9AA4B2',
        muted: '#667085',
        primary: '#43D391',
        ai: '#7C3AED',
        human: '#38BDF8',
        success: '#22C55E',
        warning: '#F59E0B',
        error: '#EF4444'
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace']
      }
      ,
      borderRadius: { canopy: '6px' },
      boxShadow: { canopy: '0 18px 60px rgba(0, 0, 0, 0.22)' }
    },
  },
  plugins: [],
};
