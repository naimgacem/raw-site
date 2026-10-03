import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // pulled from the RAW logo + the first site's inked palette
        abyss: "#070608",
        ink: "#121016",
        ink2: "#1b1722",
        ink3: "#2a2433",
        bone: "#EDE8E0",
        mute: "#A8A2B0",
        violet: "#971FF4", // electric logo purple
        royal: "#761AC6",
        deep: "#3B0A6B",
        lilac: "#CDB8F7", // plays the role of Sunviya's lavender
        lilac2: "#E4D9FB",
        gold: "#E0B45A",
      },
      fontFamily: {
        display: ["var(--font-display)", "Impact", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        ar: ["var(--font-ar)", "var(--font-sans)", "system-ui", "sans-serif"],
      },
      transitionTimingFunction: { out: "cubic-bezier(0.22, 1, 0.36, 1)" },
      keyframes: {
        marquee: { from: { transform: "translateX(0)" }, to: { transform: "translateX(-50%)" } },
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-6px)" } },
      },
      animation: {
        marquee: "marquee 28s linear infinite",
        float: "float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
