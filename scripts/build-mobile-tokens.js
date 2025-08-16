#!/usr/bin/env node

/**
 * Mobile Design Token Build Script
 * Generates static design tokens for React Native/NativeWind
 * Since NativeWind doesn't support CSS variables, we generate static values
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');
const TOKENS_DIR = path.join(ROOT_DIR, 'src/styles/tokens');
const MOBILE_DIR = path.join(ROOT_DIR, 'apps/mobile');

/**
 * Convert OKLCH to RGB for React Native compatibility
 * @param {string} oklchColor - OKLCH color string
 * @returns {string} RGB color value
 */
function oklchToRgb(oklchColor) {
  // For now, return a mapping of known values
  // In production, you'd want a proper OKLCH to RGB converter
  const colorMap = {
    'oklch(0.145 0 0)': '#252525',      // dark gray/black
    'oklch(1 0 0)': '#ffffff',          // white
    'oklch(0.205 0 0)': '#343434',      // slightly lighter dark
    'oklch(0.269 0 0)': '#454545',      // medium dark
    'oklch(0.708 0 0)': '#b5b5b5',      // light gray
    'oklch(0.65 0 0)': '#a6a6a6',       // medium gray
    'oklch(0.985 0 0)': '#fafafa',      // near white
    'oklch(0.9 0 0)': '#e6e6e6',        // light gray
    'oklch(0.85 0 0)': '#d9d9d9',       // lighter gray
    'oklch(0.696 0.17 162.48)': '#22c55e',     // green
    'oklch(0.769 0.188 70.08)': '#eab308',     // yellow
    'oklch(0.637 0.237 25.331)': '#ef4444',   // red
    'oklch(0.488 0.243 264.376)': '#3b82f6',  // blue
  };
  
  return colorMap[oklchColor] || oklchColor;
}

/**
 * Resolve token references in mobile context
 * @param {*} value - Token value
 * @param {Object} context - Full token context
 * @returns {*} Resolved value
 */
function resolveMobileValue(value, context) {
  // Handle references
  if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
    const reference = value.slice(1, -1);
    const refPath = reference.split('.');
    let resolved = context;
    
    for (const part of refPath) {
      resolved = resolved?.[part];
    }
    
    if (resolved?.$value) {
      return resolveMobileValue(resolved.$value, context);
    }
    return value; // Fallback to original if not found
  }
  
  // Convert OKLCH colors to RGB
  if (typeof value === 'string' && value.startsWith('oklch(')) {
    return oklchToRgb(value);
  }
  
  return value;
}

/**
 * Generate mobile-compatible Tailwind config
 * @param {Object} tokens - Design tokens
 * @param {Object} lightTokens - Light theme overrides
 * @returns {Object} Mobile Tailwind config
 */
function generateMobileConfig(tokens, lightTokens = {}) {
  const config = {
    content: [
      "./app/**/*.{js,jsx,ts,tsx}",
      "./components/**/*.{js,jsx,ts,tsx}",
      "./lib/**/*.{js,jsx,ts,tsx}",
    ],
    presets: ["nativewind/preset"],
    theme: {
      extend: {
        colors: {
          // Primary color scale (use semantic primary)
          primary: {
            50: '#f0f9ff',
            100: '#e0f2fe', 
            200: '#bae6fd',
            300: '#7dd3fc',
            400: '#38bdf8',
            500: resolveMobileValue(tokens.color.primary.default.$value, tokens),
            600: resolveMobileValue(tokens.color.primary.hover.$value, tokens),
            700: resolveMobileValue(tokens.color.primary.active.$value, tokens),
            800: '#075985',
            900: '#0c4a6e',
            950: '#082f49',
          },
          
          // Semantic colors from design tokens
          background: resolveMobileValue(tokens.color.background.app.$value, tokens),
          foreground: resolveMobileValue(tokens.color.text.primary.$value, tokens),
          card: resolveMobileValue(tokens.color.background.card.$value, tokens),
          surface: resolveMobileValue(tokens.color.background.surface.$value, tokens),
          
          // Text colors
          'text-primary': resolveMobileValue(tokens.color.text.primary.$value, tokens),
          'text-secondary': resolveMobileValue(tokens.color.text.secondary.$value, tokens),
          'text-muted': resolveMobileValue(tokens.color.text.muted.$value, tokens),
          
          // Border colors  
          'border-default': resolveMobileValue(tokens.color.border.default.$value, tokens),
          
          // Status colors
          success: resolveMobileValue(tokens.color.status.success.default.$value, tokens),
          warning: resolveMobileValue(tokens.color.status.warning.default.$value, tokens),
          danger: resolveMobileValue(tokens.color.status.danger.default.$value, tokens),
          info: resolveMobileValue(tokens.color.status.info.default.$value, tokens),
          
          // Chart colors
          'chart-1': resolveMobileValue(tokens.color.chart['1'].$value, tokens),
          'chart-2': resolveMobileValue(tokens.color.chart['2'].$value, tokens),
          'chart-3': resolveMobileValue(tokens.color.chart['3'].$value, tokens),
          'chart-4': resolveMobileValue(tokens.color.chart['4'].$value, tokens),
          'chart-5': resolveMobileValue(tokens.color.chart['5'].$value, tokens),
        },
        
        fontFamily: {
          sans: ['System'],
          mono: ['Courier New'],
        },
        
        spacing: {
          // Component spacing from tokens
          'component-xs': resolveMobileValue(tokens.spacing.component.padding.xs.$value, tokens),
          'component-sm': resolveMobileValue(tokens.spacing.component.padding.sm.$value, tokens),
          'component-md': resolveMobileValue(tokens.spacing.component.padding.md.$value, tokens),
          'component-lg': resolveMobileValue(tokens.spacing.component.padding.lg.$value, tokens),
          'component-xl': resolveMobileValue(tokens.spacing.component.padding.xl.$value, tokens),
          
          // Gap spacing
          'gap-xs': resolveMobileValue(tokens.spacing.component.gap.xs.$value, tokens),
          'gap-sm': resolveMobileValue(tokens.spacing.component.gap.sm.$value, tokens),
          'gap-md': resolveMobileValue(tokens.spacing.component.gap.md.$value, tokens),
          'gap-lg': resolveMobileValue(tokens.spacing.component.gap.lg.$value, tokens),
          'gap-xl': resolveMobileValue(tokens.spacing.component.gap.xl.$value, tokens),
        },
        
        borderRadius: {
          'token-sm': resolveMobileValue(tokens.borderRadius.sm.$value, tokens),
          'token-md': resolveMobileValue(tokens.borderRadius.md.$value, tokens),
          'token-lg': resolveMobileValue(tokens.borderRadius.lg.$value, tokens),
          'token-card': resolveMobileValue(tokens.borderRadius.card.$value, tokens),
        },
        
        fontSize: {
          'token-xs': resolveMobileValue(tokens.typography.fontSize.xs.$value, tokens),
          'token-sm': resolveMobileValue(tokens.typography.fontSize.sm.$value, tokens),
          'token-base': resolveMobileValue(tokens.typography.fontSize.base.$value, tokens),
          'token-lg': resolveMobileValue(tokens.typography.fontSize.lg.$value, tokens),
          'token-xl': resolveMobileValue(tokens.typography.fontSize.xl.$value, tokens),
          'token-2xl': resolveMobileValue(tokens.typography.fontSize['2xl'].$value, tokens),
          'token-3xl': resolveMobileValue(tokens.typography.fontSize['3xl'].$value, tokens),
        },
        
        fontWeight: {
          'token-normal': resolveMobileValue(tokens.typography.fontWeight.normal.$value, tokens),
          'token-medium': resolveMobileValue(tokens.typography.fontWeight.medium.$value, tokens),
          'token-semibold': resolveMobileValue(tokens.typography.fontWeight.semibold.$value, tokens),
          'token-bold': resolveMobileValue(tokens.typography.fontWeight.bold.$value, tokens),
        },
      },
    },
    plugins: [],
  };
  
  return config;
}

/**
 * Generate TypeScript token constants for React Native
 * @param {Object} tokens - Design tokens
 * @returns {string} TypeScript constants
 */
function generateMobileConstants(tokens) {
  return `
// Generated design token constants for React Native
// This file is auto-generated - do not edit manually

export const DesignTokens = {
  colors: {
    primary: '${resolveMobileValue(tokens.color.primary.default.$value, tokens)}',
    primaryHover: '${resolveMobileValue(tokens.color.primary.hover.$value, tokens)}',
    primaryActive: '${resolveMobileValue(tokens.color.primary.active.$value, tokens)}',
    
    background: '${resolveMobileValue(tokens.color.background.app.$value, tokens)}',
    surface: '${resolveMobileValue(tokens.color.background.surface.$value, tokens)}',
    card: '${resolveMobileValue(tokens.color.background.card.$value, tokens)}',
    
    text: {
      primary: '${resolveMobileValue(tokens.color.text.primary.$value, tokens)}',
      secondary: '${resolveMobileValue(tokens.color.text.secondary.$value, tokens)}',
      muted: '${resolveMobileValue(tokens.color.text.muted.$value, tokens)}',
    },
    
    border: {
      default: '${resolveMobileValue(tokens.color.border.default.$value, tokens)}',
    },
    
    status: {
      success: '${resolveMobileValue(tokens.color.status.success.default.$value, tokens)}',
      warning: '${resolveMobileValue(tokens.color.status.warning.default.$value, tokens)}',
      danger: '${resolveMobileValue(tokens.color.status.danger.default.$value, tokens)}',
      info: '${resolveMobileValue(tokens.color.status.info.default.$value, tokens)}',
    },
  },
  
  spacing: {
    component: {
      xs: '${resolveMobileValue(tokens.spacing.component.padding.xs.$value, tokens)}',
      sm: '${resolveMobileValue(tokens.spacing.component.padding.sm.$value, tokens)}',
      md: '${resolveMobileValue(tokens.spacing.component.padding.md.$value, tokens)}',
      lg: '${resolveMobileValue(tokens.spacing.component.padding.lg.$value, tokens)}',
      xl: '${resolveMobileValue(tokens.spacing.component.padding.xl.$value, tokens)}',
    },
    gap: {
      xs: '${resolveMobileValue(tokens.spacing.component.gap.xs.$value, tokens)}',
      sm: '${resolveMobileValue(tokens.spacing.component.gap.sm.$value, tokens)}',
      md: '${resolveMobileValue(tokens.spacing.component.gap.md.$value, tokens)}',
      lg: '${resolveMobileValue(tokens.spacing.component.gap.lg.$value, tokens)}',
      xl: '${resolveMobileValue(tokens.spacing.component.gap.xl.$value, tokens)}',
    },
  },
  
  borderRadius: {
    sm: '${resolveMobileValue(tokens.borderRadius.sm.$value, tokens)}',
    md: '${resolveMobileValue(tokens.borderRadius.md.$value, tokens)}',
    lg: '${resolveMobileValue(tokens.borderRadius.lg.$value, tokens)}',
    card: '${resolveMobileValue(tokens.borderRadius.card.$value, tokens)}',
  },
  
  typography: {
    fontSize: {
      xs: '${resolveMobileValue(tokens.typography.fontSize.xs.$value, tokens)}',
      sm: '${resolveMobileValue(tokens.typography.fontSize.sm.$value, tokens)}',
      base: '${resolveMobileValue(tokens.typography.fontSize.base.$value, tokens)}',
      lg: '${resolveMobileValue(tokens.typography.fontSize.lg.$value, tokens)}',
      xl: '${resolveMobileValue(tokens.typography.fontSize.xl.$value, tokens)}',
      '2xl': '${resolveMobileValue(tokens.typography.fontSize['2xl'].$value, tokens)}',
      '3xl': '${resolveMobileValue(tokens.typography.fontSize['3xl'].$value, tokens)}',
    },
    fontWeight: {
      normal: ${resolveMobileValue(tokens.typography.fontWeight.normal.$value, tokens)},
      medium: ${resolveMobileValue(tokens.typography.fontWeight.medium.$value, tokens)},
      semibold: ${resolveMobileValue(tokens.typography.fontWeight.semibold.$value, tokens)},
      bold: ${resolveMobileValue(tokens.typography.fontWeight.bold.$value, tokens)},
    },
  },
} as const;

export type DesignTokens = typeof DesignTokens;
`;
}

/**
 * Main build function
 */
async function buildMobileTokens() {
  try {
    console.log('📱 Building mobile design tokens...');
    
    // Load base tokens
    const baseTokensPath = path.join(TOKENS_DIR, 'design-tokens.json');
    const baseTokens = JSON.parse(fs.readFileSync(baseTokensPath, 'utf8'));
    
    // Load light theme overrides if they exist
    const lightTokensPath = path.join(TOKENS_DIR, 'themes/light.json');
    let lightTokens = {};
    if (fs.existsSync(lightTokensPath)) {
      lightTokens = JSON.parse(fs.readFileSync(lightTokensPath, 'utf8'));
    }
    
    // Generate mobile Tailwind config
    const mobileConfig = generateMobileConfig(baseTokens, lightTokens);
    const configPath = path.join(MOBILE_DIR, 'tailwind.config.js');
    
    const configContent = `/** @type {import('tailwindcss').Config} */
module.exports = ${JSON.stringify(mobileConfig, null, 2)};
`;
    
    fs.writeFileSync(configPath, configContent);
    console.log('✅ Generated mobile Tailwind config');
    
    // Generate TypeScript constants
    const constants = generateMobileConstants(baseTokens);
    const constantsPath = path.join(MOBILE_DIR, 'lib/design-tokens.ts');
    
    // Ensure lib directory exists
    const libDir = path.dirname(constantsPath);
    if (!fs.existsSync(libDir)) {
      fs.mkdirSync(libDir, { recursive: true });
    }
    
    fs.writeFileSync(constantsPath, constants);
    console.log('✅ Generated mobile TypeScript constants');
    
    console.log('🎯 Mobile design token build complete!');
    
  } catch (error) {
    console.error('❌ Error building mobile tokens:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  buildMobileTokens();
}

export { buildMobileTokens };