"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "~/trpc/react";

type Item = {
  id: number;
  name: string;
  normalizedName: string;
  createdAt: Date;
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
  // Use a concrete number for query param; null is represented as 0 (first page)
  // Cursor is always a number; never undefined
  // Cursor can be nullable in tRPC input; keep local state as number but coerce when calling
  // Keep cursor strictly a number
  // Keep as number and never undefined
  // Keep as number; never undefined
  // Keep cursor strictly numeric
  // Keep cursor strictly numeric (never undefined)
  // Keep as number and never undefined
  // Keep cursor as a concrete number and never undefined
  // keep cursor always a concrete number; never undefined
  const [cursor, setCursor] = useState<number>(0);
  // Ensure nextCursor is treated as a number; coerce undefined/null to 0
  const [items, setItems] = useState<Item[]>([]);
  const [isExactMatch, setIsExactMatch] = useState<Item | null>(null);
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Provide a concrete type for the query input so cursor is correctly typed
  // tRPC type may infer cursor as number | undefined; coerce to number by defaulting to 0
  // Use the generated RouterInputs type to ensure correct input shape
  // Force the cursor to be a number literal to satisfy strict inference
  // Ensure the query input is fully concrete to satisfy strict types
  // Ensure cursor is always a number for the query input
  // searchMaster expects a numeric cursor; ensure a concrete number
  // Ensure the query input always passes a concrete number for cursor
  // Pass a concrete number for cursor to satisfy strict types
  // Pass a concrete number for cursor; avoid unnecessary assertions
  // Ensure the query input always passes a concrete number for cursor
  // Always pass a concrete number for cursor; coerce defensively
  // Explicitly type the input object so cursor is a required number
  // Force a concrete number for cursor to satisfy strict types
  // Ensure cursor is always a number literal for the query input
  // Ensure concrete number for cursor to satisfy zod schema (defaults to 0)
  // Narrow the input type so cursor is required number even if the generated type made it optional due to .default()
  // Avoid RouterInputs widening and enforce concrete number inline without extra casts
  // Inline cast only on the cursor property to satisfy generated input type that may allow undefined due to zod default
  // Ensure the input matches the generated hook signature exactly; avoid any widening to undefined
  // Explicitly coerce cursor to a definite number to satisfy generated types
  // Note: the query input type may allow cursor to be number | undefined due to zod defaults.
  // We always pass a concrete number to satisfy strict typing.
  // Compute a fully concrete, strictly typed cursor value and avoid widening in hook params
  const cursorValue = Number.isFinite(cursor) ? cursor : 0;
  // Define a concrete input shape to avoid any widening of 'cursor'
  const search = api.exercises.searchMaster.useQuery(
    { q, limit: 20, cursor: cursorValue ?? 0 },
    {
      enabled: open && q.trim().length > 0,
      staleTime: 10_000,
    },
  );

  // Focus input on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
      setQ(currentName);
      setCursor(0);
      setItems([]);
      setIsExactMatch(null);
    }
  }, [open, currentName]);

  // Debounce q changes
  useEffect(() => {
    if (!open) return;
    setPending(true);
    const t = setTimeout(() => {
      setCursor(0);
      void search.refetch().then(() => setPending(false));
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // Merge page results
  useEffect(() => {
    if (!search.data) return;
    const page = search.data.items as Item[];
    const merged =
      cursor === 0
        ? page
        : [...items, ...page.filter((p) => !items.some((i) => i.id === p.id))];
    setItems(merged);

    // compute exact normalized match
    const normalizedInput = normalize(q);
    const exact = merged.find((i) => normalize(i.name) === normalizedInput);
    setIsExactMatch(exact ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.data]);

  const canLoadMore = useMemo(
    () => typeof search.data?.nextCursor === "number",
    [search.data?.nextCursor],
  );

  function loadMore() {
    if (!canLoadMore) return;
    const next = search.data?.nextCursor ?? 0;
    const safe = Number.isFinite(next) ? next : 0;
    setCursor(safe);
    if (safe !== 0) {
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
      className="fixed inset-0 z-40 flex items-start justify-center bg-black/40 p-4"
      onKeyDown={onKeyDown}
    >
      <div className="w-full max-w-lg rounded-lg border border-border bg-background shadow-xl">
        <div className="flex items-center justify-between border-b border-border p-3">
          <div className="text-sm font-medium text-foreground">Link exercise</div>
          <button
            onClick={onClose}
            className="rounded px-2 py-1 text-sm text-secondary hover:bg-muted"
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
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-[color:var(--color-primary)]"
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

          <div className="mt-3 max-h-72 overflow-y-auto rounded border border-border">
            {pending && items.length === 0 ? (
              <div className="p-3 text-sm text-gray-400">Searching…</div>
            ) : items.length === 0 ? (
              <div className="p-3 text-sm text-gray-400">No results</div>
            ) : (
              <ul>
                {items.map((it) => (
                  <li
                    key={it.id}
                    className="flex items-center justify-between border-b border-border p-3 last:border-b-0"
                  >
                    <span className="text-sm text-foreground">{it.name}</span>
                    <button
                      onClick={() => handleLink(it.id)}
                      className="rounded bg-blue-600 px-2 py-1 text-xs text-background hover:bg-blue-700 disabled:opacity-50"
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
                className="w-full rounded border border-border px-3 py-2 text-sm text-foreground hover:bg-muted"
              >
                Load more
              </button>
            </div>
          )}

          <div className="mt-3 flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
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
