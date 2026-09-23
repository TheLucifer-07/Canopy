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
          text: '#FFFFFF',
          secondary: '#E6EDE8',
          muted: '#9EA8A2',
          green: '#43D391',
          ai: '#A78BFA',
          human: '#E6EDE8'
        },
        bg: '#080909',
        surface: '#101211',
        elevated: '#171A18',
        canvas: '#000000',
        border: '#29302B',
        text: '#FFFFFF',
        secondary: '#E6EDE8',
        muted: '#9EA8A2',
        primary: '#43D391',
        ai: '#A78BFA',
        human: '#E6EDE8',
        success: '#43D391',
        warning: '#F59E0B',
        error: '#F43F5E'
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
