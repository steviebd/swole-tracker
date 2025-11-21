"use client";

import * as React from "react";

type ToastVariant = "default" | "destructive";

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
}

type Action =
  | { type: "ADD_TOAST"; toast: Toast }
  | { type: "REMOVE_TOAST"; id: string }
  | { type: "UPDATE_TOAST"; id: string; toast: Partial<Toast> };

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
} as const;

let memoryState: ToastState = { toasts: [] };
const listeners: Array<(state: ToastState) => void> = [];

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => {
    listener(memoryState);
  });
}

function reducer(state: ToastState, action: Action): ToastState {
  switch (action.type) {
    case actionTypes.ADD_TOAST:
      return {
        ...state,
        toasts: [action.toast, ...state.toasts],
      };

    case actionTypes.UPDATE_TOAST:
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.id ? { ...t, ...action.toast } : t,
        ),
      };

    case actionTypes.REMOVE_TOAST:
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.id),
      };

    default:
      return state;
  }
}

let count = 0;

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

type ToasterToast = Toast & {
  id: string;
};

function toast({
  title,
  description,
  variant = "default",
  duration = 4000,
  ...props
}: Omit<Toast, "id">) {
  const id = genId();

  const update = (props: Partial<Toast>) =>
    dispatch({
      type: actionTypes.UPDATE_TOAST,
      id,
      toast: props,
    });

  const dismiss = () => dispatch({ type: actionTypes.REMOVE_TOAST, id });

  dispatch({
    type: actionTypes.ADD_TOAST,
    toast: {
      ...props,
      id,
      ...(title && { title }),
      ...(description && { description }),
      variant,
      duration,
    },
  });

  // Auto-dismiss after duration
  if (duration > 0) {
    setTimeout(() => {
      dismiss();
    }, duration);
  }

  return {
    id,
    dismiss,
    update,
  };
}

function useToast() {
  const [state, setState] = React.useState<ToastState>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, [state]);

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) =>
      dispatch({ type: actionTypes.REMOVE_TOAST, id: toastId ?? "" }),
  };
}

export { useToast, toast };
export type { ToasterToast };
