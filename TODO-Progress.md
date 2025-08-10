# View Progress Feature - Implementation Plan

## 📋 Overview
Transform the View Progress card from basic workout history to a comprehensive progress dashboard focused on strength gains, volume tracking, and consistency metrics.

## 🎯 Priority Order
1. **Strength Gains** (Top Sets) - Most Important
2. **Volume Tracking** - Secondary 
3. **Consistency** - Third
4. **Recent Achievements/PRs** - Motivational
5. **WHOOP Integration** - Placeholder for future

## 📊 Core Implementation Tasks

### Phase 1: Data Layer & API Endpoints ✅
- [ ] Create progress analytics tRPC router (`src/server/api/routers/progress.ts`)
- [ ] Implement strength progression queries (top sets by exercise over time)
- [ ] Build volume calculation queries (total weight moved, sets, reps)
- [ ] Add consistency stats queries (workout frequency, streaks)
- [ ] Create personal records tracking queries
- [ ] Add comparative analysis helpers (current vs previous periods)

### Phase 2: Main Dashboard Layout ✅
- [ ] Replace `/workouts` page with progress dashboard (now `/progress`)
- [ ] Create progress dashboard container component (`ProgressDashboard.tsx`)
- [ ] Add time range selector (monthly/yearly/weekly with monthly default)
- [ ] Implement quick summary cards section
- [ ] Add navigation breadcrumbs and back button

### Phase 3: Strength Progression Section ✅
- [ ] Create `StrengthProgressSection.tsx` component
- [ ] Build top set progression charts using existing chart infrastructure
- [ ] Add exercise-level progress tracking with exercise linking
- [ ] Implement 1RM estimation displays
- [ ] Add comparative analysis (current vs previous period)
- [ ] Create drill-down modal for detailed strength analysis (`StrengthAnalysisModal.tsx`)

### Phase 4: Volume Tracking Section ✅
- [ ] Create `VolumeTrackingSection.tsx` component
- [ ] Build total volume calculations and visualizations
- [ ] Add volume by exercise breakdown charts
- [ ] Implement progressive overload trend analysis
- [ ] Create set/rep distribution analytics
- [ ] Add volume drill-down modal

### Phase 5: Consistency Section
- [ ] Create `ConsistencySection.tsx` component  
- [ ] Build workout frequency calendar visualization
- [ ] Implement streak tracking (current + longest streak)
- [ ] Add 3x/week target tracking with progress indicators
- [ ] Create consistency score calculations
- [ ] Build consistency trends over time

### Phase 6: Personal Records System
- [ ] Create `PersonalRecordsSection.tsx` component
- [ ] Implement PR detection logic (weight + volume PRs)
- [ ] Build recent achievements timeline
- [ ] Add PR milestone celebrations/notifications
- [ ] Create PR history tracking

### Phase 7: Recent Achievements Dashboard
- [ ] Create `RecentAchievements.tsx` summary component
- [ ] Build "This Month's Progress" summary cards
- [ ] Add recent PRs highlight section  
- [ ] Implement motivational progress indicators
- [ ] Create achievement badges/icons

### Phase 8: WHOOP Integration Placeholder
- [ ] Create `WhoopIntegrationSection.tsx` placeholder component
- [ ] Add recovery score overlay mockup
- [ ] Implement heart rate zones placeholder
- [ ] Create performance correlation placeholder charts
- [ ] Add integration status indicator

### Phase 9: Drill-Down Modals
- [ ] Create `StrengthAnalysisModal.tsx` for detailed strength metrics
- [ ] Build `VolumeAnalysisModal.tsx` for deep volume analysis  
- [ ] Implement `ConsistencyAnalysisModal.tsx` for consistency details
- [ ] Add `PRHistoryModal.tsx` for full PR timeline
- [ ] Create modal state management and navigation

### Phase 10: UI/UX Polish & Testing
- [ ] Add loading states for all progress sections
- [ ] Implement error handling and empty states
- [ ] Add responsive design for mobile/tablet
- [ ] Create smooth transitions and animations
- [ ] Add accessibility improvements
- [ ] Write unit tests for progress calculations
- [ ] Add integration tests for dashboard components

## 🔧 Technical Notes

### Data Structure Utilization
- Leverage `sessionExercises` table for workout data
- Use `exerciseLinks` and `masterExercises` for exercise consolidation
- Utilize `workoutSessions` for consistency tracking
- Access `userPreferences.min_days_per_week` for consistency targets

### Existing Chart Infrastructure
- Extend `WeightProgressChart.tsx` for strength progression
- Reuse `OneRMProgressChart.tsx` for 1RM estimations  
- Build new volume charts using `BaseChart` component
- Follow existing chart validation and sanitization patterns

### Time Range Implementation
- Default to monthly view
- Support weekly/yearly toggles
- Implement comparative analysis (current vs previous period)
- Handle timezone considerations for consistency tracking

### Performance Considerations
- Implement data pagination for large datasets
- Cache frequently accessed progress calculations
- Optimize database queries with proper indexing
- Use React Query for efficient data fetching

## 🎨 Design Consistency
- Follow existing component patterns and styling
- Use consistent color schemes from chart config
- Maintain mobile-first responsive design
- Apply existing theme system (light/dark modes)
- Follow accessibility standards

## 🧪 Testing Strategy
- Unit tests for all calculation functions
- Integration tests for tRPC endpoints
- Component testing for UI interactions
- E2E tests for complete user workflows
- Performance testing for data-heavy operations

---

### 🔧 Route Rename & 1RM Integration (Completed)
- [x] Rename `/workouts` route to `/progress` for better clarity
- [x] Update all internal links and navigation references
- [x] Update middleware protection and authentication routes  
- [x] Update documentation and README references

### 🔧 1RM Integration (Completed)
- [x] Add estimated_one_rm_factor field to userPreferences schema  
- [x] Update progress router to use user's 1RM calculation preference
- [x] Update StrengthProgressSection to use configurable 1RM calculation
- [x] Update chart utilities to accept 1RM formula parameter
- [x] Modified OneRMProgressChart to preserve user's preferred calculation

**Implementation Progress: 29/40+ tasks completed**

*This document will be updated as tasks are completed.*