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
  const [cursor, setCursor] = useState<number>(0);
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
      linkToMaster.mutate({ templateExerciseId, masterExerciseId: master.id });
    },
  });

  // Provide a concrete type for the query input so cursor is correctly typed
  // tRPC type may infer cursor as number | undefined; coerce to number by defaulting to 0
  // Use the generated RouterInputs type to ensure correct input shape
  // Force the cursor to be a number literal to satisfy strict inference
  // Ensure the query input is fully concrete to satisfy strict types
  const search = api.exercises.searchMaster.useQuery(
    { q, limit: 20, cursor: cursor ?? 0 } as { q: string; limit: number; cursor: number },
    { enabled: open && q.trim().length > 0, staleTime: 10_000 },
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

  const canLoadMore = useMemo(() => search.data?.nextCursor !== undefined && search.data?.nextCursor !== null, [search.data?.nextCursor]);

  function loadMore() {
    if (!canLoadMore) return;
    const next = search.data?.nextCursor ?? 0;
    setCursor(next);
    if (next !== 0) {
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
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/40 p-4" onKeyDown={onKeyDown}>
      <div className="w-full max-w-lg rounded-lg border border-gray-700 bg-gray-900 shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-700 p-3">
          <div className="text-sm font-medium text-gray-200">Link exercise</div>
          <button
            onClick={onClose}
            className="rounded px-2 py-1 text-sm text-gray-300 hover:bg-gray-700"
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
            className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm outline-none placeholder:text-gray-500 focus:border-gray-500"
          />
          {isExactMatch && (
            <div className="mt-2 rounded border border-green-700 bg-green-900/20 p-2 text-xs text-green-300">
              Exact match found: “{isExactMatch.name}”
              <button
                onClick={() => handleLink(isExactMatch.id)}
                className="ml-2 rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700"
              >
                Link to exact
              </button>
            </div>
          )}

          <div className="mt-3 max-h-72 overflow-y-auto rounded border border-gray-700">
            {pending && items.length === 0 ? (
              <div className="p-3 text-sm text-gray-400">Searching…</div>
            ) : items.length === 0 ? (
              <div className="p-3 text-sm text-gray-400">No results</div>
            ) : (
              <ul>
                {items.map((it) => (
                  <li
                    key={it.id}
                    className="flex items-center justify-between border-b border-gray-800 p-3 last:border-b-0"
                  >
                    <span className="text-sm text-gray-200">{it.name}</span>
                    <button
                      onClick={() => handleLink(it.id)}
                      className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
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
                className="w-full rounded border border-gray-700 px-3 py-2 text-sm text-gray-200 hover:bg-gray-800"
              >
                Load more
              </button>
            </div>
          )}

          <div className="mt-3 flex items-center justify-between">
            <div className="text-xs text-gray-400">
              Can't find it? Create a new master exercise and link.
            </div>
            <button
              onClick={handleCreateAndLink}
              className="rounded bg-gray-700 px-3 py-1 text-xs text-gray-100 hover:bg-gray-600 disabled:opacity-50"
              disabled={createOrGetMaster.isPending || q.trim().length === 0}
            >
              {createOrGetMaster.isPending ? "Creating…" : `Create “${q.trim()}”`}
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
