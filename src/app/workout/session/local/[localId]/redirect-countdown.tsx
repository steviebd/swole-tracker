"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface RedirectCountdownProps {
  href: string;
  seconds?: number;
}

export function RedirectCountdown({
  href,
  seconds = 5,
}: RedirectCountdownProps) {
  const router = useRouter();
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setRemaining((current) => {
        if (current <= 1) {
          window.clearInterval(interval);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    const timeout = window.setTimeout(() => {
      router.replace(href);
    }, seconds * 1000);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [href, router, seconds]);

  return (
    <p
      role="status"
      aria-live="polite"
      className="text-muted-foreground mt-6 text-sm"
    >
      Redirecting to your workout history in {remaining} second
      {remaining === 1 ? "" : "s"}.
    </p>
  );
}
