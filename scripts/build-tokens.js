#!/usr/bin/env node

/**
 * Design Token Build Script
 * Generates CSS variables from JSON design tokens
 * Follows Style Dictionary format and outputs Tailwind CSS v4 compatible @theme blocks
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');
const TOKENS_DIR = path.join(ROOT_DIR, 'src/styles/tokens');

/**
 * Recursively flatten token object into CSS variable format
 * @param {Object} obj - Token object
 * @param {string} prefix - CSS variable prefix
 * @param {Object} context - Context for resolving references
 * @returns {Object} Flattened CSS variables
 */
function flattenTokens(obj, prefix = '', context = {}) {
  const result = {};
  
  for (const [key, value] of Object.entries(obj)) {
    // Skip schema and description properties
    if (key.startsWith('$')) {
      continue;
    }
    
    const cssKey = prefix ? `${prefix}-${key}` : key;
    
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Check if this is a token object (has $value property)
      if (value.$value !== undefined) {
        result[cssKey] = resolveTokenValue(value.$value, context);
      } else {
        // Recursive call for nested objects
        Object.assign(result, flattenTokens(value, cssKey, context));
      }
    }
  }
  
  return result;
}

/**
 * Resolve token references and convert values to CSS format
 * @param {*} value - Token value (could be reference, object, or primitive)
 * @param {Object} context - Context for resolving references
 * @returns {string} CSS-ready value
 */
function resolveTokenValue(value, context) {
  // Handle reference tokens (e.g., "{color.primary.default}")
  if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
    const reference = value.slice(1, -1);
    const refPath = reference.split('.');
    let resolved = context;
    
    for (const part of refPath) {
      resolved = resolved?.[part];
    }
    
    return resolved?.$value || value; // Fallback to original if not found
  }
  
  // Handle gradient objects
  if (typeof value === 'object' && value.type === 'linear') {
    const angle = value.angle || '0deg';
    const stops = value.stops?.map(stop => 
      `${stop.color} ${stop.position}`
    ).join(', ') || '';
    return `linear-gradient(${angle}, ${stops})`;
  }
  
  if (typeof value === 'object' && value.type === 'radial') {
    const shape = value.shape || 'circle';
    const size = value.size || 'closest-side';
    const position = value.position || 'center';
    const stops = value.stops?.map(stop => 
      `${stop.color} ${stop.position}`
    ).join(', ') || '';
    return `radial-gradient(${shape} ${size} at ${position}, ${stops})`;
  }
  
  // Handle shadow objects
  if (typeof value === 'object' && value.color) {
    const { color, offsetX, offsetY, blur, spread } = value;
    return `${offsetX} ${offsetY} ${blur} ${spread} ${color}`;
  }
  
  // Handle shadow arrays (multiple shadows)
  if (Array.isArray(value) && value.length > 0 && value[0].color) {
    return value.map(shadow => {
      const { color, offsetX, offsetY, blur, spread } = shadow;
      return `${offsetX} ${offsetY} ${blur} ${spread} ${color}`;
    }).join(', ');
  }
  
  // Handle font family arrays
  if (Array.isArray(value) && value.every(v => typeof v === 'string')) {
    return value.map(font => 
      font.includes(' ') ? `"${font}"` : font
    ).join(', ');
  }
  
  // Handle cubic bezier arrays
  if (Array.isArray(value) && value.length === 4 && value.every(v => typeof v === 'number')) {
    return `cubic-bezier(${value.join(', ')})`;
  }
  
  return value;
}

/**
 * Generate CSS variables from tokens
 * @param {Object} tokens - Token object
 * @param {string} prefix - CSS variable prefix
 * @returns {string} CSS variable declarations
 */
function generateCSSVariables(tokens, prefix = '') {
  const flattened = flattenTokens(tokens, prefix, tokens);
  
  let css = '';
  for (const [key, value] of Object.entries(flattened)) {
    css += `  --${key.replace(/\./g, '-')}: ${value};\n`;
  }
  
  return css;
}

/**
 * Generate base theme CSS
 * @param {Object} tokens - Base token object
 * @returns {string} Complete CSS content
 */
function generateBaseCSS(tokens) {
  return `/* Generated base design tokens */
@import "tailwindcss";

/* Base tokens shared by all themes */
@theme {
${generateCSSVariables(tokens.typography, 'font')}
${generateCSSVariables({ radius: tokens.borderRadius }, '')}
${generateCSSVariables(tokens.shadow, 'shadow')}
${generateCSSVariables(tokens.motion, 'motion')}
${generateCSSVariables(tokens.spacing, 'spacing')}
}

/* Global defaults */
:root { 
  color-scheme: light;
${generateCSSVariables(tokens.color, 'color')}
${generateCSSVariables(tokens.gradient, 'gradient')}
${generateCSSVariables(tokens.component, 'component')}
}

html.dark { 
  color-scheme: dark; 
}

body {
  background-color: var(--color-background-app);
  color: var(--color-text-primary);
}

/* Component base styles using tokens */
.card {
  border-radius: var(--radius-card);
  border-width: 1px;
  border-style: solid;
  background-color: var(--color-background-card);
  color: var(--color-text-primary);
  border-color: var(--color-border-default);
  box-shadow: var(--shadow-xs);
  padding: var(--component-card-padding);
}

.btn-primary {
  @apply inline-flex items-center justify-center transition-colors;
  padding: var(--component-button-padding-y) var(--component-button-padding-x);
  border-radius: var(--component-button-borderRadius);
  font-size: var(--component-button-fontSize);
  font-weight: var(--component-button-fontWeight);
  background-color: var(--color-primary-default);
  color: var(--color-semantic-background);
}

.btn-primary:hover {
  background-color: var(--color-primary-hover);
}

.btn-primary:active {
  background-color: var(--color-primary-active);
}

.btn-primary:focus-visible {
  outline: none;
  box-shadow: var(--shadow-focus);
}

.input-primary {
  @apply block w-full border transition-colors;
  padding: var(--component-input-padding-y) var(--component-input-padding-x);
  border-radius: var(--component-input-borderRadius);
  font-size: var(--component-input-fontSize);
  background-color: var(--color-semantic-background);
  color: var(--color-semantic-foreground);
  border-color: var(--color-border-default);
}

.input-primary:focus {
  border-color: var(--color-primary-default);
  outline: none;
  box-shadow: var(--shadow-focus);
}

/* Semantic utility classes */
.text-primary { color: var(--color-text-primary); }
.text-secondary { color: var(--color-text-secondary); }
.text-muted { color: var(--color-text-muted); }

.bg-app { background-color: var(--color-background-app); }
.bg-surface { background-color: var(--color-background-surface); }
.bg-card { background-color: var(--color-background-card); }

.border-default { border-color: var(--color-border-default); }
.border-muted { border-color: var(--color-border-muted); }

.bg-success { background-color: var(--color-status-success-default); }
.bg-warning { background-color: var(--color-status-warning-default); }
.bg-danger { background-color: var(--color-status-danger-default); }
.bg-info { background-color: var(--color-status-info-default); }

.bg-success-muted { background-color: var(--color-status-success-muted); }
.bg-warning-muted { background-color: var(--color-status-warning-muted); }
.bg-danger-muted { background-color: var(--color-status-danger-muted); }
.bg-info-muted { background-color: var(--color-status-info-muted); }

.text-success { color: var(--color-status-success-default); }
.text-warning { color: var(--color-status-warning-default); }
.text-danger { color: var(--color-status-danger-default); }
.text-info { color: var(--color-status-info-default); }

/* Glass effects */
.glass-surface {
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  background-color: var(--color-glass-card);
  border: 1px solid var(--color-glass-border);
  box-shadow: var(--shadow-sm);
}

.glass-modal {
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  background-color: var(--color-glass-modal);
}

/* Gradient utilities */
.bg-gradient-subtle { background: var(--gradient-subtle); }
.bg-gradient-surface { background: var(--gradient-surface); }
.bg-gradient-primary { background: var(--gradient-primary); }
.bg-gradient-accent { background: var(--gradient-accent); }
.bg-gradient-shell-radial { background: var(--gradient-shell-radial); }

/* Motion utilities */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }
}
`;
}

/**
 * Generate theme override CSS
 * @param {Object} themeTokens - Theme-specific token overrides
 * @param {string} themeName - Theme name (light/dark)
 * @returns {string} Theme-specific CSS
 */
function generateThemeCSS(themeTokens, themeName) {
  const selector = themeName === 'light' 
    ? ':root, [data-theme="light"], [data-theme="system"] html:not(.dark)'
    : '[data-theme="dark"], [data-theme="system"] html.dark, html.dark';
    
  return `/* Generated ${themeName} theme overrides */
@import "tailwindcss";

${selector} {
  color-scheme: ${themeName};
${generateCSSVariables(themeTokens.color, 'color')}
${generateCSSVariables(themeTokens.shadow, 'shadow')}
${generateCSSVariables(themeTokens.gradient, 'gradient')}
}

/* ${themeName} theme specific glass effects */
${selector} .glass-surface {
  background:
    radial-gradient(1200px 600px at 20% -10%, var(--color-glass-highlight) 0%, transparent 60%),
    radial-gradient(800px 400px at 110% 0%, var(--color-glass-accent) 0%, transparent 60%),
    color-mix(in oklab, var(--color-background-surface) 85%, var(--color-semantic-foreground) 15%);
  border-color: color-mix(in oklab, var(--color-border-default) 70%, var(--color-glass-border));
}

${selector} .glass-header {
  background:
    linear-gradient(180deg, var(--color-glass-highlight) 0%, transparent 100%),
    color-mix(in oklab, var(--color-background-surface) 70%, var(--color-semantic-foreground) 30%);
  border-bottom-color: color-mix(in oklab, var(--color-border-default) 70%, var(--color-glass-border));
}
`;
}

/**
 * Watch mode for development
 */
function setupWatchMode() {
  if (!process.argv.includes('--watch')) return;
  
  console.log('👀 Watching for token changes...');
  
  const watchPaths = [
    path.join(TOKENS_DIR, 'design-tokens.json'),
    path.join(TOKENS_DIR, 'themes/')
  ];
  
  watchPaths.forEach(watchPath => {
    if (fs.existsSync(watchPath)) {
      fs.watchFile(watchPath, { interval: 1000 }, () => {
        console.log('🔄 Token files changed, rebuilding...');
        buildTokens().catch(console.error);
      });
    }
  });
}

/**
 * Main build function
 */
async function buildTokens() {
  const startTime = Date.now();
  
  try {
    console.log('🎨 Building design tokens...');
    
    // Check if files need rebuilding (basic caching)
    const tokensPath = path.join(TOKENS_DIR, 'design-tokens.json');
    const generatedPath = path.join(TOKENS_DIR, 'generated-base.css');
    
    if (fs.existsSync(generatedPath)) {
      const tokensTime = fs.statSync(tokensPath).mtime;
      const generatedTime = fs.statSync(generatedPath).mtime;
      
      if (tokensTime <= generatedTime && !process.argv.includes('--force')) {
        console.log('⚡ Tokens up to date, skipping build');
        return;
      }
    }
    
    // Load base tokens
    const baseTokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
    
    // Generate base CSS
    const baseCSS = generateBaseCSS(baseTokens);
    fs.writeFileSync(path.join(TOKENS_DIR, 'generated-base.css'), baseCSS);
    console.log('✅ Generated base tokens');
    
    // Load and generate light theme
    const lightTokensPath = path.join(TOKENS_DIR, 'themes/light.json');
    if (fs.existsSync(lightTokensPath)) {
      const lightTokens = JSON.parse(fs.readFileSync(lightTokensPath, 'utf8'));
      const lightCSS = generateThemeCSS(lightTokens, 'light');
      fs.writeFileSync(path.join(TOKENS_DIR, 'generated-light.css'), lightCSS);
      console.log('✅ Generated light theme tokens');
    }
    
    // For now, we'll keep the existing dark theme (dark.css)
    // In the future, we can create a dark.json file and generate it
    console.log('ℹ️  Dark theme uses existing dark.css file');
    
    const duration = Date.now() - startTime;
    console.log(`🎯 Design token build complete! (${duration}ms)`);
    
  } catch (error) {
    console.error('❌ Error building tokens:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  buildTokens().then(() => {
    setupWatchMode();
  });
}

export { buildTokens, generateCSSVariables, generateBaseCSS, generateThemeCSS };