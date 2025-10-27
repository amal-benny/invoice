import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx,js,jsx}", "./components/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#802949",
          50: "#F7EAF0",
          100: "#EFD6E3",
          200: "#E2ABC6",
          300: "#D87FA8",
          400: "#CE537C",
          500: "#C72A60",
          600: "#A4214F",
          700: "#802949",
        },
        background: "var(--bg)",
        text: "var(--text)",
        card: "var(--card)",
        muted: "var(--muted)",
      },
      fontFamily: {
        sans: ["Segoe UI", "sans-serif"],
      },
      fontSize: {
        xs: "0.75rem", // 12px
        sm: "0.875rem", // 14px
        base: "1rem", // 16px
        lg: "1.125rem", // 18px
        xl: "1.25rem", // 20px
        "2xl": "1.5rem", // 24px
        "3xl": "1.875rem", // 30px
        "4xl": "2.25rem", // 36px
        "5xl": "3rem", // 48px
        "6xl": "3.75rem", // 60px
      },
    },
  },
  darkMode: "class",
  plugins: [],
};

export default config;
