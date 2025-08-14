# Android Mobile App Development Plan

## Architecture Strategy
- **Monorepo Structure**: Keep mobile in `apps/mobile/` with shared packages
- **Navigation**: Expo Router (file-based routing like Next.js)
- **UI Framework**: NativeWind (Tailwind for React Native)
- **Priority Features**: Template Management � Workout Session � WHOOP � Health/AI � Progress � Offline
- **Platform**: Android first, iOS later
- **Testing**: Internal via Expo Development Build

## Phase 1: Foundation (1-2 weeks)

### Monorepo & Architecture Setup
- [ ] Set up monorepo structure with shared packages
- [ ] Create `packages/shared-types` for common TypeScript definitions
- [ ] Create `packages/shared-utils` for business logic utilities
- [ ] Configure TypeScript paths and imports across packages

### Mobile App Foundation
- [ ] Install and configure Expo Router for file-based navigation
- [ ] Replace @rneui/themed with NativeWind for Tailwind styling
- [ ] Set up tRPC client in mobile app with React Query
- [ ] Configure React Query persistence for offline support
- [ ] Implement basic app navigation structure (tabs/stack)

### Authentication & Core Setup
- [ ] Verify Supabase auth integration works with new setup
- [ ] Create shared authentication hooks and utilities
- [ ] Set up proper TypeScript configuration across monorepo
- [ ] Create a login screen with Supabase auth which redirects to home screen on successful login

## Phase 2: Core Features (2-3 weeks)

### Template Management (Priority #1)
- [ ] Create templates list screen (`/templates`)
- [ ] Implement template creation screen (`/templates/new`)
- [ ] Add template editing screen (`/templates/[id]/edit`)
- [ ] Template CRUD operations with tRPC integration
- [ ] Template exercise management (add/remove/reorder)

### Workout Session Tracking (Priority #2)
- [ ] Start workout screen - select template
- [ ] Real-time workout session screen
- [ ] Exercise tracking with sets/reps/weight input
- [ ] RPE (Rate of Perceived Exertion) input
- [ ] Rest timer functionality
- [ ] Save/complete workout session

### Offline Capability (Priority #6)
- [ ] Implement offline queue system for mobile
- [ ] Data synchronization when connection restored
- [ ] Offline workout sessions with local storage
- [ ] Sync status indicators and conflict resolution

## Phase 3: Advanced Features (2-3 weeks)

### WHOOP Integration (Priority #3)
- [ ] OAuth flow setup for WHOOP API
- [ ] Connect/disconnect WHOOP account screens
- [ ] Display recovery data in workout context
- [ ] Show sleep data and readiness scores
- [ ] Integration with workout recommendations

### Health Advice/AI Features (Priority #4)
- [ ] Integrate AI health recommendations system
- [ ] Subjective wellness input screens
- [ ] AI-powered workout suggestions
- [ ] Health advice display in workout context
- [ ] Wellness tracking and history

### Progress/Analytics Dashboard (Priority #5)
- [ ] Statistics cards (total workouts, PRs, etc.)
- [ ] Progress charts and visualizations
- [ ] Personal records tracking and display
- [ ] Workout consistency analysis
- [ ] Strength progression tracking
- [ ] Volume analysis over time

## Phase 4: Polish & Deploy (1 week)

### Testing & Quality
- [ ] Unit tests for core functionality
- [ ] Integration tests for tRPC endpoints
- [ ] Manual testing on Android devices
- [ ] Performance profiling and optimizations
- [ ] Accessibility improvements

### Deployment Setup
- [ ] Set up Expo Development Build pipeline
- [ ] Configure internal testing distribution
- [ ] Set up CI/CD for mobile app builds
- [ ] Documentation for team testing procedures

### Final Polish
- [ ] UI/UX refinements and consistency
- [ ] Error handling and user feedback
- [ ] Loading states and skeleton screens
- [ ] App icon and splash screen
- [ ] Prepare for future iOS development

## Shared Code Opportunities

### 100% Shared
- tRPC API routers and endpoints
- Database schema (Drizzle ORM)
- Authentication logic (Supabase)
- Business logic utilities
- Type definitions and schemas

### Adaptable for Mobile
- React Query configurations
- Offline queue system
- Analytics/telemetry
- WHOOP integration logic
- AI/health advice algorithms

### Mobile-Specific
- Navigation components
- UI components (NativeWind vs web Tailwind)
- Platform-specific optimizations
- Mobile notifications (future)
- Camera/device integrations (future)

---

**Current Status**: Planning phase complete, ready to begin Phase 1 implementation.