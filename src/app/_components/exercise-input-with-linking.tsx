"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { api } from "~/trpc/react";
import { ExerciseLinkPicker } from "./ExerciseLinkPicker";
import { useLocalStorage } from "~/hooks/use-local-storage";
import { Skeleton } from "~/components/ui/skeleton";

interface ExerciseInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
  style?: React.CSSProperties;
  templateExerciseId?: number; // For existing template exercises
}

type SearchData = {
  items: unknown[];
  nextCursor: string | null;
};

export function ExerciseInputWithLinking({
  value,
  onChange,
  placeholder,
  className,
  style,
  templateExerciseId,
}: ExerciseInputProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [linkingRejected, setLinkingRejected] = useState(false);

  // Check if this template exercise already has linking rejected
  const { data: isLinkingRejectedData } =
    api.exercises.isLinkingRejected.useQuery(
      { templateExerciseId: templateExerciseId! },
      { enabled: !!templateExerciseId },
    );

  // Initialize linkingRejected state for existing exercises.
  // Avoid infinite loops by only updating when value actually changes.
  useEffect(() => {
    if (
      typeof isLinkingRejectedData === "boolean" &&
      isLinkingRejectedData !== linkingRejected
    ) {
      setLinkingRejected(isLinkingRejectedData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLinkingRejectedData]);

  const rejectLinking = api.exercises.rejectLinking.useMutation({
    onSuccess: () => {
      setLinkingRejected(true);
    },
  });

  const handleRejectLinking = () => {
    if (templateExerciseId) {
      rejectLinking.mutate({ templateExerciseId });
    } else {
      setLinkingRejected(true);
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={className}
          style={style}
        />
        {!linkingRejected && (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="shrink-0 rounded px-2 py-1 text-xs transition-colors"
            style={{
              backgroundColor:
                "color-mix(in srgb, var(--foreground) 50%, transparent 50%)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor =
                "var(--color-primary-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--color-primary)";
            }}
            title="Link to existing exercise"
          >
            Link
          </button>
        )}
      </div>

      {linkingRejected && (
        <div
          className="mt-1 flex items-center gap-2 text-xs"
          style={{ color: "var(--color-warning)" }}
        >
          <span>🔗</span>
          <span>Not linked - will create as new exercise</span>
        </div>
      )}

      {!linkingRejected && (
        <div className="mt-1">
          <button
            type="button"
            onClick={handleRejectLinking}
            disabled={rejectLinking.isPending}
            className="text-xs transition-colors"
            style={{ color: "var(--color-text-muted)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--color-text-secondary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--color-text-muted)";
            }}
          >
            {rejectLinking.isPending ? "Saving..." : "Don’t link this exercise"}
          </button>
        </div>
      )}

      {/* When creating a new template, there is no templateExerciseId yet.
          To enable linking in the "new" form, we need a target id.
          Strategy: if no templateExerciseId, we create-or-get a master exercise first,
          but we cannot link until the template exercise exists on the server.
          So in the "new" workflow we simply allow searching and choosing a master,
          and we reflect the chosen name back into the input. The actual link
          will be created once the template is saved and the exercise records exist. */}
      {pickerOpen &&
        (templateExerciseId != null ? (
          <ExerciseLinkPicker
            open={pickerOpen}
            onClose={() => setPickerOpen(false)}
            templateExerciseId={templateExerciseId}
            currentName={value}
          />
        ) : (
          <InlineSearchFallback
            open={pickerOpen}
            onClose={() => setPickerOpen(false)}
            currentName={value}
            onChooseName={(name) => {
              onChange(name);
              setPickerOpen(false);
            }}
          />
        ))}
    </div>
  );
}

// Lightweight inline picker for "new" templates where templateExerciseId is not yet assigned.
// This does not link on the server; it only helps pick a consistent name without fuzzy popup.
function InlineSearchFallback({
  open,
  onClose,
  currentName,
  onChooseName,
}: {
  open: boolean;
  onClose: () => void;
  currentName: string;
  onChooseName: (name: string) => void;
}) {
  const [q, setQ] = useState(currentName);
  const [cursor, setCursor] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // localStorage cache for recent searches
  const [recentSearches, setRecentSearches] = useLocalStorage<string[]>(
    "exercise-search-recent",
    [],
  );

  const search = api.exercises.searchMaster.useQuery(
    { q, limit: 20, cursor: cursor || undefined },
    {
      enabled: open && q.trim().length > 0,
      staleTime: 10_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  );

  useEffect(() => {
    if (open) {
      setQ(currentName);
      setCursor(null);
      if (currentName.trim()) {
        setPending(true);
      }
      // Cancel any ongoing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    }
  }, [open, currentName]);

  // Debounce search when q changes (optimized to 150ms)
  useEffect(() => {
    if (!open || !q.trim()) return;
    setPending(true);
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const timeoutId = setTimeout(() => {
      void search.refetch().then(() => setPending(false));
    }, 150);
    return () => {
      clearTimeout(timeoutId);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, open]);

  const searchData = search.data as SearchData | undefined;
  const items = useMemo(() => searchData?.items ?? [], [searchData]);
  const canLoadMore = searchData?.nextCursor != null;

  // Update recent searches cache
  useEffect(() => {
    if (q.trim() && items.length > 0) {
      setRecentSearches((prev) => {
        const filtered = prev.filter((s) => s !== q);
        return [q, ...filtered].slice(0, 10); // Keep last 10 searches
      });
    }
  }, [items, q, setRecentSearches]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/20 p-4 dark:bg-white/20">
      <div
        className="w-full max-w-lg rounded-lg shadow-xl"
        style={{
          backgroundColor: "var(--color-bg-surface)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div
          className="flex items-center justify-between p-3"
          style={{
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          <div
            className="text-sm font-medium"
            style={{ color: "var(--color-text)" }}
          >
            Search exercises
          </div>
          <button
            onClick={onClose}
            className="rounded px-2 py-1 text-sm transition-colors"
            style={{ color: "var(--color-text-secondary)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--color-bg-surface)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            Close
          </button>
        </div>
        <div className="p-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search master exercises"
            className="w-full rounded-md px-3 py-2 text-sm outline-none"
            style={{
              backgroundColor: "var(--color-bg-surface)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text)",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--color-text-muted)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--color-border)";
            }}
          />
          <div
            className="mt-3 max-h-72 overflow-y-auto rounded"
            style={{
              border: "1px solid var(--color-border)",
            }}
          >
            {pending || search.isLoading ? (
              <div className="space-y-2 p-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3"
                  >
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </div>
            ) : search.isError ? (
              <div
                className="p-3 text-sm"
                style={{ color: "var(--color-destructive)" }}
              >
                Search failed: {search.error?.message || "Unknown error"}
              </div>
            ) : items.length === 0 ? (
              <div
                className="p-3 text-sm"
                style={{ color: "var(--color-text-muted)" }}
              >
                No results
              </div>
            ) : (
              <ul>
                {items.map((it: any) => (
                  <li
                    key={it.id}
                    className="flex items-center justify-between p-3 last:border-b-0"
                    style={{ borderBottom: "1px solid var(--color-border)" }}
                  >
                    <span
                      className="text-sm"
                      style={{ color: "var(--color-text)" }}
                    >
                      {it.name}
                    </span>
                    <button
                      onClick={() => onChooseName(it.name)}
                      className="rounded px-2 py-1 text-xs transition-colors"
                      style={{
                        backgroundColor: "var(--color-primary)",
                        color: "var(--btn-primary-fg)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor =
                          "var(--color-primary-hover)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor =
                          "var(--color-primary)";
                      }}
                    >
                      Use name
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {canLoadMore && (
            <div className="mt-2">
              <button
                onClick={() => {
                  const next = searchData?.nextCursor;
                  setCursor(next || null);
                  if (next) {
                    // Cancel previous request before loading more
                    if (abortControllerRef.current) {
                      abortControllerRef.current.abort();
                    }
                    abortControllerRef.current = new AbortController();
                    void search.refetch();
                  }
                }}
                className="w-full rounded px-3 py-2 text-sm transition-colors"
                style={{
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "var(--color-bg-surface)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                Load more
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
