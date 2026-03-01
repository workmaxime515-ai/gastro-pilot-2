import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Light mode base
        background: "#FAF7F2",
        card: "#FFFFFF",
        // Text
        "text-primary": "#1F1A17",
        "text-secondary": "#7A6E63",
        // Primary accent
        accent: {
          DEFAULT: "#C8956C",
          light: "#D6A97E",
          dark: "#A8804E",
        },
        // Suggestion type colors
        profit: "#2D6A4F",
        waste: "#E07A5F",
        stress: "#457B9D",
        emergency: "#E63946",
        marketing: "#9C6644",
        // Dark mode
        "dark-bg": "#1A1A2E",
        "dark-card": "#16213E",
        "dark-text": "#F2E7D8",
        "dark-text-secondary": "#A89784",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        heading: ["'Plus Jakarta Sans'", "Inter", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      borderRadius: {
        card: "12px",
      },
      maxWidth: {
        content: "720px",
      },
      animation: {
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fill-bar": "fillBar 800ms ease-out forwards",
        "fade-in-up": "fadeInUp 300ms ease-out forwards",
        "slide-in-bottom": "slideInBottom 300ms ease-out forwards",
        "check-pop": "checkPop 400ms ease-out forwards",
      },
      keyframes: {
        fillBar: {
          "0%": { width: "0%" },
          "100%": { width: "var(--fill-width)" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInBottom: {
          "0%": { opacity: "0", transform: "translateY(100%)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        checkPop: {
          "0%": { transform: "scale(0)" },
          "50%": { transform: "scale(1.2)" },
          "100%": { transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
