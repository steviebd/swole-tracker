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

  const dragThreshold = 5; // Minimum pixels to move before starting drag
  const hasDragStarted = useRef(false);
  const dragStartTime = useRef(0);
  const cardElements = useRef<(HTMLElement | null)[]>([]);

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
    
    for (let i = 0; i < cardElements.current.length; i++) {
      const element = cardElements.current[i];
      if (!element || i === excludeIndex) continue;
      
      const rect = element.getBoundingClientRect();
      const centerY = rect.top + rect.height / 2;
      
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

      // Start dragging only after moving beyond threshold
      if (!hasDragStarted.current && distance > dragThreshold) {
        hasDragStarted.current = true;
        setIsDragging(true);
        onStartDrag?.(draggedIndex);
      }

      if (hasDragStarted.current) {
        setDragOffset({ x: deltaX, y: deltaY });
        
        // Find insertion point (excluding the dragged element)
        const insertionIndex = findDropTarget(pos.x, pos.y, draggedIndex);
        setDragOverIndex(insertionIndex);
      }

      e.preventDefault();
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
