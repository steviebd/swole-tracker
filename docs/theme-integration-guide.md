# Theme Integration Guide

## Overview

This guide explains how to properly integrate components with Swole Tracker's Material 3 theme system, following the refactoring patterns implemented for WorkoutSessionWithHealthAdvice and SubjectiveWellnessModal components.

## Material 3 Theme System Architecture

### Theme Variants
- **Light themes**: `light`, `warm`, `neutral`
- **Dark themes**: `dark`, `cool`

### Token Structure
- **Source of Truth**: `src/design-tokens/material3-palettes.generated.json`
- **CSS Tokens**: `src/styles/material3-tokens.css` (auto-generated)
- **Build Command**: `bun run tokens:build`

### Semantic Token Categories

#### Surface Hierarchy
- `bg-surface-app` - App background level
- `bg-surface-base` - Primary surface level
- `bg-surface-primary` - Card surface level
- `bg-surface-elevated` - Elevated card with additional shadow

#### Interactive Elements
- `bg-interactive-primary` / `text-primary-foreground` - Primary actions
- `bg-interactive-secondary` / `text-secondary-foreground` - Secondary actions
- `bg-interactive-accent` / `text-accent-foreground` - Tertiary/accent actions

#### Status Colors
- `bg-status-success` / `text-onTertiary` - Success states
- `bg-status-warning` / `text-onSecondary` - Warning states
- `bg-status-danger` / `text-onError` - Error states

#### Content Text
- `text-content-primary` - Primary text
- `text-content-secondary` - Secondary text
- `text-content-muted` - Muted/secondary text

## Refactoring Changes

### 1. StatusBadge Component

**New File**: `src/components/ui/status-badge.tsx`

**Purpose**: Reusable component for consistent status indicators across themes

**Usage**:
```tsx
import { StatusBadge } from "~/components/ui/status-badge";

<StatusBadge status="success">Operation completed</StatusBadge>
<StatusBadge status="warning">Attention needed</StatusBadge>
<StatusBadge status="error">Action required</StatusBadge>
```

### 2. Theme Helpers

**New File**: `src/lib/theme-helpers.ts`

**Purpose**: Centralized functions for theme-aware styling

**Key Functions**:
- `getStatusClasses(status)` - Get semantic status classes
- `getReadinessStatus(readiness)` - Convert numeric readiness to status type
- `getReadinessClasses(readiness)` - Get readiness styling classes
- `getSurfaceClasses(level)` - Get surface hierarchy classes
- `getInteractiveProps(variant)` - Get interactive element props with state layers
- `getGlassClasses(variant)` - Get glass surface classes
- `getTypographyClasses(level)` - Get typography classes

### 3. WorkoutSessionWithHealthAdvice Refactoring

#### Readiness Indicator
**Before**:
```tsx
className={`rounded-full px-2 py-1 text-xs font-medium ${
  readiness > 0.7
    ? "bg-green-100 text-green-800"
    : readiness > 0.4
      ? "bg-yellow-100 text-yellow-800"
      : "bg-red-100 text-red-800"
}`}
```

**After**:
```tsx
<StatusBadge status={getReadinessStatus(readiness)}>
  Readiness: {Math.round(readiness * 100)}%
</StatusBadge>
```

#### Error Notice
**Before**:
```tsx
<div className="glass-surface rounded-lg border border-red-500/40 p-4 text-red-600">
```

**After**:
```tsx
<div className={`glass-surface rounded-lg border ${errorClasses.border}/40 p-4 ${errorClasses.text}`}>
```

## Best Practices for Theme Integration

### 1. Use Semantic Tokens

**✅ Recommended**:
```tsx
<div className="bg-surface-primary text-content-primary">
<button className="bg-interactive-primary text-primary-foreground">
```

**❌ Avoid**:
```tsx
<div className="bg-white text-black">
<button className="bg-blue-500 text-white">
```

### 2. Implement State Layers

**✅ Recommended**:
```tsx
<button
  data-state-layer="primary"
  className="bg-interactive-primary text-primary-foreground"
>
  Primary Action
</button>
```

### 3. Use Surface Hierarchy

**✅ Recommended**:
```tsx
<div className="bg-surface-app">
  <div className="bg-surface-primary">
    <div className="bg-surface-elevated">
```

### 4. Apply Glass Effects

**✅ Recommended**:
```tsx
<div className="glass-card backdrop-blur-sm border-outlineVariant/60">
  Content with proper backdrop blur
</div>
```

## Testing Theme Integration

### 1. Cross-Theme Testing

Test components in all 5 theme variants:
```bash
# Test in development
bun dev

# Verify themes:
# - data-theme="light"
# - data-theme="dark"
# - data-theme="warm"
# - data-theme="cool"
# - data-theme="neutral"
```

### 2. Accessibility Testing

Ensure WCAG 2.2 AA compliance:
- Contrast ratios ≥ 4.5:1 for normal text
- Contrast ratios ≥ 3:1 for large text
- Focus indicators visible in all themes

### 3. Mobile Testing

Verify mobile appearance:
- Glass effects work on small screens
- Touch targets meet minimum size (44px)
- Text remains readable in outdoor lighting

## Advanced Patterns

### 1. Component Variants System

Use `component-variants.ts` helpers for consistent styling:
```tsx
import { combineVariants } from "~/design-tokens/component-variants";

const className = combineVariants({
  variant: 'surface',
  intent: 'primary',
  size: 'md',
  glass: 'medium',
  animation: 'hover'
});
```

### 2. Theme-Aware Animations

Respect motion preferences:
```tsx
import { useReducedMotion } from "~/hooks/use-reduced-motion";

const motionProps = !prefersReducedMotion ? {
  variants: buttonPressVariants,
  whileHover: "hover",
  whileTap: "tap"
} : {};
```

### 3. Conditional Theme Application

Use helper functions for conditional styling:
```tsx
const readinessClass = getReadinessClasses(readiness);
<div className={`rounded-lg ${readinessClass}`}>
  Status indicator
</div>
```

## Migration Checklist

### Before Refactoring
- [ ] Identify all hardcoded color values
- [ ] Map to appropriate semantic tokens
- [ ] Create reusable components for repeated patterns

### During Refactoring
- [ ] Replace hardcoded values with semantic tokens
- [ ] Implement state layers for interactive elements
- [ ] Use surface hierarchy for proper elevation

### After Refactoring
- [ ] Test in all 5 theme variants
- [ ] Verify accessibility compliance
- [ ] Check mobile appearance
- [ ] Run theme tests: `bun run test -- src/__tests__/design-tokens/material3-theme.test.ts`

## Troubleshooting

### Common Issues

1. **Colors Not Changing Between Themes**
   - Verify semantic token usage
   - Check CSS variable imports in `globals.css`
   - Ensure theme data attribute is set

2. **Poor Contrast in Dark Themes**
   - Use proper on-color tokens (e.g., `text-onPrimary` instead of `text-primary`)
   - Verify surface hierarchy implementation

3. **Glass Effects Not Working**
   - Ensure backdrop-blur is supported
   - Check glass surface classes match theme
   - Verify mobile-specific glass overrides

### Debug Tools

1. **Browser DevTools**: Inspect computed styles to verify token application
2. **Theme Testing**: Use ThemeSelector component to test all variants
3. **Accessibility Audit**: Use browser accessibility tools or axe-core

## Resources

- [Material 3 Design Specification](https://m3.material.io/)
- [Swole Tracker Design Manifesto](DESIGN_MANIFESTO.md)
- [Material 3 Theme Guide](docs/material3-theme-guide.md)
- [Component Variants Documentation](src/design-tokens/component-variants.ts)