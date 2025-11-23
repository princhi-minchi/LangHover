/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",           // <--- This checks files in the root (like App.tsx)
    "./components/**/*.{js,ts,jsx,tsx}", // <--- This checks your components folder
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}