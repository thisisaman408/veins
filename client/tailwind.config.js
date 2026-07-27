/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        jet: "#09090B",
        obsidian: "#121218",
        violet: "#6D28D9",
        cyan: "#06B6D4",
        emerald: "#10B981",
        danger: "#F43F5E"
      },
      boxShadow: {
        glow: "0 0 36px rgba(6, 182, 212, 0.18)",
        violet: "0 0 42px rgba(109, 40, 217, 0.28)"
      },
      fontFamily: {
        display: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};
