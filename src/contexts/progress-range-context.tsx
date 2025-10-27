"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { ProgressTimeRange } from "~/lib/time-range";

export type ProgressSectionKey =
  | "overview"
  | "strength"
  | "consistency"
  | "readiness"
  | "wellness"
  | "whoop";

type RangeMap = Record<ProgressSectionKey, ProgressTimeRange>;

const RANGE_DEFAULTS: RangeMap = {
  overview: "month",
  strength: "year",
  consistency: "month",
  readiness: "week",
  wellness: "month",
  whoop: "week",
};

interface ProgressRangeContextValue {
  ranges: RangeMap;
  defaults: RangeMap;
  setRange: (key: ProgressSectionKey, range: ProgressTimeRange) => void;
  resetRange: (key: ProgressSectionKey) => void;
  resetAll: () => void;
}

const ProgressRangeContext = createContext<ProgressRangeContextValue | null>(
  null,
);

export function ProgressRangeProvider({
  children,
  defaults,
}: {
  children: ReactNode;
  defaults?: Partial<RangeMap>;
}) {
  const mergedDefaults = useMemo<RangeMap>(() => {
    return {
      ...RANGE_DEFAULTS,
      ...defaults,
    };
  }, [defaults]);

  const [ranges, setRanges] = useState<RangeMap>(mergedDefaults);

  const setRange = useCallback(
    (key: ProgressSectionKey, range: ProgressTimeRange) => {
      setRanges((prev) => {
        if (prev[key] === range) return prev;
        return { ...prev, [key]: range };
      });
    },
    [],
  );

  const resetRange = useCallback(
    (key: ProgressSectionKey) => {
      setRanges((prev) => {
        const fallback = mergedDefaults[key] ?? RANGE_DEFAULTS[key];
        if (prev[key] === fallback) return prev;
        return { ...prev, [key]: fallback };
      });
    },
    [mergedDefaults],
  );

  const resetAll = useCallback(() => {
    setRanges(mergedDefaults);
  }, [mergedDefaults]);

  const value = useMemo(
    () => ({
      ranges,
      defaults: mergedDefaults,
      setRange,
      resetRange,
      resetAll,
    }),
    [ranges, mergedDefaults, resetAll, resetRange, setRange],
  );

  return (
    <ProgressRangeContext.Provider value={value}>
      {children}
    </ProgressRangeContext.Provider>
  );
}

export function useProgressRange(section: ProgressSectionKey) {
  const context = useContext(ProgressRangeContext);
  if (!context) {
    throw new Error(
      "useProgressRange must be used within a ProgressRangeProvider",
    );
  }

  return {
    range: context.ranges[section] ?? context.defaults[section],
    defaultValue: context.defaults[section],
    setRange: (value: ProgressTimeRange) => context.setRange(section, value),
    reset: () => context.resetRange(section),
  };
}

export function useProgressRangeActions() {
  const context = useContext(ProgressRangeContext);
  if (!context) {
    throw new Error(
      "useProgressRangeActions must be used within a ProgressRangeProvider",
    );
  }

  return {
    resetAll: context.resetAll,
  };
}
