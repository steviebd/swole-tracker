# UI Refactor Migration Plan

## Overview
Migration from monochromatic design system to energetic fitness theme with vibrant orange/amber colors, enhanced typography, and gradient-driven visual effects.

## Target Design Direction
Based on `/apps/template/` examples, implementing:
- Energetic fitness color palette (amber/orange primary colors)
- Dual typography system (sans-serif body, serif headings)
- Gradient-based visual effects replacing glass morphism
- Enhanced component animations and interactions

---

## PHASE 1: Foundation Updates

### 1. Update Design Tokens JSON
**File:** `src/styles/tokens/design-tokens.json`
**Priority:** High

**Current colors to replace:**
```json
"primary": {
  "default": "oklch(0.985 0 0)"  // White
}
```

**Target colors (confirmed energetic fitness theme):**
```json
"primary": {
  "default": "#d97706",  // Amber (primary action)
  "hover": "#f59e0b",    // Golden yellow (hover state)
  "active": "#d97706"    // Amber (active state)
},
"secondary": "#f59e0b",    // Secondary accent
"accent": "#f97316",       // Orange accent for highlights
"chart": {
  "1": "#f97316",          // Orange for primary charts
  "2": "#dc2626",          // Red for secondary charts
  "3": "#d97706",          // Amber for tertiary charts
  "4": "#f59e0b",          // Golden yellow for fourth charts
  "5": "#4b5563"           // Dark gray for fifth charts
}
```

**Actions:**
- [ ] Replace primary color values with energetic amber/orange palette (#d97706 primary, #f59e0b secondary)
- [ ] Update background colors: light cream (#fefce8) for light mode, dark slate (#0f172a) for dark mode
- [ ] Add accent color (#f97316) for highlights and interactive elements
- [ ] Update chart colors: orange (#f97316), red (#dc2626), amber (#d97706), golden (#f59e0b), gray (#4b5563)
- [ ] Convert all hex values to OKLCH format for better color manipulation and consistency
- [ ] Add dark mode variants: brighter orange (#f97316) and yellow (#fbbf24) for enhanced visibility

### 2. Add Typography Tokens
**Files:** `src/styles/tokens/design-tokens.json`
**Priority:** High

**Add energetic typography tokens (confirmed from template):**
```json
"typography": {
  "fontFamily": {
    "sans": ["Open Sans", "ui-sans-serif", "system-ui", "sans-serif"],
    "serif": ["Montserrat", "ui-serif", "Georgia", "serif"],
    "display": ["Montserrat", "ui-serif", "Georgia", "serif"]
  },
  "fontWeight": {
    "black": 900
  }
}
```

**Actions:**
- [ ] Add serif font family (Montserrat) for energetic headings and key metrics display
- [ ] Add sans font family (Open Sans) for body text and UI elements
- [ ] Add font-weight black (900) for strong, impactful headings
- [ ] Ensure font loading is optimized in layout files for performance

### 3. Generate Updated CSS Tokens
**Files:** `src/styles/tokens/generated-*.css`
**Priority:** High

**Actions:**
- [ ] Run `bun run tokens:build` to regenerate CSS from updated JSON
- [ ] Verify generated CSS includes new color variables
- [ ] Test token generation process works correctly

### 4. Create Gradient Utility Classes
**File:** `src/styles/globals.css`
**Priority:** Medium

**Add energetic gradient utilities (confirmed from template):**
```css
@layer utilities {
  .gradient-primary {
    background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
    /* Creates amber to orange gradient for primary actions */
  }
  .gradient-secondary {
    background: linear-gradient(135deg, var(--secondary) 0%, var(--primary) 100%);
    /* Creates golden to amber gradient for secondary elements */
  }
  .gradient-card {
    background: linear-gradient(135deg, var(--card) 0%, color-mix(in srgb, var(--card) 95%, var(--primary) 5%) 100%);
    /* Subtle gradient with 5% energetic color tint for enhanced card depth */
  }
}
```

**Actions:**
- [ ] Add energetic gradient utility classes to globals.css with precise amber/orange combinations
- [ ] Ensure CSS custom properties reference updated token variables for seamless theme switching
- [ ] Test gradient rendering in both light and dark themes for optimal visibility and impact
- [ ] Verify gradients work correctly with the color-mix function for subtle card enhancements

---

## PHASE 2: Component Migration

### 5. Update Stats Cards Component
**File:** `src/app/_components/StatsCards.tsx`
**Priority:** High

**Current patterns to replace:**
- Glass morphism effects (`.glass-surface`)
- Monochromatic color usage
- Simple card layouts

**Target patterns from template:**
- Gradient backgrounds for icon containers
- Serif font for value display
- Enhanced hover animations with transform
- Colorful accent icons

**Actions:**
- [ ] Replace `glass-surface` with new card styling
- [ ] Add gradient background to icon containers: `bg-gradient-to-br from-chart-1 to-chart-3`
- [ ] Update typography: values use `font-serif font-black text-3xl`
- [ ] Add hover transform: `hover:-translate-y-1 hover:shadow-xl`
- [ ] Update color classes to use chart color tokens

### 6. Update Quick Action Cards Component  
**File:** `src/app/_components/QuickActionCards.tsx`
**Priority:** High

**Current patterns to replace:**
- Inline style declarations
- Glass surface styling
- Muted color scheme

**Target patterns from template:**
- Gradient accent strips at top of cards
- Gradient icon backgrounds
- Gradient buttons
- Enhanced animations

**Actions:**
- [ ] Remove inline styles using `var(--color-*)` syntax
- [ ] Add gradient accent strip: `<div className="h-2 bg-gradient-to-r from-primary to-accent" />`
- [ ] Update icon containers with gradient backgrounds
- [ ] Replace button styling with gradient classes
- [ ] Add hover scale effects: `group-hover:scale-110 transition-transform`

### 7. Update Dashboard Header Component
**File:** `src/app/_components/DashboardContent.tsx` or similar
**Priority:** Medium

**Target pattern from template:**
- Gradient logo background
- Gradient text effect for app title
- Glass header with backdrop blur
- Serif typography for branding

**Actions:**
- [ ] Find/create dashboard header component
- [ ] Add gradient background to logo: `gradient-primary`
- [ ] Apply gradient text to title: `bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent`
- [ ] Use serif font for title: `font-serif font-black text-2xl`
- [ ] Add backdrop blur: `backdrop-blur-sm`

### 8. Update Progress Page Components
**Files:** Progress page components in `src/app/_components/`
**Priority:** Medium

**Target patterns from template:**
- Gradient page titles
- Enhanced card styling with gradients
- Chart color integration
- Time period selector styling

**Actions:**
- [ ] Update page title with gradient text effect
- [ ] Apply new card styling to progress components
- [ ] Update chart colors to use new token values
- [ ] Style time period buttons with primary color scheme

---

## PHASE 3: Cross-Platform & Testing

### 9. Update Mobile Design Tokens
**Files:** `apps/mobile/lib/design-tokens.ts`, `apps/mobile/tailwind.config.js`
**Priority:** Medium

**Actions:**
- [ ] Run `bun run tokens:mobile` to regenerate mobile tokens
- [ ] Verify mobile app components use updated color values
- [ ] Test NativeWind classes work with new tokens
- [ ] Update any hardcoded color values in mobile components

### 10. Test Theme Switching
**Files:** Theme provider and components
**Priority:** High

**Actions:**
- [ ] Test light/dark theme switching with new colors
- [ ] Verify contrast ratios meet WCAG 2.2 AA standards
- [ ] Test system theme detection works correctly
- [ ] Check all gradient utilities work in both themes

### 11. Accessibility Compliance Check
**Priority:** High

**Required contrast ratios for energetic fitness theme:**
- Normal text: 4.5:1 minimum (WCAG 2.2 AA compliance)
- Large text: 3:1 minimum  
- Interactive elements: 3:1 minimum
- Focus indicators: 3:1 minimum with clear visibility

**Specific accessibility actions for amber/orange palette:**
- [ ] Test primary amber (#d97706) contrast against white and cream backgrounds (target 4.5:1+)
- [ ] Test secondary golden (#f59e0b) against dark backgrounds in dark mode (target 4.5:1+)
- [ ] Verify orange accent (#f97316) provides sufficient contrast for interactive states
- [ ] Test chart color combinations for colorblind accessibility (avoid red/green only distinctions)
- [ ] Verify focus ring visibility with amber (#d97706) against all background colors
- [ ] Test reduced motion preferences work with gradient animations and transforms
- [ ] Validate that energetic colors don't trigger vestibular disorders or seizures

### 12. Update Workout Session Components
**Files:** Workout session page components
**Priority:** Low

**Actions:**
- [ ] Apply new design patterns to workout session page
- [ ] Update exercise logging components
- [ ] Apply gradient styling to workout controls
- [ ] Test mobile workout experience with new design

---

## Testing Checklist

Before completing migration:

- [ ] All pages render correctly in light theme
- [ ] All pages render correctly in dark theme  
- [ ] Mobile responsive design works on small screens
- [ ] Theme switching preserves user preference
- [ ] No console errors related to CSS variables
- [ ] Build process completes without errors
- [ ] Mobile app builds successfully with new tokens

## Rollback Plan

If issues arise:
1. Revert `src/styles/tokens/design-tokens.json` to previous version
2. Run `bun run tokens:build` to regenerate CSS
3. Commit changes to restore previous design

## Performance Notes

- New gradient utilities add minimal CSS overhead
- Token build process maintains same performance characteristics
- Mobile app static values ensure optimal runtime performance
- Backdrop blur effects require modern browser support (fallbacks included)

---

## Development Commands

```bash
# Regenerate all design tokens
bun run tokens:build

# Regenerate mobile tokens only  
bun run tokens:mobile

# Watch mode for development
bun run tokens:watch

# Test design token generation
bun test design-tokens.test.ts
```

---

**Migration Timeline Estimate:** 2-3 days for full implementation across all phases.
**Risk Level:** Medium - requires careful color testing for accessibility compliance.
**Dependencies:** Existing design token build system must remain functional.

---

## FINALIZED AND READY FOR IMPLEMENTATION

**CONFIRMED THEME DIRECTION:** Energetic Fitness Theme with Amber/Orange Palette

This migration plan has been finalized with the confirmed energetic fitness theme direction and is ready for immediate implementation by development agents. All color specifications match the template design in `/apps/template/app/globals.css`.

**Key Confirmed Colors:**
- Primary: #d97706 (Amber)
- Secondary: #f59e0b (Golden Yellow)  
- Accent: #f97316 (Orange)
- Background Light: #fefce8 (Cream)
- Background Dark: #0f172a (Dark Slate)

**Implementation Priority Order:**
1. **Phase 1 (Foundation)** - Essential for all other changes
2. **Phase 2 (Components)** - User-facing improvements  
3. **Phase 3 (Testing & Mobile)** - Cross-platform validation

**Ready for Development:** All tasks include specific file paths, code examples, and clear acceptance criteria. Agents can begin implementation immediately starting with Phase 1, Task 1.