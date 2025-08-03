"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export interface UniversalDragState {
  draggedIndex: number | null;
  dragOverIndex: number | null;
  isDragging: boolean;
  dragOffset: { x: number; y: number };
  dragStartPos: { x: number; y: number };
}

export interface UniversalDragHandlers {
  onPointerDown: (index: number, opts?: { force?: boolean }) => (e: React.PointerEvent | React.MouseEvent | React.TouchEvent) => void;
  onPointerMove: (e: React.PointerEvent | React.MouseEvent | React.TouchEvent) => void;
  onPointerUp: (e: React.PointerEvent | React.MouseEvent | React.TouchEvent) => void;
  setCardElement: (index: number, element: HTMLElement | null) => void;
}

export function useUniversalDragReorder<T>(
  items: T[],
  onReorder: (newItems: T[]) => void,
  onStartDrag?: (index: number) => void,
  onEndDrag?: () => void
): [UniversalDragState, UniversalDragHandlers] {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });

  // Gesture tuning constants (mobile-first)
  const DRAG_START_SLOP = 14; // require more movement before drag starts
  const AXIS_LOCK_Y_RATIO = 0.75; // vertical must dominate to start drag
  const REORDER_CROSS_TOLERANCE_PX = 14; // extra tolerance before switching targets
  const AUTOSCROLL_ZONE = 50; // px from viewport edge to start auto-scroll
  const AUTOSCROLL_MAX_PX_PER_FRAME = 6; // slow, controlled auto-scroll

  const hasDragStarted = useRef(false);
  const dragStartTime = useRef(0);
  const axisLockedToY = useRef(false);
  const lastInsertionIndexRef = useRef<number | null>(null);
  const cardElements = useRef<(HTMLElement | null)[]>([]);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const autoScrollRef = useRef<number | undefined>(undefined);
  const scrollSpeed = useRef(0);
  const initialScrollY = useRef(0);
  const currentScrollY = useRef(0);

  // Get pointer position from different event types
  const getPointerPos = (e: React.PointerEvent | React.MouseEvent | React.TouchEvent | PointerEvent | MouseEvent | TouchEvent) => {
    if ('touches' in e && e.touches.length > 0) {
      return { x: e.touches[0]!.clientX, y: e.touches[0]!.clientY };
    }
    return { x: (e as any).clientX, y: (e as any).clientY };
  };

  // Find the insertion point based on pointer position
  const findDropTarget = useCallback((x: number, y: number, excludeIndex?: number) => {
    let insertionIndex = 0;
    let closestDistance = Infinity;
    let closestIndex = 0;
    
    for (let i = 0; i < cardElements.current.length; i++) {
      const element = cardElements.current[i];
      if (!element || i === excludeIndex) continue;
      
      const rect = element.getBoundingClientRect();
      const centerY = rect.top + rect.height / 2;
      const distance = Math.abs(y - centerY);
      
      // Track the closest element for fallback
      if (x >= rect.left && x <= rect.right && distance < closestDistance) {
        closestDistance = distance;
        closestIndex = i;
      }
      
      // If the pointer is within horizontal bounds and above the center of this card
      if (x >= rect.left && x <= rect.right && y < centerY) {
        // We want to insert before this card
        return i;
      }
      
      // If we're past this card, the insertion point is after it
      if (x >= rect.left && x <= rect.right) {
        insertionIndex = i + 1;
      }
    }
    
    // If we're between elements or in a gap, use the closest element as reference
    if (closestDistance < Infinity) {
      const closestElement = cardElements.current[closestIndex];
      if (closestElement) {
        const rect = closestElement.getBoundingClientRect();
        const centerY = rect.top + rect.height / 2;
        // If we're below the closest element, insert after it
        return y >= centerY ? closestIndex + 1 : closestIndex;
      }
    }
    
    return insertionIndex;
  }, []);

  // Auto-scroll when dragging near viewport edges
  const handleAutoScroll = useCallback((clientY: number) => {
    const viewportHeight = window.innerHeight;

    let newScrollSpeed = 0;

    // Top zone
    if (clientY < AUTOSCROLL_ZONE) {
      const dist = AUTOSCROLL_ZONE - clientY;
      const ratio = Math.max(0, Math.min(1, dist / AUTOSCROLL_ZONE));
      // Ease-in curve for precision control
      const eased = Math.pow(ratio, 1.2);
      newScrollSpeed = -Math.max(0, Math.round(eased * AUTOSCROLL_MAX_PX_PER_FRAME));
    }
    // Bottom zone
    else if (clientY > viewportHeight - AUTOSCROLL_ZONE) {
      const dist = clientY - (viewportHeight - AUTOSCROLL_ZONE);
      const ratio = Math.max(0, Math.min(1, dist / AUTOSCROLL_ZONE));
      const eased = Math.pow(ratio, 1.2);
      newScrollSpeed = Math.max(0, Math.round(eased * AUTOSCROLL_MAX_PX_PER_FRAME));
    }

    scrollSpeed.current = newScrollSpeed;

    if (newScrollSpeed !== 0 && !autoScrollRef.current) {
      const scroll = () => {
        if (scrollSpeed.current !== 0) {
          window.scrollBy(0, scrollSpeed.current);
          currentScrollY.current = window.scrollY;
          autoScrollRef.current = requestAnimationFrame(scroll);
        } else {
          autoScrollRef.current = undefined;
        }
      };
      autoScrollRef.current = requestAnimationFrame(scroll);
    } else if (newScrollSpeed === 0 && autoScrollRef.current) {
      cancelAnimationFrame(autoScrollRef.current);
      autoScrollRef.current = undefined;
    }
  }, []);

  // Stop auto-scroll
  const stopAutoScroll = useCallback(() => {
    scrollSpeed.current = 0;
    if (autoScrollRef.current) {
      cancelAnimationFrame(autoScrollRef.current);
      autoScrollRef.current = undefined;
    }
  }, []);

  const onPointerDown = useCallback(
    (index: number, opts?: { force?: boolean }) => (e: React.PointerEvent | React.MouseEvent | React.TouchEvent) => {
      // Prevent dragging when clicking on interactive elements (except explicit drag handles)
      const target = e.target as HTMLElement;
      const isHandle = !!target.closest('[data-drag-handle="true"]');
      if (!isHandle && (target.closest('button') || target.closest('input') || target.closest('select'))) {
        return;
      }

      // iOS/Safari robustness: attempt to capture pointer if available
      const anyEvent = e as any;
      const currentTarget = anyEvent.currentTarget as any;
      if ('pointerId' in anyEvent && typeof currentTarget?.setPointerCapture === 'function') {
        try {
          currentTarget.setPointerCapture(anyEvent.pointerId as number);
        } catch {
          // ignore capture errors
        }
      }

      const pos = getPointerPos(e);
      setDragStartPos(pos);
      setDraggedIndex(index);
      dragStartTime.current = Date.now();
      axisLockedToY.current = false;
      lastInsertionIndexRef.current = null;

      // If initiated from the drag handle and force requested, start immediately with vertical lock
      if (opts?.force || isHandle) {
        hasDragStarted.current = true;
        axisLockedToY.current = true;
        setIsDragging(true);
        onStartDrag?.(index);
      } else {
        hasDragStarted.current = false;
      }

      // Capture initial scroll position for offset calculations
      initialScrollY.current = window.scrollY;
      currentScrollY.current = window.scrollY;

      // Do not call preventDefault here; rely on CSS touch-action to manage scrolling behavior.
    },
    [onStartDrag]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent | React.MouseEvent | React.TouchEvent) => {
      if (draggedIndex === null) return;

      const pos = getPointerPos(e);
      const deltaX = pos.x - dragStartPos.x;
      const deltaY = pos.y - dragStartPos.y;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // Axis lock & start slop
      if (!hasDragStarted.current) {
        if (distance < DRAG_START_SLOP) {
          return; // allow normal scroll/swipe
        }
        // Lock to Y if vertical dominates
        if (absY >= absX * AXIS_LOCK_Y_RATIO) {
          axisLockedToY.current = true;
          hasDragStarted.current = true;
          setIsDragging(true);
          onStartDrag?.(draggedIndex);
        } else {
          // Horizontal dominates – do not start vertical drag
          return;
        }
      }

      if (hasDragStarted.current && axisLockedToY.current) {
        // Use requestAnimationFrame for smooth 60fps updates
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }

        animationFrameRef.current = requestAnimationFrame(() => {
          // Update current scroll position (for manual scrolling during drag)
          currentScrollY.current = window.scrollY;

          // Calculate drag offset accounting for scroll changes
          const scrollDelta = currentScrollY.current - initialScrollY.current;
          const adjustedDeltaY = deltaY + scrollDelta;

          setDragOffset({ x: 0, y: adjustedDeltaY }); // lock X to 0 during vertical drag

          // Handle auto-scroll when near viewport edges
          handleAutoScroll(pos.y);

          // Throttle drop target detection to improve performance
          const shouldUpdateDropTarget = Math.abs(adjustedDeltaY) % 8 < 4;
          if (shouldUpdateDropTarget) {
            const insertionIndex = findDropTarget(pos.x, pos.y, draggedIndex);

            // Apply tolerance to reduce jitter/flicker
            if (lastInsertionIndexRef.current === null || insertionIndex !== lastInsertionIndexRef.current) {
              // Only switch if pointer moved past tolerance relative to previous target
              let allowSwitch = true;
              if (lastInsertionIndexRef.current !== null) {
                const prevEl = cardElements.current[Math.min(Math.max(lastInsertionIndexRef.current, 0), cardElements.current.length - 1)];
                if (prevEl) {
                  const rect = prevEl.getBoundingClientRect();
                  const centerY = rect.top + rect.height / 2;
                  if (Math.abs(pos.y - centerY) < REORDER_CROSS_TOLERANCE_PX) {
                    allowSwitch = false;
                  }
                }
              }
              if (allowSwitch) {
                lastInsertionIndexRef.current = insertionIndex;
                setDragOverIndex(insertionIndex);
              }
            }
          }
        });

        // Do not call preventDefault here; React may attach touch listeners as passive.
        // Use CSS (e.g., 'touch-none') on the draggable element while dragging to prevent scroll.
      }
    },
    [draggedIndex, dragStartPos, findDropTarget, onStartDrag, handleAutoScroll]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent | React.MouseEvent | React.TouchEvent) => {
      if (draggedIndex === null) return;

      if (hasDragStarted.current && dragOverIndex !== null && dragOverIndex !== draggedIndex) {
        // Perform reorder
        const newItems = [...items];
        const draggedItem = newItems[draggedIndex];
        
        if (draggedItem) {
          // Remove the dragged item first
          newItems.splice(draggedIndex, 1);
          
          // Calculate the correct insertion point after removal
          // If we're moving to a position after where we removed the item, adjust by -1
          const adjustedInsertionIndex = dragOverIndex > draggedIndex ? dragOverIndex - 1 : dragOverIndex;
          
          // Insert at the calculated position
          newItems.splice(adjustedInsertionIndex, 0, draggedItem);
          
          onReorder(newItems);
        }
      }

      // Reset state
      setDraggedIndex(null);
      setDragOverIndex(null);
      setIsDragging(false);
      setDragOffset({ x: 0, y: 0 });
      setDragStartPos({ x: 0, y: 0 });
      hasDragStarted.current = false;
      
      // Clean up animation frame and auto-scroll
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
      }
      stopAutoScroll();
      
      onEndDrag?.();

      // Do not call preventDefault on pointer/touch end.
    },
    [draggedIndex, dragOverIndex, items, onReorder, onEndDrag, stopAutoScroll]
  );

  // Global pointer move and up handlers
  useEffect(() => {
    if (draggedIndex === null) return;

    const handlePointerMove = (e: PointerEvent | MouseEvent | TouchEvent) => {
      onPointerMove(e as any);
    };

    const handlePointerUp = (e: PointerEvent | MouseEvent | TouchEvent) => {
      onPointerUp(e as any);
    };

    // Add listeners to document to capture events outside the element
    document.addEventListener('pointermove', handlePointerMove, { passive: false });
    document.addEventListener('pointerup', handlePointerUp, { passive: false });
    document.addEventListener('mousemove', handlePointerMove, { passive: false });
    document.addEventListener('mouseup', handlePointerUp, { passive: false });
    document.addEventListener('touchmove', handlePointerMove, { passive: false });
    document.addEventListener('touchend', handlePointerUp, { passive: false });

    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('mousemove', handlePointerMove);
      document.removeEventListener('mouseup', handlePointerUp);
      document.removeEventListener('touchmove', handlePointerMove);
      document.removeEventListener('touchend', handlePointerUp);
    };
  }, [draggedIndex, onPointerMove, onPointerUp]);

  // Store card element references
  const setCardElement = useCallback((index: number, element: HTMLElement | null) => {
    cardElements.current[index] = element;
  }, []);

  const state: UniversalDragState = {
    draggedIndex,
    dragOverIndex,
    isDragging,
    dragOffset,
    dragStartPos,
  };

  const handlers: UniversalDragHandlers = {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    setCardElement,
  };

  return [state, handlers];
}
