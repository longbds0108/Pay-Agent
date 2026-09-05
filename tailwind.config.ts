import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0B0E12",
          panel: "#161A20",
          line: "#262C34",
        },
        paper: "#EDE7D9",
        confirmed: "#4C8B67",
        pending: "#C08A3E",
        denied: "#A2493B",
      },
    },
  },
  plugins: [],
};

export default config;
