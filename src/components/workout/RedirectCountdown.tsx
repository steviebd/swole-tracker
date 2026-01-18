"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

export interface RedirectCountdownProps {
  href: string;
  seconds?: number;
  onCancel?: () => void;
  className?: string;
}

export function RedirectCountdown({
  href,
  seconds = 5,
  onCancel,
  className,
}: RedirectCountdownProps) {
  const router = useRouter();
  const [count, setCount] = useState(seconds);
  const [isCancelled, setIsCancelled] = useState(false);

  const handleCancel = useCallback(() => {
    setIsCancelled(true);
    onCancel?.();
  }, [onCancel]);

  useEffect(() => {
    if (isCancelled || count <= 0) return;

    const timer = setInterval(() => {
      setCount((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [count, isCancelled]);

  useEffect(() => {
    if (!isCancelled && count <= 0) {
      router.navigate({ to: href });
    }
  }, [count, href, isCancelled, router]);

  if (isCancelled) {
    return (
      <div className={cn("py-4 text-center", className)}>
        <p className="text-muted-foreground mb-4">
          Redirect cancelled. Choose an action below:
        </p>
        <div className="flex justify-center gap-3">
          <Button variant="outline" onClick={() => setIsCancelled(false)}>
            Resume Countdown
          </Button>
          <Button
            variant="default"
            onClick={() => router.navigate({ to: href })}
          >
            Go Now
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("py-4 text-center", className)}>
      <p className="text-muted-foreground mb-4">
        Redirecting to <span className="font-medium">{href}</span> in{" "}
        <span className="text-foreground font-bold">{count}</span> second
        {count !== 1 ? "s" : ""}...
      </p>
      <Button variant="ghost" size="sm" onClick={handleCancel}>
        Cancel
      </Button>
    </div>
  );
}
