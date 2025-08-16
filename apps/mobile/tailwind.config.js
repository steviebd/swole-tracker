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
          "500": "#fafafa",
          "600": "#e6e6e6",
          "700": "#d9d9d9",
          "800": "#075985",
          "900": "#0c4a6e",
          "950": "#082f49"
        },
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
        "chart-1": "#3b82f6",
        "chart-2": "#22c55e",
        "chart-3": "#eab308",
        "chart-4": "oklch(0.627 0.265 303.9)",
        "chart-5": "oklch(0.645 0.246 16.439)"
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
        "token-bold": 700
      }
    }
  },
  "plugins": []
};
