"use client";

import { useEffect, useState } from "react";
import { api } from "~/trpc/react";
import { ExerciseLinkPicker } from "./ExerciseLinkPicker";

interface ExerciseInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
  templateExerciseId?: number; // For existing template exercises
}

export function ExerciseInputWithLinking({
  value,
  onChange,
  placeholder,
  className,
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
        />
        {!linkingRejected && (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="shrink-0 rounded border border-blue-700 bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
            title="Link to existing exercise"
          >
            Link
          </button>
        )}
      </div>

      {linkingRejected && (
        <div className="mt-1 flex items-center gap-2 text-xs text-orange-400">
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
            className="text-xs text-gray-400 hover:text-gray-300"
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
  const [cursor, setCursor] = useState<number | null>(0);
  const search = api.exercises.searchMaster.useQuery(
    { q, limit: 20, cursor: cursor ?? 0 },
    { enabled: open && q.trim().length > 0, staleTime: 10_000 },
  );

  useEffect(() => {
    if (open) {
      setQ(currentName);
      setCursor(0);
    }
  }, [open, currentName]);

  const items = search.data?.items ?? [];
  const canLoadMore = search.data?.nextCursor != null;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-lg border border-gray-700 bg-gray-900 shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-700 p-3">
          <div className="text-sm font-medium text-gray-200">
            Search exercises
          </div>
          <button
            onClick={onClose}
            className="rounded px-2 py-1 text-sm text-gray-300 hover:bg-gray-700"
          >
            Close
          </button>
        </div>
        <div className="p-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search master exercises"
            className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm outline-none placeholder:text-gray-500 focus:border-gray-500"
          />
          <div className="mt-3 max-h-72 overflow-y-auto rounded border border-gray-700">
            {items.length === 0 ? (
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
                      onClick={() => onChooseName(it.name)}
                      className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
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
                  const next = search.data?.nextCursor ?? null;
                  setCursor(next);
                  if (next != null) void search.refetch();
                }}
                className="w-full rounded border border-gray-700 px-3 py-2 text-sm text-gray-200 hover:bg-gray-800"
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
