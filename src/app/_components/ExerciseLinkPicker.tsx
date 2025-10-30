"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "~/trpc/react";
import { useLocalStorage } from "~/hooks/use-local-storage";
import { Skeleton } from "~/components/ui/skeleton";

type Item = {
  id: number;
  name: string;
  normalizedName: string;
  createdAt: string;
};

interface ExerciseLinkPickerProps {
  open: boolean;
  onClose: () => void;
  templateExerciseId: number;
  currentName: string;
}

export function ExerciseLinkPicker({
  open,
  onClose,
  templateExerciseId,
  currentName,
}: ExerciseLinkPickerProps) {
  const [q, setQ] = useState(currentName);
  // Cursor is now a string for cursor-based pagination
  const [cursor, setCursor] = useState<string | null>(null);
  // Ensure nextCursor is treated as a number; coerce undefined/null to 0
  const [items, setItems] = useState<Item[]>([]);
  const [isExactMatch, setIsExactMatch] = useState<Item | null>(null);
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // localStorage cache for recent searches
  const [recentSearches, setRecentSearches] = useLocalStorage<string[]>(
    "exercise-search-recent",
    []
  );

  const linkToMaster = api.exercises.linkToMaster.useMutation({
    onSuccess: () => {
      onClose();
    },
  });

  const createOrGetMaster = api.exercises.createOrGetMaster.useMutation({
    onSuccess: (master) => {
      // Ensure both IDs are concrete numbers; avoid any accidental widening to undefined
      const masterId = Number(master.id);
      const tmplId = Number(templateExerciseId);
      linkToMaster.mutate({
        templateExerciseId: tmplId,
        masterExerciseId: masterId,
      });
    },
  });

  // searchMaster now uses cursor-based pagination with string cursors
  const search = api.exercises.searchMaster.useQuery(
    { q, limit: 20, cursor: cursor || undefined },
    {
      enabled: open && q.trim().length > 0,
      staleTime: 10_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  );

  // Focus input on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
      setQ(currentName);
      setCursor(null);
      setItems([]);
      setIsExactMatch(null);
      // Cancel any ongoing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    }
  }, [open, currentName]);

  // Debounce q changes (optimized to 150ms)
  useEffect(() => {
    if (!open) return;
    setPending(true);
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const t = setTimeout(() => {
      setCursor(null);
      void search.refetch().then(() => setPending(false));
    }, 150);
    return () => {
      clearTimeout(t);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // Merge page results and update recent searches
  useEffect(() => {
    if (!search.data) return;
    const page = search.data.items as Item[];
    const merged =
      cursor === null
        ? page
        : [...items, ...page.filter((p) => !items.some((i) => i.id === p.id))];
    setItems(merged);

    // compute exact normalized match
    const normalizedInput = normalize(q);
    const exact = merged.find((i) => normalize(i.name) === normalizedInput);
    setIsExactMatch(exact ?? null);

    // Update recent searches cache
    if (q.trim() && merged.length > 0) {
      setRecentSearches((prev) => {
        const filtered = prev.filter((s) => s !== q);
        return [q, ...filtered].slice(0, 10); // Keep last 10 searches
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.data]);

  const canLoadMore = useMemo(
    () => typeof search.data?.nextCursor === "number",
    [search.data?.nextCursor],
  );

  function loadMore() {
    if (!canLoadMore) return;
    const next = search.data?.nextCursor;
    setCursor(next || null);
    if (next) {
      // Cancel previous request before loading more
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      void search.refetch();
    }
  }

  function handleCreateAndLink() {
    createOrGetMaster.mutate({ name: q.trim() });
  }

  function handleLink(masterId: number) {
    linkToMaster.mutate({ templateExerciseId, masterExerciseId: masterId });
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") onClose();
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
      onKeyDown={onKeyDown}
    >
      <div className="border-border bg-background w-full max-w-lg rounded-lg border shadow-xl">
        <div className="border-border flex items-center justify-between border-b p-3">
          <div className="text-foreground text-sm font-medium">
            Link exercise
          </div>
          <button
            onClick={onClose}
            className="text-secondary hover:bg-muted rounded px-2 py-1 text-sm"
          >
            Close
          </button>
        </div>

        <div className="p-3">
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search master exercises"
            className="border-border bg-background placeholder:text-muted-foreground w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-[color:var(--color-primary)]"
          />
          {isExactMatch && (
            <div className="mt-2 rounded border border-[var(--color-success)] bg-[var(--color-success-muted)] p-2 text-xs text-[var(--color-success)]">
              Exact match found: “{isExactMatch.name}”
              <button
                onClick={() => handleLink(isExactMatch.id)}
                className="ml-2 rounded bg-[var(--color-success)] px-2 py-1 text-xs text-white hover:bg-[var(--color-success)]/80"
              >
                Link to exact
              </button>
            </div>
          )}

          <div className="border-border mt-3 max-h-72 overflow-y-auto rounded border">
            {pending && items.length === 0 ? (
              <div className="space-y-2 p-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-3">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-6 w-12" />
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="p-3 text-sm text-gray-400">No results</div>
            ) : (
              <ul>
                {items.map((it) => (
                  <li
                    key={it.id}
                    className="border-border flex items-center justify-between border-b p-3 last:border-b-0"
                  >
                    <span className="text-foreground text-sm">{it.name}</span>
                    <button
                      onClick={() => handleLink(it.id)}
                      className="text-background rounded bg-blue-600 px-2 py-1 text-xs hover:bg-blue-700 disabled:opacity-50"
                      disabled={linkToMaster.isPending}
                    >
                      {linkToMaster.isPending ? "Linking…" : "Link"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {canLoadMore && (
            <div className="mt-2">
              <button
                onClick={loadMore}
                className="border-border text-foreground hover:bg-muted w-full rounded border px-3 py-2 text-sm"
              >
                Load more
              </button>
            </div>
          )}

          <div className="mt-3 flex items-center justify-between">
            <div className="text-muted-foreground text-xs">
              Can't find it? Create a new master exercise and link.
            </div>
            <button
              onClick={handleCreateAndLink}
              className="btn-secondary px-3 py-1 text-xs disabled:opacity-50"
              disabled={createOrGetMaster.isPending || q.trim().length === 0}
            >
              {createOrGetMaster.isPending
                ? "Creating…"
                : `Create “${q.trim()}”`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function normalize(s: string) {
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}
