# Design System Documentation

This document describes the unified design token system for swole-tracker, providing cross-platform consistency between web and mobile applications.

## Overview

The design system uses a JSON-first approach with build scripts that generate platform-specific outputs:
- **Web**: CSS custom properties for Tailwind CSS v4
- **Mobile**: Static values for NativeWind/React Native

## Token Structure

### Schema Format

Tokens follow the Style Dictionary/Tokens Studio format:

```json
{
  "color": {
    "primary": {
      "default": {
        "$value": "oklch(0.985 0 0)",
        "$description": "Primary brand color"
      }
    }
  }
}
```

### Token Categories

#### Colors
- **Semantic colors**: `background`, `foreground`, `surface`, `card`
- **Text hierarchy**: `text.primary`, `text.secondary`, `text.muted`
- **Interactive states**: `primary.default`, `primary.hover`, `primary.active`
- **Status colors**: `success`, `warning`, `danger`, `info`
- **Chart colors**: `chart.1` through `chart.5`

#### Spacing
- **Component spacing**: `component.padding.*`, `component.gap.*`
- **Layout spacing**: `layout.section.*`, `layout.container.*`

#### Typography
- **Font families**: `fontFamily.sans`, `fontFamily.display`
- **Font sizes**: `fontSize.xs` through `fontSize.3xl`
- **Font weights**: `fontWeight.normal` through `fontWeight.bold`
- **Line heights**: `lineHeight.tight`, `lineHeight.normal`, `lineHeight.relaxed`

#### Border Radius
- **Standard radii**: `sm`, `md`, `lg`, `card`, `full`

#### Shadows
- **Standard shadows**: `xs`, `sm`, `md`, `lg`
- **Focus shadows**: `focus` (multi-layer with primary color)

#### Motion
- **Durations**: `duration.fast`, `duration.base`, `duration.slow`
- **Easing**: `easing.ease`, `easing.spring`

## Build System

### Scripts

- `bun run tokens:build` - Build all tokens (web + mobile)
- `bun run tokens:mobile` - Build mobile tokens only
- `bun run tokens:watch` - Watch mode for development

### Generated Files

#### Web Output
- `src/styles/tokens/generated-base.css` - Base tokens and component styles
- `src/styles/tokens/generated-light.css` - Light theme overrides

#### Mobile Output
- `apps/mobile/tailwind.config.js` - NativeWind configuration
- `apps/mobile/lib/design-tokens.ts` - TypeScript constants

## Theme System

### Data-Theme Strategy

The system uses `data-theme` attributes and CSS class toggles:

```html
<!-- Light theme -->
<html data-theme="light">

<!-- Dark theme -->
<html data-theme="dark" class="dark">

<!-- System theme follows OS preference -->
<html data-theme="system" class="dark">
```

### Theme Provider

React context provides theme state management:

```tsx
import { useTheme } from '~/providers/ThemeProvider';

function Component() {
  const { theme, resolvedTheme, setTheme, toggle } = useTheme();
  // theme: "light" | "dark" | "system"
  // resolvedTheme: "light" | "dark"
}
```

## Usage Patterns

### Web Components

#### Semantic Classes (Recommended)

Use semantic utility classes for consistent theming:

```tsx
// Background colors
<div className="bg-app">          // App background
<div className="bg-surface">      // Surface background
<div className="bg-card">         // Card background

// Text colors
<p className="text-primary">      // Primary text
<p className="text-secondary">    // Secondary text
<p className="text-muted">        // Muted text

// Status colors
<span className="text-success">   // Success state
<span className="text-danger">    // Error state

// Component styles
<button className="btn-primary">  // Primary button
<input className="input-primary"> // Primary input
<div className="card">            // Card container
```

#### Direct Token Variables

For custom components, use CSS variables directly:

```css
.custom-component {
  background-color: var(--color-background-surface);
  color: var(--color-text-primary);
  padding: var(--spacing-component-padding-md);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-sm);
}
```

### Mobile Components

#### NativeWind Classes

Use generated token classes in React Native:

```tsx
// Colors
<View className="bg-surface">
<Text className="text-text-primary">

// Spacing
<View className="p-component-md gap-gap-sm">

// Typography
<Text className="text-token-lg font-token-medium">

// Border radius
<View className="rounded-token-card">
```

#### TypeScript Constants

For React Native StyleSheet or complex styling:

```tsx
import { DesignTokens } from '../lib/design-tokens';

const styles = StyleSheet.create({
  container: {
    backgroundColor: DesignTokens.colors.background,
    padding: parseInt(DesignTokens.spacing.component.md),
  },
  text: {
    color: DesignTokens.colors.text.primary,
    fontSize: parseInt(DesignTokens.typography.fontSize.base),
  },
});
```

## Component Patterns

### Button Variants

```tsx
// Web
<button className="btn-primary">Primary</button>
<button className="btn-secondary">Secondary</button>
<button className="btn-ghost">Ghost</button>
<button className="btn-destructive">Destructive</button>

// Mobile
<Button variant="primary" title="Primary" />
<Button variant="secondary" title="Secondary" />
<Button variant="outline" title="Outline" />
```

### Card Components

```tsx
// Web
<div className="card">
  <h3 className="text-primary">Card Title</h3>
  <p className="text-secondary">Card content</p>
</div>

// Mobile
<View className="bg-card rounded-token-card p-component-lg">
  <Text className="text-text-primary font-token-medium">Card Title</Text>
  <Text className="text-text-secondary">Card content</Text>
</View>
```

### Loading States

```tsx
// Web
<div className="skeleton">Loading content...</div>
<div className="loading-overlay">
  <div className="spinner">Loading...</div>
</div>

// Mobile
<View className="bg-surface rounded-token-md" style={{opacity: 0.6}}>
  <ActivityIndicator color={DesignTokens.colors.primary} />
</View>
```

## Color Guidelines

### OKLCH Color Space

All colors use OKLCH for consistent perception across devices:
- **L**: Lightness (0-1)
- **C**: Chroma/saturation (0-0.4)
- **H**: Hue angle (0-360)

### Semantic Color Usage

- **Primary**: Brand color, CTAs, interactive elements
- **Secondary**: Supporting elements, less prominent actions
- **Surface**: Card backgrounds, elevated elements
- **Text hierarchy**: Primary (headings), Secondary (body), Muted (captions)
- **Status colors**: Success (green), Warning (yellow), Danger (red), Info (blue)

### Accessibility

All color combinations meet WCAG 2.2 AA contrast requirements:
- Normal text: 4.5:1 minimum contrast
- Large text: 3:1 minimum contrast
- Interactive elements: 3:1 minimum contrast

## Development Workflow

### Adding New Tokens

1. **Define in JSON**: Add to `src/styles/tokens/design-tokens.json`
2. **Build tokens**: Run `bun run tokens:build`
3. **Use in components**: Apply semantic classes or CSS variables
4. **Test themes**: Verify in light/dark modes
5. **Update mobile**: Ensure mobile app uses consistent tokens

### Theme Creation

1. **Create theme file**: Add JSON file in `src/styles/tokens/themes/`
2. **Update build script**: Modify `build-tokens.js` to include new theme
3. **Generate CSS**: Run build process
4. **Test integration**: Verify theme switching works

### Testing Tokens

Run the design token test suite:

```bash
bun test design-tokens.test.ts
```

Tests cover:
- Token generation
- CSS variable output
- Mobile compatibility
- Theme integration
- Semantic class availability

## Migration Guide

### From Hardcoded Colors

Replace hardcoded Tailwind classes:

```tsx
// Before
<div className="bg-gray-900 text-white border-gray-700">

// After
<div className="bg-surface text-primary border-border-default">
```

### From CSS Custom Properties

Update custom CSS to use token variables:

```css
/* Before */
.component {
  background: #1a1a1a;
  color: #ffffff;
}

/* After */
.component {
  background: var(--color-background-surface);
  color: var(--color-text-primary);
}
```

### Mobile Components

Update React Native components:

```tsx
// Before
<View style={{backgroundColor: '#1a1a1a', padding: 16}}>

// After - NativeWind
<View className="bg-surface p-component-md">

// After - StyleSheet
<View style={{
  backgroundColor: DesignTokens.colors.surface,
  padding: parseInt(DesignTokens.spacing.component.md)
}}>
```

## Performance Considerations

### CSS Variables
- Modern browser support (IE 11+ with fallbacks)
- Minimal runtime overhead
- Dynamic theme switching without CSS rebuilds

### Build Process
- Token generation happens at build time
- No runtime token resolution
- Mobile gets static values for optimal performance

### Bundle Size
- Semantic classes reduce CSS duplication
- Unused tokens are tree-shakeable
- Mobile constants are type-safe and minimal

## Troubleshooting

### Theme Not Applying
1. Check `data-theme` attribute is set correctly
2. Verify CSS imports in correct order
3. Ensure theme CSS files are generated

### Mobile Tokens Missing
1. Run `bun run tokens:mobile` to regenerate
2. Check NativeWind config includes token paths
3. Verify import paths for design-tokens.ts

### Token Build Errors
1. Validate JSON syntax in token files
2. Check file permissions for generated files
3. Ensure Node.js supports ES modules

## Contributing

When adding new tokens or themes:

1. Follow semantic naming conventions
2. Include descriptions for all tokens
3. Update this documentation
4. Add test coverage for new functionality
5. Verify cross-platform consistency

## Resources

- [OKLCH Color Picker](https://oklch.com/)
- [Style Dictionary Documentation](https://amzn.github.io/style-dictionary/)
- [Tailwind CSS v4 Documentation](https://tailwindcss.com/docs)
- [NativeWind Documentation](https://www.nativewind.dev/)
- [WCAG 2.2 Guidelines](https://www.w3.org/WAI/WCAG22/quickref/)