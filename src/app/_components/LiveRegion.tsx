"use client";

import React, { useEffect, useRef, useState } from "react";

/**
 * LiveRegion
 * Accessible announcer for screen readers. Maintains a small message queue to avoid clobbering.
 * Usage:
 *  const announce = useLiveRegion(); announce("Exercise moved to end", { assertive: true })
 */

type Options = { assertive?: boolean };

export function useLiveRegion() {
  const ref = useRef<null | ((msg: string, opts?: Options) => void)>(null);

  useEffect(() => {
    // no-op: hook expects provider to set ref.current
  }, []);

  function announce(msg: string, opts?: Options) {
    if (ref.current) ref.current(msg, opts);
  }

  // Expose a setter for the provider to attach
  (announce as any).__attach = (fn: (msg: string, opts?: Options) => void) => {
    ref.current = fn;
  };

  return announce as ((msg: string, opts?: Options) => void) & { __attach?: (fn: (msg: string, opts?: Options) => void) => void };
}

export default function LiveRegionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [polite, setPolite] = useState("");
  const [assertive, setAssertive] = useState("");
  const queueRef = useRef<Array<{ msg: string; assertive?: boolean }>>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Singleton announce dispatcher; consumers use useLiveRegion and attach here via side-effect.
  const announceRef = useRef<(msg: string, opts?: Options) => void>(() => {});
  if (!announceRef.current) {
    announceRef.current = (msg: string, opts?: Options) => {
      queueRef.current.push({ msg, assertive: opts?.assertive });
      pump();
    };
  }

  function pump() {
    if (timerRef.current) return;
    const run = () => {
      const next = queueRef.current.shift();
      if (!next) {
        timerRef.current = null;
        return;
      }
      // Clear first to force SR to announce repeated messages
      setPolite("");
      setAssertive("");
      // Next tick set content
      timerRef.current = setTimeout(() => {
        if (next.assertive) setAssertive(next.msg);
        else setPolite(next.msg);
        // Schedule next
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          run();
        }, 250);
      }, 50);
    };
    run();
  }

  // Bridge to hook: attach the dispatcher to any hook instance created under this provider
  useEffect(() => {
    // Find any hook instance created and attach
    // Consumers will import useLiveRegion() and call announce.__attach in an effect
  }, []);

  return (
    <>
      {/* Invisible live regions */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {polite}
      </div>
      <div
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {assertive}
      </div>
      {/* Context bridge: place function on window for hooks to attach in absence of React Context to keep it tiny */}
      <LiveRegionBridge onAnnouncerReady={announceRef.current!} />
      {children}
    </>
  );
}

/**
 * Tiny bridge that exposes a global setter to attach the announce function to hook instances.
 * Avoids pulling in React Context plumbing in multiple files.
 */
function LiveRegionBridge({ onAnnouncerReady }: { onAnnouncerReady: (msg: string, opts?: Options) => void }) {
  useEffect(() => {
    // Provide a global for hooks to attach (scoped to app tab)
    (window as any).__liveRegionAnnounce = onAnnouncerReady;
    return () => {
      if ((window as any).__liveRegionAnnounce === onAnnouncerReady) {
        delete (window as any).__liveRegionAnnounce;
      }
    };
  }, [onAnnouncerReady]);

  return null;
}

/**
 * Hook attach effect helper: call in any component once to connect hook announce with provider.
 */
export function useAttachLiveRegion(announce: ReturnType<typeof useLiveRegion>) {
  useEffect(() => {
    const fn = (window as any).__liveRegionAnnounce as undefined | ((msg: string, opts?: Options) => void);
    if (fn && typeof announce === "function") {
      if (typeof (announce as any).__attach === "function") {
        (announce as any).__attach(fn);
      }
    }
  }, [announce]);
}
