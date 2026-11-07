import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        editor: {
          bg: "#0b0d11",
          card: "#12151c",
          panel: "#161922",
          border: "#232836",
          hover: "#1f2430",
          active: "#293142",
          text: "#f1f5f9",
          muted: "#94a3b8",
        },
        track: {
          video: "#3b82f6",
          text: "#f59e0b",
          audio: "#10b981",
          effects: "#8b5cf6",
        },
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
