/** @type {import('tailwindcss').Config} */
module.exports = {
  "content": [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./lib/**/*.{js,jsx,ts,tsx}"
  ],
  "presets": [
    "nativewind/preset"
  ],
  "theme": {
    "extend": {
      "colors": {
        "primary": {
          "50": "#f0f9ff",
          "100": "#e0f2fe",
          "200": "#bae6fd",
          "300": "#7dd3fc",
          "400": "#38bdf8",
          "500": "oklch(0.72 0.186 45)",
          "600": "oklch(0.66 0.175 45)",
          "700": "oklch(0.58 0.16 45)",
          "800": "#075985",
          "900": "#0c4a6e",
          "950": "#082f49"
        },
        "secondary": "#f59e0b",
        "accent": "oklch(0.74 0.185 55)",
        "background": "#252525",
        "foreground": "#ffffff",
        "card": "#343434",
        "surface": "#343434",
        "text-primary": "#ffffff",
        "text-secondary": "#b5b5b5",
        "text-muted": "#a6a6a6",
        "border-default": "#454545",
        "success": "#22c55e",
        "warning": "#eab308",
        "danger": "#ef4444",
        "info": "#3b82f6",
        "chart-1": "#f97316",
        "chart-2": "#ef4444",
        "chart-3": "#d97706",
        "chart-4": "#f59e0b",
        "chart-5": "#4b5563"
      },
      "fontFamily": {
        "sans": [
          "System"
        ],
        "mono": [
          "Courier New"
        ]
      },
      "spacing": {
        "component-xs": "0.5rem",
        "component-sm": "0.75rem",
        "component-md": "1rem",
        "component-lg": "1.5rem",
        "component-xl": "2rem",
        "gap-xs": "0.25rem",
        "gap-sm": "0.5rem",
        "gap-md": "0.75rem",
        "gap-lg": "1rem",
        "gap-xl": "1.5rem"
      },
      "borderRadius": {
        "token-sm": "0.25rem",
        "token-md": "0.375rem",
        "token-lg": "0.5rem",
        "token-card": "0.75rem"
      },
      "fontSize": {
        "token-xs": "0.75rem",
        "token-sm": "0.875rem",
        "token-base": "1rem",
        "token-lg": "1.125rem",
        "token-xl": "1.25rem",
        "token-2xl": "1.5rem",
        "token-3xl": "1.875rem"
      },
      "fontWeight": {
        "token-normal": 400,
        "token-medium": 500,
        "token-semibold": 600,
        "token-bold": 700,
        "token-black": 900
      }
    }
  },
  "plugins": []
};
