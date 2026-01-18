"use client";

import { useEffect, useState } from "react";

interface RedirectCountdownProps {
  href: string;
  seconds?: number;
}

export function RedirectCountdown({
  href,
  seconds = 5,
}: RedirectCountdownProps) {
  const [count, setCount] = useState(seconds);

  useEffect(() => {
    if (count <= 0) {
      window.location.href = href;
      return;
    }

    const timer = setTimeout(() => {
      setCount(count - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [count, href]);

  return (
    <div className="text-muted-foreground text-center text-sm">
      Redirecting to {href} in {count} seconds...
    </div>
  );
}
