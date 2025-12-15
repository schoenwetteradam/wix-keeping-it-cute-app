/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'soft-lavender': '#A58CB4',
        'blush-pink': '#E9C2D4',
        'gold': '#E3C56E',
        'cream': '#FFF9E8',
        'deep-plum': '#704F6A',
        'pastel-lilac': '#D6C6EB',
        'charcoal': '#3D344A',
        'soft-white': '#FAFAFA',
      },
    },
  },
  plugins: [],
}

