import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          green: "#1B7A3D",
          "green-dark": "#145C2E",
          "green-light": "#E8F5E9",
          gold: "#D4A843",
          "gold-light": "#FFF8E1",
          orange: "#F97316",
          "orange-dark": "#EA580C",
          "orange-light": "#FFF7ED",
        },
        dark: "#1A1A2E",
        "gray-text": "#6B7280",
        "gray-light": "#F3F4F6",
        error: "#DC2626",
        warning: "#F59E0B",
      },
      fontFamily: {
        cairo: ["var(--font-cairo)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
