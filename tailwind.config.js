/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#10B981", // Emerald Green
        secondary: "#F59E0B", // Royal Gold
        accent: "#38BDF8", // Blue
        background: "#0F172A", // Deep Navy
        surface: "#1E293B", // Darker Slate
        "surface-bright": "#334155",
      },
    },
  },
  plugins: [],
}
