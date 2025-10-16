import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app//*.{js,ts,jsx,tsx,mdx}",
    "./pages//*.{js,ts,jsx,tsx,mdx}",
    "./components//*.{js,ts,jsx,tsx,mdx}",
  ],
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
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      fontSize: {
        xs: "0.9375rem", // 15px
        sm: "1.125rem", // 18px
        base: "1.25rem", // 20px
        lg: "1.5rem", // 24px
        xl: "1.75rem", // 28px
        "2xl": "2rem", // 32px
        "3xl": "2.25rem", // 36px
        "4xl": "2.5rem", // 40px
        "5xl": "2.75rem", // 44px
        "6xl": "3rem", // 48px
      },
    },
  },
  darkMode: "class",
  plugins: [],
};

export default config;