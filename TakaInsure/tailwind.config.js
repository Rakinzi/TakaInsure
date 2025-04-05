/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#1D1616",
        secondary: "#8E1616",
        tertiary: "#D84040",
        light: "#EEEEEE",
      },
    },
  },
  plugins: [],
};