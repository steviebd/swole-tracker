# Mobile UI Implementation Plan

This document outlines the phased approach to implementing the design system across the mobile application, bringing it to parity with the web implementation.

**Priority Order**: Dark mode first → Login → Home Dashboard → Workout Sessions → Light mode polish

## Current State Analysis

- ✅ Design tokens generated and available
- ✅ NativeWind configured with token mappings
- ✅ Basic component structure exists
- ❌ Components use hardcoded colors instead of semantic tokens
- ❌ No theme awareness or dark mode support
- ❌ Inconsistent with web design patterns

## Phase 1: Dark Mode Foundation & Theme System (Week 1)

### 1.1 Mobile Theme Provider (Dark-First)
- [x] Create `components/providers/ThemeProvider.tsx` for mobile
- [x] Implement theme state management starting with dark as default
- [x] Add AsyncStorage for theme persistence
- [x] Create theme context and hook (`useTheme`)
- [x] Configure app to start in dark mode by default

### 1.2 Dark Theme Design Token Integration
- [x] Update `tailwind.config.js` with complete dark theme semantic colors
- [x] Map all OKLCH dark theme colors to NativeWind classes
- [x] Ensure glass effects and gradients work in dark mode
- [x] Test dark theme token generation pipeline

### 1.3 Dark Theme Utilities & Status Bar
- [x] Create dark-mode-first utility functions
- [x] Configure StatusBar for dark theme (light content)
- [x] Implement dynamic color utilities for dark backgrounds
- [x] Add dark theme splash screen configuration

**Deliverable**: Fully working dark theme system as default

## Phase 2: Dark Mode Core Components (Week 2)

### 2.1 Button Component - Dark Mode First
- [x] **BREAKING**: Remove all hardcoded colors from Button component
- [x] Implement dark theme variants using semantic tokens
- [x] Add glass effect variants for elevated dark buttons
- [x] Implement proper dark theme focus states and interactions
- [x] Update Button API to be theme-native (breaking changes OK)

### 2.2 Card Component - Dark Mode Redesign
- [x] **BREAKING**: Replace hardcoded `bg-white` with dark surface tokens
- [x] Implement dark surface hierarchy (app → surface → card)
- [x] Add dark theme glass effects for elevated cards
- [x] Implement dark shadow system using design tokens
- [x] Update Card API for better dark theme support

### 2.3 Input Component - Dark Mode Enhancement
- [x] **BREAKING**: Replace all hardcoded colors with dark theme tokens
- [x] Implement dark background and border colors
- [x] Add proper dark theme focus states with glass effects
- [x] Ensure placeholder text uses dark theme muted colors
- [x] Add dark theme validation states (success/warning/danger)

### 2.4 Typography System - Dark First
- [x] **BREAKING**: Update Text components for dark theme
- [x] Implement dark semantic text colors (primary/secondary/muted)
- [x] Add proper heading hierarchy for dark backgrounds
- [x] Ensure proper contrast ratios in dark mode

**Deliverable**: Core components optimized for dark theme

## Phase 3: Login Experience - Dark Mode (Week 3)

### 3.1 Login Screen Dark Mode Refactor
- [x] **BREAKING**: Replace all colors in `app/(auth)/login.tsx` with dark tokens
- [x] Implement dark background gradients and glass effects
- [x] Add proper dark surface hierarchy for auth form
- [x] Configure StatusBar for dark theme
- [x] Add dark theme loading states and animations

### 3.2 Auth Component Dark Mode Enhancement
- [x] **BREAKING**: Update Auth component for dark theme
- [x] Implement glass card effect optimized for dark backgrounds
- [x] Add dark theme semantic text colors
- [x] Ensure form validation uses dark theme status colors
- [x] Add dark theme micro-interactions and feedback

### 3.3 Auth Flow Polish
- [x] Add dark theme success/error states
- [x] Implement dark theme email verification screens
- [x] Add proper dark theme keyboard handling
- [x] Test auth flow end-to-end in dark mode

**Deliverable**: Production-ready dark theme login experience

## Phase 4: Home Dashboard - Dark Mode (Week 4)

### 4.1 Tab Navigation Dark Theme
- [x] **BREAKING**: Update tab bar for dark theme design tokens
- [x] Implement dark active/inactive tab styling with glass effects
- [x] Add proper dark theme tab icons and labels
- [x] Ensure tab bar follows dark surface hierarchy

### 4.2 Home Screen Dark Mode Refactor (`app/(tabs)/index.tsx`)
- [x] **BREAKING**: Replace all hardcoded colors with dark semantic tokens
- [x] Implement dark header styling with glass effects and gradients
- [x] Update action buttons to use dark theme variants
- [x] Add dark theme loading and empty states
- [x] Implement full glass effects for elevated elements

### 4.3 Templates List Dark Theme
- [ ] **BREAKING**: Refactor TemplatesList for dark theme tokens
- [ ] Implement dark card hierarchy for template items with glass effects
- [ ] Add dark theme icons and proper text contrast
- [ ] Implement dark theme touch feedback and interactions

### 4.4 Dashboard Polish
- [ ] Add dark theme dashboard animations and transitions
- [ ] Implement dark theme pull-to-refresh styling
- [ ] Add proper dark theme search/filter components
- [ ] Test complete dashboard flow in dark mode

**Deliverable**: Production-ready dark theme home dashboard

## Phase 5: Workout Sessions - Dark Mode (Week 5)

### 5.1 Workout Session Screen Dark Mode
- [ ] **BREAKING**: Refactor `app/workout/[id].tsx` for dark theme
- [ ] Update WorkoutSessionView with dark theme glass effects
- [ ] Implement dark theme error states with proper danger tokens
- [ ] Add dark theme action buttons and proper icon contrast

### 5.2 Workout Components Dark Theme
- [ ] **BREAKING**: Update ExerciseCard for dark theme with glass effects
- [ ] Refactor RPESelector with dark theme design tokens
- [ ] Implement RestTimer with dark surface styling and animations
- [ ] Update SetInputRow for dark theme form hierarchy

### 5.3 Workout Flow Polish
- [ ] Add dark theme workout progression indicators
- [ ] Implement dark theme success/completion states
- [ ] Add proper dark theme modal styling with glass effects
- [ ] Test complete workout flow in dark mode

**Deliverable**: Complete dark theme workout experience

## Phase 6: Templates & Advanced Features - Dark Mode (Week 6)

### 6.1 Template Management Dark Theme
- [ ] **BREAKING**: Update `app/templates/new.tsx` for dark theme
- [ ] Refactor TemplateForm with dark theme glass effects
- [ ] Implement dark theme form validation styling
- [ ] Add dark theme template editing capabilities

### 6.2 Advanced UI Elements Dark Theme
- [ ] Implement dark theme modals with full glass effects
- [ ] Add dark theme loading indicators and skeletons
- [ ] Create dark theme chart components using chart tokens
- [ ] Add dark theme confirmation dialogs and alerts

### 6.3 Exercise Management Dark Theme
- [ ] Update ExerciseList for dark theme
- [ ] Implement dark theme exercise creation/editing
- [ ] Add dark theme exercise type indicators
- [ ] Ensure proper dark theme search and filtering

**Deliverable**: Complete dark theme feature set

## Phase 7: Light Mode Implementation (Week 7)

### 7.1 Light Mode Token Integration
- [ ] Add light theme color overrides to tailwind.config.js
- [ ] Test light theme token generation pipeline
- [ ] Implement light theme StatusBar configuration
- [ ] Add light theme splash screen support

### 7.2 Light Mode Component Updates
- [ ] Update all components to support light theme variants
- [ ] Implement light theme glass effects and gradients
- [ ] Add proper light theme shadows and elevations
- [ ] Test all components in light mode

### 7.3 Theme Switching & Polish
- [ ] Implement smooth theme switching animations
- [ ] Add theme toggle UI component
- [ ] Test system theme following functionality
- [ ] Polish theme transitions and micro-interactions

### 7.4 Final Polish & Testing
- [ ] Complete accessibility testing for both themes
- [ ] Performance optimization for theme switches
- [ ] Cross-platform testing (iOS/Android)
- [ ] Final visual polish and consistency checks

**Deliverable**: Complete dual-theme mobile app with polished experience

## Implementation Guidelines

### Dark-First Development Standards
```tsx
// ❌ Don't use hardcoded colors
<View className="bg-gray-100 border-gray-300">

// ✅ Use dark theme semantic tokens (primary approach)
<View className="bg-background border-border-default">

// ✅ Use design token constants for complex dark styling
backgroundColor: DesignTokens.colors.background.surface
```

### Breaking Changes Philosophy
```tsx
// ✅ Breaking changes are encouraged for better design system
// Old Button API
<Button variant="primary" color="blue" />

// New dark-optimized Button API  
<Button variant="primary" style="glass" elevation="md" />
```

### Dark Theme Glass Effects
```tsx
// ✅ Implement full glass effects for dark theme
<View className="bg-glass-card border-glass-border backdrop-blur-md">
  <Text className="text-text-primary">Glass effect content</Text>
</View>
```

### Priority Implementation Order
```
1. Dark Mode Foundation → 2. Login → 3. Home → 4. Workout → 5. Light Mode
```

## Testing Strategy (Dark-First)

### Dark Theme Testing Priority
- [ ] Test all components in dark mode FIRST
- [ ] Test glass effects and gradients in dark theme
- [ ] Test dark theme animations and transitions
- [ ] Verify dark theme accessibility and contrast
- [ ] Test light mode compatibility later

### Component Testing (Breaking Changes OK)
- [ ] Visual regression testing for dark theme components
- [ ] Test component API changes don't break existing usage
- [ ] Performance testing with glass effects enabled
- [ ] Cross-platform testing (iOS/Android dark themes)

## Success Criteria (Updated)

1. **Dark Mode Excellence**: Outstanding dark theme experience matching web
2. **Glass Effects**: Full implementation of glass design language on mobile
3. **Login → Home → Workout Flow**: Priority pages work perfectly in dark mode
4. **Breaking Changes**: Clean, modern component APIs that support design system
5. **Performance**: Smooth glass effects and animations on mobile devices
6. **Visual Consistency**: Mobile dark theme matches or exceeds web quality

## Resolved Implementation Questions

1. ✅ **Theme Priority**: Dark mode first, light mode at the end
2. ✅ **Component Strategy**: Update existing components in place  
3. ✅ **Breaking Changes**: Good and encouraged for better design system
4. ✅ **Glass Effects**: Fully implemented to match web exactly
5. ✅ **Critical Path**: Login → Home Dashboard → Workout Sessions

## Dependencies

- Design token build system must be working
- NativeWind configuration must be correct
- Theme provider implementation completed before component work
- Testing framework should be set up for visual regression testing

---

*This plan can be adjusted based on priorities and feedback. Each phase builds on the previous one, ensuring a systematic approach to design system implementation.*