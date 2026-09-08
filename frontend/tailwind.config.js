/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#F5F6FB",
        surface: "#FFFFFF",
        ink: {
          DEFAULT: "#12142B",
          soft: "#4A4E6E",
          faint: "#8A8DAE",
        },
        primary: {
          50: "#EEF0FB",
          100: "#DCE0F7",
          300: "#8993D6",
          500: "#3B45A8",
          600: "#2B3480",
          700: "#1D2A6B",
          900: "#141B47",
        },
        signal: {
          teal: "#0EA5A4",
          tealSoft: "#CFF3F1",
          amber: "#F59E0B",
          amberSoft: "#FDF0D5",
          rose: "#E11D48",
          roseSoft: "#FCE1E7",
          violet: "#7C5CFC",
        },
        line: "#E6E8F2",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(18,20,43,0.04), 0 8px 24px -12px rgba(29,42,107,0.12)",
        pop: "0 12px 40px -8px rgba(29,42,107,0.25)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: 0, transform: "translateY(8px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        ringGrow: {
          "0%": { strokeDashoffset: "var(--ring-full)" },
          "100%": { strokeDashoffset: "var(--ring-offset)" },
        },
      },
      animation: {
        fadeUp: "fadeUp 0.5s ease both",
        ringGrow: "ringGrow 1.1s cubic-bezier(0.22, 1, 0.36, 1) both",
      },
    },
  },
  plugins: [],
};
