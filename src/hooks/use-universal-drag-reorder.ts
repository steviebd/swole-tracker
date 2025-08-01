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
  onPointerDown: (index: number) => (e: React.PointerEvent | React.MouseEvent | React.TouchEvent) => void;
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

  const dragThreshold = 3; // Minimum pixels to move before starting drag (reduced for more responsive feel)
  const hasDragStarted = useRef(false);
  const dragStartTime = useRef(0);
  const cardElements = useRef<(HTMLElement | null)[]>([]);
  const animationFrameRef = useRef<number | undefined>(undefined);

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

  const onPointerDown = useCallback(
    (index: number) => (e: React.PointerEvent | React.MouseEvent | React.TouchEvent) => {
      // Prevent dragging when clicking on interactive elements
      const target = e.target as HTMLElement;
      if (target.closest('button') || target.closest('input') || target.closest('select')) {
        return;
      }

      const pos = getPointerPos(e);
      setDragStartPos(pos);
      setDraggedIndex(index);
      dragStartTime.current = Date.now();
      hasDragStarted.current = false;

      // Prevent default to avoid text selection or scrolling
      e.preventDefault();
    },
    []
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent | React.MouseEvent | React.TouchEvent) => {
      if (draggedIndex === null) return;

      const pos = getPointerPos(e);
      const deltaX = pos.x - dragStartPos.x;
      const deltaY = pos.y - dragStartPos.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // Start dragging with more lenient conditions for smoother feel
      if (!hasDragStarted.current && distance > dragThreshold) {
        // Allow drag to start if there's any vertical component (not strictly vertical)
        // This prevents sticking when movement isn't perfectly vertical
        const hasVerticalComponent = Math.abs(deltaY) >= dragThreshold * 0.7;
        
        if (hasVerticalComponent) {
          hasDragStarted.current = true;
          setIsDragging(true);
          onStartDrag?.(draggedIndex);
        }
      }

      if (hasDragStarted.current) {
        // Use requestAnimationFrame for smooth 60fps updates
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        
        animationFrameRef.current = requestAnimationFrame(() => {
          setDragOffset({ x: deltaX, y: deltaY });
          
          // Throttle drop target detection to improve performance
          // Only update drop target every few pixels of movement
          const shouldUpdateDropTarget = Math.abs(deltaY) % 8 < 4; // Update roughly every 8px
          if (shouldUpdateDropTarget) {
            const insertionIndex = findDropTarget(pos.x, pos.y, draggedIndex);
            setDragOverIndex(insertionIndex);
          }
        });
        
        e.preventDefault(); // Only prevent default when actually dragging
      }
    },
    [draggedIndex, dragStartPos, findDropTarget, onStartDrag]
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
      
      // Clean up animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
      }
      
      onEndDrag?.();

      e.preventDefault();
    },
    [draggedIndex, dragOverIndex, items, onReorder, onEndDrag]
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
