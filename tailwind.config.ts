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
        // Soft luxury brand colors
        ms: {
          taupe: "#D8D3CC",
          beige: "#F5F2EE",
          charcoal: "#333333",
          gold: "#C5B358",
          warmGray: "#8E8D8A"
        }
      },
    },
  },
  plugins: [],
};
export default config;
