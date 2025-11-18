"use client";

import { useToast } from "~/hooks/use-toast";
import { Toast, type ToastType } from "~/components/ui/toast";

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <>
      {toasts.map((toastItem) => {
        // Map variant to toast type
        const type: ToastType = toastItem.variant === "destructive" ? "destructive" : "default";

        return (
          <Toast
            key={toastItem.id}
            open={true}
            type={type}
            title={toastItem.title}
            description={toastItem.description}
            onClose={() => dismiss(toastItem.id)}
          />
        );
      })}
    </>
  );
}
