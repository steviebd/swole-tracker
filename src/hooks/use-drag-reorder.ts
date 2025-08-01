"use client";

import { useState, useRef, useCallback } from "react";

export interface DragReorderState {
  draggedIndex: number | null;
  dragOverIndex: number | null;
  isDragging: boolean;
  dragOffset: { x: number; y: number };
}

export interface DragReorderHandlers {
  onDragStart: (index: number) => (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDragOver: (index: number) => (e: React.DragEvent) => void;
  onDrop: (index: number) => (e: React.DragEvent) => void;
  onDragEnter: (index: number) => (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
}

export function useDragReorder<T>(
  items: T[],
  onReorder: (newItems: T[]) => void,
  onStartDrag?: (index: number) => void,
  onEndDrag?: () => void
): [DragReorderState, DragReorderHandlers] {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const dragStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const onDragStart = useCallback(
    (index: number) => (e: React.DragEvent) => {
      setDraggedIndex(index);
      setIsDragging(true);
      dragStartPosRef.current = { x: e.clientX, y: e.clientY };
      
      // Set drag image to be invisible so we can control the visual feedback
      const img = new Image();
      img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=';
      e.dataTransfer.setDragImage(img, 0, 0);
      
      // Set the data for the drag operation
      e.dataTransfer.setData('text/plain', index.toString());
      e.dataTransfer.effectAllowed = 'move';

      onStartDrag?.(index);
    },
    [onStartDrag]
  );

  const onDragEnd = useCallback(
    (e: React.DragEvent) => {
      setDraggedIndex(null);
      setDragOverIndex(null);
      setIsDragging(false);
      setDragOffset({ x: 0, y: 0 });
      onEndDrag?.();
    },
    [onEndDrag]
  );

  const onDragOver = useCallback(
    (index: number) => (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      
      // Update drag offset for visual feedback
      const deltaX = e.clientX - dragStartPosRef.current.x;
      const deltaY = e.clientY - dragStartPosRef.current.y;
      setDragOffset({ x: deltaX, y: deltaY });
      
      if (draggedIndex !== null && index !== draggedIndex) {
        setDragOverIndex(index);
      }
    },
    [draggedIndex]
  );

  const onDrop = useCallback(
    (index: number) => (e: React.DragEvent) => {
      e.preventDefault();
      
      if (draggedIndex !== null && draggedIndex !== index) {
        const newItems = [...items];
        const draggedItem = newItems[draggedIndex];
        
        if (draggedItem) {
          // Remove the dragged item
          newItems.splice(draggedIndex, 1);
          
          // Insert at the new position
          const targetIndex = draggedIndex < index ? index - 1 : index;
          newItems.splice(targetIndex, 0, draggedItem);
          
          onReorder(newItems);
        }
      }
      
      setDraggedIndex(null);
      setDragOverIndex(null);
      setIsDragging(false);
      setDragOffset({ x: 0, y: 0 });
    },
    [draggedIndex, items, onReorder]
  );

  const onDragEnter = useCallback(
    (index: number) => (e: React.DragEvent) => {
      e.preventDefault();
      if (draggedIndex !== null && index !== draggedIndex) {
        setDragOverIndex(index);
      }
    },
    [draggedIndex]
  );

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    // Only clear drag over index if we're really leaving the drop zone
    // (not just moving to a child element)
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverIndex(null);
    }
  }, []);

  const state: DragReorderState = {
    draggedIndex,
    dragOverIndex,
    isDragging,
    dragOffset,
  };

  const handlers: DragReorderHandlers = {
    onDragStart,
    onDragEnd,
    onDragOver,
    onDrop,
    onDragEnter,
    onDragLeave,
  };

  return [state, handlers];
}
