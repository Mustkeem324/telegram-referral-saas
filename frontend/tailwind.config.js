/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#070B14',
          900: '#0B1120', // Main background
          850: '#0F172A',
          800: '#151F32', // Premium card background
          750: '#19253C', // Card hover / elevated
          700: '#1E293B', // Border
          650: '#22324B', // Border hover
          600: '#2A3B56', // Active border
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
        'card': '0 4px 20px -2px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        'card-hover': '0 10px 30px -4px rgba(24, 168, 248, 0.15), 0 0 0 1px rgba(24, 168, 248, 0.3)',
        'glow-blue': '0 0 35px -5px rgba(24, 168, 248, 0.25)',
        'glow-cyan': '0 0 35px -5px rgba(34, 197, 245, 0.25)',
        'glow-green': '0 0 35px -5px rgba(34, 211, 160, 0.25)',
      }
    },
  },
  plugins: [],
};
