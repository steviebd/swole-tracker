# UI Refactor Plan: Mobile-to-Web Layout Adoption

## Overview
Refactor the web application to adopt the mobile app's layout patterns, focusing on simplicity, clarity, and mobile-first design principles.

## Phases

### Phase 1: Core Card Component Enhancement ✅ **COMPLETED**
**Status:** Completed  
**Assigned to:** Senior Engineer Agent

**Objectives:**
- Enhance the base Card component with mobile patterns
- Implement surface hierarchy and design tokens
- Add glass effects and interactive states
- Create compound components (CardHeader, CardContent, CardFooter)

**Files Modified/Created:**
- `src/app/_components/ui/Card.tsx` - Complete rewrite with mobile architecture ✅
- `src/lib/design-tokens.ts` - Create design tokens (new file) ✅
- `src/styles/globals.css` - Integrate design tokens ✅

**Acceptance Criteria:**
- [x] Card component supports surface hierarchy (app/surface/card/elevated)
- [x] Glass effects with backdrop blur implemented
- [x] Status-aware styling (success/warning/danger/info)
- [x] Interactive states with scale animations
- [x] Compound components for structured layouts
- [x] Design tokens properly integrated

**Implementation Summary:**
- Enhanced Card with 4-level surface hierarchy and glass effects
- Added status-aware styling (success/warning/danger/info)
- Implemented interactive states with scale animations
- Created compound components (CardHeader, CardContent, CardFooter)
- Maintained full backward compatibility
- Added comprehensive TypeScript types and JSDoc documentation

---

### Phase 2: Stats Cards Refactor ✅ **COMPLETED**
**Status:** Completed
**Assigned to:** Senior Engineer Agent

**Objectives:**
- Refactor StatsCards to use mobile single-column format
- Simplify information density
- Implement mobile-first responsive design
- Use enhanced Card component

**Files Modified:**
- `src/app/_components/StatsCards.tsx` - Complete mobile-first refactor ✅

**Acceptance Criteria:**
- [x] Single-column layout as default
- [x] Simplified card content (one metric per card)
- [x] Mobile-first responsive breakpoints
- [x] Uses enhanced Card component
- [x] Consistent spacing with design tokens

**Implementation Summary:**
- Refactored to single-column layout with mobile-first design
- Simplified card content with clear metric hierarchy
- Integrated enhanced Card component with surface hierarchy
- Applied design tokens for consistent spacing and colors
- Maintained all existing functionality and data calculations
- Improved accessibility and touch-friendly interactions

---

### Phase 3: Glass Header Implementation L **PENDING**
**Status:** Not Started

**Objectives:**
- Create reusable GlassHeader component
- Implement gradient backgrounds and glass effects
- Add horizontal action button groups
- Replace existing headers

**Files to Modify:**
- `src/app/_components/ui/GlassHeader.tsx` - New component
- `src/app/_components/HomePageHeader.tsx` - Refactor to use GlassHeader
- `src/app/workouts/page.tsx` - Update header

**Acceptance Criteria:**
- [ ] Reusable GlassHeader component created
- [ ] Gradient backgrounds with glass effects
- [ ] Horizontal action button groups
- [ ] Subtitle support
- [ ] Proper spacing and typography

---

### Phase 4: Home Page Layout Restructure L **PENDING**
**Status:** Not Started

**Objectives:**
- Restructure home page to mobile-inspired layout
- Implement single-column priority design
- Simplify dashboard content organization
- Add proper content areas

**Files to Modify:**
- `src/app/_components/DashboardContent.tsx`
- `src/app/_components/HomePageContent.tsx`
- `src/app/page.tsx`

**Acceptance Criteria:**
- [ ] Single-column card stack as primary layout
- [ ] Glass header implementation
- [ ] Simplified content organization
- [ ] Mobile-first responsive design
- [ ] Proper safe area handling

---

### Phase 5: Quick Action Cards Refactor L **PENDING**
**Status:** Not Started

**Objectives:**
- Refactor QuickActionCards to mobile format
- Implement touch-friendly interactions
- Simplify action presentation
- Use enhanced Card components

**Files to Modify:**
- `src/app/_components/QuickActionCards.tsx`

**Acceptance Criteria:**
- [ ] Mobile-inspired card layout
- [ ] Touch-friendly button sizing
- [ ] Simplified action presentation
- [ ] Enhanced Card component usage
- [ ] Consistent spacing

---

### Phase 6: Workout Pages Enhancement L **PENDING**
**Status:** Not Started

**Objectives:**
- Apply mobile layout patterns to workout pages
- Implement glass headers
- Simplify workout card layouts
- Add mobile-inspired navigation

**Files to Modify:**
- `src/app/workouts/page.tsx`
- `src/app/_components/workout-history.tsx`
- Workout session components

**Acceptance Criteria:**
- [ ] Glass header implementation
- [ ] Simplified workout card layouts
- [ ] Mobile-inspired navigation
- [ ] Single-column card stacks
- [ ] Touch-friendly interactions

---

### Phase 7: Progress Section Enhancement L **PENDING**
**Status:** Not Started

**Objectives:**
- Refactor WeeklyProgressSection to mobile format
- Implement simplified progress visualization
- Use enhanced Card components
- Mobile-first responsive design

**Files to Modify:**
- `src/app/_components/WeeklyProgressSection.tsx`
- Related progress components

**Acceptance Criteria:**
- [ ] Mobile-inspired progress cards
- [ ] Simplified visualization
- [ ] Enhanced Card component usage
- [ ] Single-column priority layout

---

### Phase 8: Testing & Polish L **PENDING**
**Status:** Not Started

**Objectives:**
- Comprehensive testing of all refactored components
- Performance optimization
- Accessibility improvements
- Cross-browser testing

**Tasks:**
- [ ] Run full test suite
- [ ] Performance testing
- [ ] Accessibility audit
- [ ] Cross-browser compatibility
- [ ] Mobile device testing

---

## Implementation Guidelines

### Design Principles
1. **Mobile-first approach** - Single-column layouts as default
2. **Progressive enhancement** - Add complexity for larger screens
3. **Touch-friendly interactions** - 44px minimum tap targets
4. **Glass effects** - Use backdrop blur and proper opacity
5. **Semantic spacing** - Use design tokens consistently
6. **Surface hierarchy** - Proper layering for dark themes

### Development Standards
- Run `bun check` before each phase completion
- Maintain TypeScript strict mode compliance
- Follow existing code conventions
- Test on multiple screen sizes
- Ensure accessibility standards

### Phase Completion Checklist
- [ ] All acceptance criteria met
- [ ] Tests passing (`bun test`)
- [ ] Linting passed (`bun lint`)
- [ ] Type checking passed (`bun typecheck`)
- [ ] Manual testing completed
- [ ] Phase marked as complete in this document

---

## Current Status: Ready to Begin Phase 1

**Next Action:** Implement Phase 1 with senior-engineer agent