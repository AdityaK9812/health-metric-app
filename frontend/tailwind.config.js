/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--primary)',
        'primary-dark': 'var(--primary-dark)',
        secondary: 'var(--secondary)',
        accent: 'var(--accent)',
        background: 'var(--background)',
        text: 'var(--text)',
      },
    },
  },
  plugins: [],
  safelist: [
    'bg-white',
    'bg-opacity-70',
    'backdrop-blur-lg',
    'rounded-xl',
    'shadow-lg',
    'border-gray-200'
  ]
} 