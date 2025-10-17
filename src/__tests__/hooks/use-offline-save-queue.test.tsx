import { renderHook, act, waitFor } from "@testing-library/react";
import { vi, beforeEach, afterEach, describe, expect, it } from "vitest";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { useOfflineSaveQueue } from "~/hooks/use-offline-save-queue";
import {
  clearQueue,
  getQueueLength,
  type QueueItem,
  QUEUE_UPDATED_EVENT,
} from "~/lib/offline-queue";
import { api } from "~/trpc/react";

const storage = new Map<string, string>();

function ensureLocalStorage() {
  if (typeof globalThis.window === "undefined") {
    (globalThis as any).window = globalThis;
  }

  const localStorageMock: Storage = {
    getItem: (key: string) => (storage.has(key) ? storage.get(key)! : null),
    setItem: (key: string, value: string) => {
      storage.set(key, String(value));
    },
    removeItem: (key: string) => {
      storage.delete(key);
    },
    clear: () => {
      storage.clear();
    },
    key: (index: number) => Array.from(storage.keys())[index] ?? null,
    get length() {
      return storage.size;
    },
  };

  Object.defineProperty(globalThis, "localStorage", {
    value: localStorageMock,
    configurable: true,
  });
  Object.defineProperty(window, "localStorage", {
    value: localStorageMock,
    configurable: true,
  });
}

function createQueueItem(overrides: Partial<QueueItem> = {}): QueueItem {
  return {
    id: overrides.id ?? "queue-item-1",
    type: "workout_save",
    payload:
      overrides.payload ??
      ({
        sessionId: 123,
        exercises: [
          {
            exerciseName: "Bench Press",
            sets: [
              { id: "set-1", weight: 80, reps: 8, unit: "kg" as const },
            ],
            unit: "kg" as const,
          },
        ],
      } satisfies QueueItem["payload"]),
    attempts: overrides.attempts ?? 0,
    lastError: overrides.lastError,
    createdAt: overrides.createdAt ?? Date.now(),
    updatedAt: overrides.updatedAt ?? Date.now(),
  };
}

describe("useOfflineSaveQueue", () => {
  let queryClient: QueryClient;
  let wrapper: React.ComponentType<{ children: React.ReactNode }>;
  const originalUseUtils = api.useUtils;
  const originalSaveUseMutation = api.workouts.save.useMutation;
  const originalBatchSaveUseMutation = api.workouts.batchSave.useMutation;

  beforeEach(() => {
    storage.clear();
    ensureLocalStorage();
    clearQueue();
    queryClient = new QueryClient();
    const trpcClient = api.createClient({
      links: [
        () => {
          return () => {
            throw new Error("TRPC client should not be called in hooks tests");
          };
        },
      ],
    });

    wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        <api.Provider client={trpcClient} queryClient={queryClient}>
          {children}
        </api.Provider>
      </QueryClientProvider>
    );

    const utilsStub = {
      templates: {
        getAll: {
          invalidate: vi.fn().mockResolvedValue(undefined),
        },
      },
      workouts: {
        getRecent: {
          invalidate: vi.fn().mockResolvedValue(undefined),
        },
        getById: {
          invalidate: vi.fn().mockResolvedValue(undefined),
        },
      },
    };

    (api as unknown as { useUtils: () => typeof utilsStub }).useUtils = vi
      .fn()
      .mockReturnValue(utilsStub);
    (api.workouts.save as unknown as {
      useMutation: () => { mutateAsync: ReturnType<typeof vi.fn> };
    }).useMutation = vi.fn().mockReturnValue({
      mutateAsync: vi.fn(),
    });
    (api.workouts.batchSave as unknown as {
      useMutation: () => { mutateAsync: ReturnType<typeof vi.fn> };
    }).useMutation = vi.fn().mockReturnValue({
      mutateAsync: vi.fn(),
    });
  });

  afterEach(() => {
    storage.clear();
    clearQueue();
    queryClient.clear();
    if (originalUseUtils) {
      (api as unknown as { useUtils: typeof originalUseUtils }).useUtils =
        originalUseUtils;
    } else {
      delete (api as Record<string, unknown>).useUtils;
    }
    if (originalSaveUseMutation) {
      (api.workouts.save as unknown as {
        useMutation: typeof originalSaveUseMutation;
      }).useMutation = originalSaveUseMutation;
    } else {
      delete (api.workouts.save as Record<string, unknown>).useMutation;
    }
    if (originalBatchSaveUseMutation) {
      (api.workouts.batchSave as unknown as {
        useMutation: typeof originalBatchSaveUseMutation;
      }).useMutation = originalBatchSaveUseMutation;
    } else {
      delete (api.workouts.batchSave as Record<string, unknown>).useMutation;
    }
    vi.restoreAllMocks();
  });

  it("refreshCount syncs queue state with persisted storage", () => {
    const { result } = renderHook(() => useOfflineSaveQueue(), { wrapper });

    expect(result.current.queueSize).toBe(0);
    expect(result.current.items).toHaveLength(0);

    const storedItem = createQueueItem({
      id: "stored-item",
      payload: {
        sessionId: 555,
        exercises: [
          {
            exerciseName: "Bench",
            sets: [{ id: "set-1", weight: 80, reps: 8, unit: "kg" as const }],
            unit: "kg" as const,
          },
        ],
      },
    });

    storage.set("offline.queue.v1", JSON.stringify([storedItem]));

    act(() => {
      result.current.refreshCount();
    });

    expect(getQueueLength()).toBe(1);
    expect(result.current.queueSize).toBe(1);
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]?.id).toBe("stored-item");
    expect(result.current.items[0]?.payload.sessionId).toBe(555);
  });

  it("responds to queue updated events", async () => {
    const { result } = renderHook(() => useOfflineSaveQueue(), { wrapper });

    const externalItem = createQueueItem({
      id: "external-item",
      payload: {
        sessionId: 321,
        exercises: [
          {
            exerciseName: "Squat",
            sets: [{ id: "set-1", weight: 100, reps: 6, unit: "kg" as const }],
            unit: "kg" as const,
          },
        ],
      },
    });

    storage.set("offline.queue.v1", JSON.stringify([externalItem]));

    act(() => {
      window.dispatchEvent(
        new CustomEvent(QUEUE_UPDATED_EVENT, {
          detail: { size: 1, items: [externalItem] },
        }),
      );
    });

    await waitFor(() => {
      expect(result.current.queueSize).toBe(1);
      expect(result.current.items).toHaveLength(1);
    });

    expect(result.current.items[0]?.id).toBe("external-item");
    expect(result.current.items[0]?.payload.sessionId).toBe(321);
  });
});
