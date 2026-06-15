/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'gtl-navy': '#1e3a5f',
        'gtl-navy-dark': '#162c4a',
        'gtl-navy-light': '#2a4f7c',
        'gtl-orange': '#f97316',
      },
    },
  },
  plugins: [],
}
