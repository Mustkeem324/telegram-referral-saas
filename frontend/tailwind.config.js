/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: 'rgb(var(--color-navy-950) / <alpha-value>)',
          900: 'rgb(var(--color-navy-900) / <alpha-value>)',
          850: 'rgb(var(--color-navy-850) / <alpha-value>)',
          800: 'rgb(var(--color-navy-800) / <alpha-value>)',
          750: 'rgb(var(--color-navy-750) / <alpha-value>)',
          700: 'rgb(var(--color-navy-700) / <alpha-value>)',
          650: 'rgb(var(--color-navy-650) / <alpha-value>)',
          600: 'rgb(var(--color-navy-600) / <alpha-value>)',
        },
        electric: {
          DEFAULT: '#18A8F8', // Electric blue primary accent
          hover: '#0C94E2',
          light: '#42B8F9',
          glow: 'rgba(24, 168, 248, 0.15)',
        },
        cyanAccent: {
          DEFAULT: '#22C5F5',
          glow: 'rgba(34, 197, 245, 0.15)',
        },
        successGreen: {
          DEFAULT: '#22D3A0',
          glow: 'rgba(34, 211, 160, 0.15)',
        },
        warningOrange: {
          DEFAULT: '#F59E0B',
          glow: 'rgba(245, 158, 11, 0.15)',
        },
        dangerRed: {
          DEFAULT: '#EF4444',
          glow: 'rgba(239, 68, 68, 0.15)',
        },
        telegram: {
          blue: "#2AABEE",
          dark: "#229ED9",
          hover: "#1D90C9"
        }
      },
      borderRadius: {
        'xl': '14px',
        '2xl': '16px',
        '3xl': '20px',
      },
      boxShadow: {
        'card': 'var(--color-card-shadow, 0 4px 20px -2px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.05))',
        'card-hover': '0 10px 30px -4px rgba(24, 168, 248, 0.15), 0 0 0 1px rgba(24, 168, 248, 0.3)',
        'glow-blue': '0 0 35px -5px rgba(24, 168, 248, 0.25)',
        'glow-cyan': '0 0 35px -5px rgba(34, 197, 245, 0.25)',
        'glow-green': '0 0 35px -5px rgba(34, 211, 160, 0.25)',
      }
    },
  },
  plugins: [],
};