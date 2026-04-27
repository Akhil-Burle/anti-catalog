/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // Scan every file in src
  ],
  theme: {
    extend: {
      // We must define 3xl because standard Tailwind only goes up to 2xl
      backdropBlur: {
        "3xl": "64px",
      },
    },
  },
  plugins: [],
};
