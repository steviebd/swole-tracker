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
  "darkMode": "class",
  "theme": {
    "extend": {
      "colors": {
        // Semantic colors based on OKLCH design tokens
        "foreground": "oklch(1 0 0)", // Pure white for dark theme
        "background": "oklch(0.145 0 0)", // True black for dark theme
        
        // Text colors
        "text": {
          "primary": "oklch(1 0 0)", // White text
          "secondary": "oklch(0.708 0 0)", // Secondary gray
          "muted": "oklch(0.65 0 0)" // Muted gray
        },
        
        // Background variants
        "bg": {
          "app": "oklch(0.145 0 0)", // Main app background
          "surface": "oklch(0.205 0 0)", // Surface for cards
          "card": "oklch(0.205 0 0)" // Card background
        },
        
        // Border colors
        "border": {
          "default": "oklch(0.269 0 0)", // Default border
          "muted": "oklch(0.269 0 0)" // Muted border
        },
        
        // Primary brand colors
        "primary": {
          "DEFAULT": "oklch(0.985 0 0)", // Primary brand
          "hover": "oklch(0.9 0 0)", // Primary hover
          "active": "oklch(0.85 0 0)", // Primary active
          "foreground": "oklch(0.145 0 0)" // Text on primary
        },
        
        // Secondary colors
        "secondary": {
          "DEFAULT": "oklch(0.269 0 0)", // Secondary
          "hover": "oklch(0.32 0 0)", // Secondary hover
          "foreground": "oklch(1 0 0)" // Text on secondary
        },
        
        // Status colors with OKLCH
        "success": {
          "DEFAULT": "oklch(0.696 0.17 162.48)", // Success green
          "muted": "oklch(0.25 0.08 142.5)", // Muted success background
          "foreground": "oklch(1 0 0)" // Text on success
        },
        "warning": {
          "DEFAULT": "oklch(0.769 0.188 70.08)", // Warning yellow
          "muted": "oklch(0.25 0.08 70.08)", // Muted warning background
          "foreground": "oklch(0.145 0 0)" // Text on warning
        },
        "danger": {
          "DEFAULT": "oklch(0.637 0.237 25.331)", // Danger red
          "muted": "oklch(0.25 0.08 25.331)", // Muted danger background
          "foreground": "oklch(1 0 0)" // Text on danger
        },
        "info": {
          "DEFAULT": "oklch(0.488 0.243 264.376)", // Info blue
          "muted": "oklch(0.25 0.08 264.376)", // Muted info background
          "foreground": "oklch(1 0 0)" // Text on info
        },
        
        // Chart colors
        "chart": {
          "1": "oklch(0.488 0.243 264.376)", // Blue
          "2": "oklch(0.696 0.17 162.48)", // Green
          "3": "oklch(0.769 0.188 70.08)", // Yellow
          "4": "oklch(0.627 0.265 303.9)", // Purple
          "5": "oklch(0.645 0.246 16.439)" // Orange
        },
        
        // Glass effects for dark theme
        "glass": {
          "highlight": "oklch(0.985 0 0 / 0.05)", // Glass highlight
          "accent": "oklch(0.488 0.243 264.376 / 0.1)", // Glass accent
          "border": "oklch(0.985 0 0 / 0.3)", // Glass border
          "card": "oklch(0.205 0 0 / 0.8)", // Glass card background
          "modal": "oklch(0.145 0 0 / 0.95)" // Glass modal background
        }
      },
      
      // Background images for gradients
      "backgroundImage": {
        // Dark theme gradients
        "gradient-dark-subtle": "linear-gradient(180deg, oklch(0.145 0 0) 0%, oklch(0.205 0 0) 100%)",
        "gradient-dark-surface": "linear-gradient(180deg, oklch(0.205 0 0) 0%, oklch(0.269 0 0) 100%)",
        "gradient-dark-primary": "linear-gradient(135deg, oklch(0.985 0 0) 0%, oklch(0.9 0 0) 100%)",
        "gradient-dark-shell": "radial-gradient(ellipse 1200px 800px at 30% 20%, oklch(0.145 0 0) 0%, oklch(0.205 0 0) 60%, oklch(0.269 0 0) 100%)",
        
        // Status gradients
        "gradient-success": "linear-gradient(135deg, oklch(0.696 0.17 162.48) 0%, oklch(0.65 0.15 150) 100%)",
        "gradient-warning": "linear-gradient(135deg, oklch(0.769 0.188 70.08) 0%, oklch(0.72 0.16 65) 100%)",
        "gradient-danger": "linear-gradient(135deg, oklch(0.637 0.237 25.331) 0%, oklch(0.58 0.2 20) 100%)"
      },
      
      "fontFamily": {
        "sans": ["System"],
        "mono": ["Courier New"]
      },
      
      // Component spacing using design tokens
      "spacing": {
        "component": {
          "xs": "0.5rem", // 8px
          "sm": "0.75rem", // 12px
          "md": "1rem", // 16px
          "lg": "1.5rem", // 24px
          "xl": "2rem" // 32px
        },
        "gap": {
          "xs": "0.25rem", // 4px
          "sm": "0.5rem", // 8px
          "md": "0.75rem", // 12px
          "lg": "1rem", // 16px
          "xl": "1.5rem" // 24px
        }
      },
      
      // Border radius tokens
      "borderRadius": {
        "token": {
          "sm": "0.25rem", // 4px
          "md": "0.375rem", // 6px
          "lg": "0.5rem", // 8px
          "card": "0.75rem" // 12px
        }
      },
      
      // Typography tokens
      "fontSize": {
        "token": {
          "xs": "0.75rem", // 12px
          "sm": "0.875rem", // 14px
          "base": "1rem", // 16px
          "lg": "1.125rem", // 18px
          "xl": "1.25rem", // 20px
          "2xl": "1.5rem", // 24px
          "3xl": "1.875rem" // 30px
        }
      },
      
      "fontWeight": {
        "token": {
          "normal": 400,
          "medium": 500,
          "semibold": 600,
          "bold": 700
        }
      },
      
      // Animation and transition tokens
      "transitionDuration": {
        "fast": "160ms",
        "base": "200ms",
        "slow": "240ms"
      },
      
      "transitionTimingFunction": {
        "ease": "cubic-bezier(0.2, 0.8, 0.2, 1)",
        "spring": "cubic-bezier(0.2, 0.8, 0.2, 1.2)"
      },
      
      // Shadow tokens for dark theme
      "boxShadow": {
        "token": {
          "xs": "0 1px 2px rgba(0,0,0,0.25)",
          "sm": "0 2px 8px rgba(0,0,0,0.35)",
          "md": "0 6px 18px rgba(0,0,0,0.45)",
          "lg": "0 12px 30px rgba(0,0,0,0.55)",
          "focus": "0 0 0 2px oklch(0.985 0 0 / 0.4), 0 0 0 4px oklch(0.488 0.243 264.376 / 0.2)"
        }
      }
    }
  },
  "plugins": []
};
