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
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        // Deep slate blue / navy — nav, buttons, icons, strong text
        navy: {
          950: '#0f2040',
          900: '#1E3A5F',
          800: '#244876',
          700: '#2c5a8f',
          600: '#3a6fa5',
          100: '#e8f0f8',
          50:  '#f0f5fb',
        },
        // Soft cream / off-white — primary page background
        cream: {
          DEFAULT: '#FAF8F3',
          50:  '#FDFCF8',
          100: '#FAF8F3',
          200: '#F3EFE4',
          300: '#EBE4D3',
        },
        // Pale yellow — hero highlights, accents
        yellow: {
          hero: '#FEFCE8',
          accent: '#FEF9C3',
          border: '#FDE68A',
        },
        // Peach / light orange — category section backgrounds
        peach: {
          DEFAULT: '#FDF0E8',
          50:  '#FFF7F2',
          100: '#FDF0E8',
          200: '#FADDCA',
          border: '#F4C3A0',
        },
        // Soft mint green — featured sections
        mint: {
          DEFAULT: '#ECFDF5',
          50:  '#F0FDF9',
          100: '#ECFDF5',
          200: '#D1FAE5',
          border: '#6EE7B7',
        },
        // Muted beige / gold — borders, secondary accents
        beige: {
          DEFAULT: '#D4C5A0',
          50:  '#FAF6EE',
          100: '#F0E8D4',
          200: '#D4C5A0',
          300: '#B8A87A',
        },
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 1.5s linear infinite',
      },
    },
  },
  plugins: [],
}
