# Gesture Controls Implementation

This document describes the gesture controls implemented for exercise cards in workout sessions.

## Features Implemented

### 1. Drag & Drop Reordering
- **Action**: Drag exercise cards up/down to reorder
- **Visual Feedback**: Card becomes semi-transparent and scaled down while dragging
- **Target Feedback**: Drop zones show purple border when dragged over
- **Auto-collapse**: Dragged exercise automatically collapses during drag
- **Supports**: Desktop (mouse) and mobile (touch)

### 2. Swipe to Bottom
- **Action**: Swipe exercise cards left or right to move to bottom of list
- **Behavior**: Automatically collapses the exercise and snaps back to center
- **Visual Feedback**: Card follows finger with opacity/scale changes during swipe
- **Physics**: Momentum-based animation with friction and velocity thresholds
- **Auto-reset**: Card immediately returns to normal position after triggering action
- **Stacking**: Multiple swiped exercises stack in order they were swiped (last swiped goes to bottom)

### 3. Combined Functionality
- Swiped exercises can be dragged back up using reordering
- Drag handles only show on non-swiped exercises in edit mode
- Both features disabled in read-only mode
- Section header appears to separate normal from swiped exercises

## Technical Implementation

### Files Created
- `src/hooks/use-swipe-gestures.ts` - Reusable swipe gesture hook
- `src/hooks/use-drag-reorder.ts` - Reusable drag & drop hook

### Components Modified
- `src/app/_components/exercise-card.tsx` - Added swipe & drag support
- `src/app/_components/workout-session.tsx` - Integrated both gesture systems

### Customization Settings

The swipe behavior can be customized via `SwipeSettings`:

```typescript
const swipeSettings: Partial<SwipeSettings> = {
  dismissThreshold: 120,    // Distance in pixels to trigger swipe-to-bottom
  velocityThreshold: 6,     // Speed threshold for momentum dismissal  
  friction: 0.93,           // Momentum decay (higher = slides further)
  minimumVelocity: 0.3,     // Minimum speed to start momentum animation
  framesPerSecond: 60,      // For velocity calculation
};
```

### Visual Feedback
- **Swiping**: Opacity and scale change based on swipe distance
- **Dragging**: Semi-transparent with scale reduction and shadow
- **Drop Zones**: Purple border and background tint
- **Section Separator**: Visual divider between normal and swiped exercises

## User Experience

### Expected Behavior
1. **Start Workout**: Exercises appear in template order, first expanded
2. **Swipe Exercise**: Swipe left/right → moves to bottom, collapses, shows in "Swiped Exercises" section
3. **Reorder**: Drag any exercise (including swiped ones) to new position
4. **Temporary Only**: Order resets on new session, not saved to database

### Accessibility
- Drag handles provide visual cue for draggable items
- Touch targets are appropriately sized
- Works with both mouse and touch input
- Smooth animations with proper easing curves

## Future Enhancements

Possible improvements:
1. Haptic feedback on mobile devices
2. Keyboard accessibility for drag & drop
3. Bulk operations (multi-select)
4. Customizable gesture directions
5. Audio feedback
6. Different swipe actions for different directions
