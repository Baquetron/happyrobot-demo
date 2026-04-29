import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0A0A0A",
          muted: "#525252",
          subtle: "#737373",
        },
        accent: {
          DEFAULT: "#2563EB",
          hover: "#1D4ED8",
          soft: "#EFF4FF",
        },
        border: {
          DEFAULT: "#E5E7EB",
          strong: "#D4D4D8",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          subtle: "#FAFAFA",
        },
        positive: "#16A34A",
        negative: "#DC2626",
        warning: "#D97706",
      },
      borderRadius: {
        card: "12px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)",
        cardHover: "0 4px 12px rgba(0,0,0,0.06)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
