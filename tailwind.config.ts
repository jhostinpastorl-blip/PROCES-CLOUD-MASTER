import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        background: "var(--pc-bg)",
        foreground: "var(--pc-fg)",
        card: "var(--pc-card-bg)",
        border: "var(--pc-border)",
        primary: "var(--pc-blue)",
        "primary-foreground": "#ffffff",
        muted: "var(--pc-fg-muted)",
        success: "#16865c",
        destructive: "#b4233a",
        warning: "#a16b0a",
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
      },
    },
  },
  plugins: [],
} satisfies Config;
