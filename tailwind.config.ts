import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class', // Force dark mode using class strategy
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'yellow': {
          500: '#F2B91D', // Base Yellow Color for Headings, Buttons & Links
        },
        'gray': {
          333: '#333333', // Dark Gray for Nav Bar & Footer Background
        },
        'body-text': '#4D4D4D', // Body Text Color
      },
      fontFamily: {
        sans: ['Arial', 'Helvetica', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
