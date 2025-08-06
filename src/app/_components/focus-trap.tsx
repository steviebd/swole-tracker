"use client";

import React, { useEffect, useLayoutEffect, useRef } from "react";

/**
 * Focus utilities for modals:
 * - FocusTrap: traps tab focus within its subtree, closes on Escape, prevents background scroll optionally.
 * - useReturnFocus: capture the trigger element and restore focus on unmount.
 *
 * Usage:
 *   const { triggerRef, restoreFocus } = useReturnFocus();
 *   useEffect(() => () => restoreFocus(), [restoreFocus]);
 *   return (
 *     <FocusTrap onEscape={onClose} preventScroll>
 *       <div tabIndex={-1} ref={initialFocusRef}> ... </div>
 *     </FocusTrap>
 *   )
 */

/** Returns the list of focusable elements inside a container in tab order. */
function getFocusable(container: HTMLElement | null): HTMLElement[] {
  if (!container) return [];
  const selectors = [
    "a[href]",
    "button:not([disabled])",
    "textarea:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "[tabindex]:not([tabindex='-1'])",
    "[contenteditable='true']",
  ];
  const list = Array.from(container.querySelectorAll<HTMLElement>(selectors.join(",")));
  // Only include visible, focusable
  return list.filter((el) => {
    const style = window.getComputedStyle(el);
    if (style.visibility === "hidden" || style.display === "none") return false;
    if (el.hasAttribute("disabled")) return false;
    return true;
  });
}

type FocusTrapProps = {
  children: React.ReactNode;
  onEscape?: () => void;
  /** If provided, the element to move focus to on mount; default is first focusable. */
  initialFocusRef?: React.RefObject<HTMLElement>;
  /** Prevent background scroll while mounted. */
  preventScroll?: boolean;
};

/**
 * FocusTrap: traps tab focus within its subtree and closes via Escape.
 * Must be mounted inside a portal/container that overlays the page.
 */
export function FocusTrap({ children, onEscape, initialFocusRef, preventScroll }: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // On mount, move focus into the dialog
  useLayoutEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    // Prevent background scroll if requested
    let originalOverflow: string | null = null;
    if (preventScroll && typeof document !== "undefined") {
      originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }

    // Move focus
    const target = initialFocusRef?.current ?? getFocusable(root)[0];
    if (target && typeof target.focus === "function") {
      try {
        target.focus();
      } catch {
        // ignore
      }
    }

    return () => {
      if (preventScroll && typeof document !== "undefined" && originalOverflow !== null) {
        document.body.style.overflow = originalOverflow;
      }
    };
  }, [initialFocusRef, preventScroll]);

  // Handle Tab/Shift+Tab inside the trap
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (onEscape) {
          e.stopPropagation();
          e.preventDefault();
          onEscape();
        }
        return;
      }

      if (e.key !== "Tab") return;

      const focusables = getFocusable(root);
      if (focusables.length === 0) {
        // Prevent focus from escaping; keep focus on root
        e.preventDefault();
        (root as HTMLElement).focus?.();
        return;
      }

      const current = document.activeElement as HTMLElement | null;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (!e.shiftKey) {
        // Tab
        if (!current || (last && current === last)) {
          e.preventDefault();
          if (first) first.focus();
        }
      } else {
        // Shift + Tab
        if (!current || (first && current === first)) {
          e.preventDefault();
          if (last) last.focus();
        }
      }
    };

    root.addEventListener("keydown", handleKeyDown);
    return () => {
      root.removeEventListener("keydown", handleKeyDown);
    };
  }, [onEscape]);

  return (
    <div ref={containerRef} tabIndex={-1}>
      {children}
    </div>
  );
}

/**
 * useReturnFocus:
 * - Call before opening a modal to remember the currently focused element.
 * - When the modal unmounts, call restoreFocus() to return focus to the trigger (if still in DOM).
 */
export function useReturnFocus() {
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    try {
      const active = document.activeElement as HTMLElement | null;
      if (active) {
        triggerRef.current = active;
      }
    } catch {
      // ignore
    }
  }, []);

  const restoreFocus = () => {
    try {
      const el = triggerRef.current;
      if (el && typeof el.focus === "function") {
        el.focus();
      }
    } catch {
      // ignore
    }
  };

  return { triggerRef, restoreFocus };
}
