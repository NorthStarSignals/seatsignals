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
        background: "var(--background)",
        foreground: "var(--foreground)",
        navy: {
          900: "#0F1729",
          800: "#1A2332",
          700: "#243044",
          600: "#2E3D56",
        },
        accent: {
          blue: "#3B82F6",
          amber: "#F59E0B",
        },
      },
    },
  },
  plugins: [],
};
export default config;
