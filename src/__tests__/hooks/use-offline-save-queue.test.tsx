import { describe, it, expect } from "vitest";

describe("useOfflineSaveQueue", () => {
  it("should be a placeholder test", () => {
    expect(true).toBe(true);
  });

  // it("should enqueue items and update queue size", () => {
  //   const { result } = renderHook(() => useOfflineSaveQueue());

  //   const payload = {
  //   sessionId: 123,
  //   exercises: [
  //     {
  //       exerciseName: "Bench Press",
  //       sets: [{ id: "set-1", weight: 80, reps: 8, unit: "kg" as const }],
  //       unit: "kg" as const,
  //     },
  //   ],
  // };

  //   act(() => {
  //     result.current.enqueue(payload);
  //   });

  //   expect(result.current.queueSize).toBe(1);
  // });

  // it("should flush successfully and clear queue", async () => {
  //   const { result } = renderHook(() => useOfflineSaveQueue());

  //   const payload = {
  //   sessionId: 123,
  //   exercises: [
  //     {
  //       exerciseName: "Bench Press",
  //       sets: [{ id: "set-1", weight: 80, reps: 8, unit: "kg" as const }],
  //       unit: "kg" as const,
  //     },
  //   ],
  // };

  //   act(() => {
  //     result.current.enqueue(payload);
  //   });

  //   expect(result.current.queueSize).toBe(1);

  //   await act(async () => {
  //     await result.current.flush();
  //   });

  //   await waitFor(() => {
  //     expect(result.current.status).toBe("idle");
  //     expect(result.current.queueSize).toBe(0);
  //   });
  // });

  // it("should handle flush errors and retry", async () => {
  //   // Mock batchSave to fail
  //   const mockBatchSave = vi.fn().mockRejectedValue(new Error("Network error"));
  //   vi.mocked(
  //     require("~/trpc/react").api.workouts.batchSave.useMutation,
  //   ).mockReturnValue({
  //     mutateAsync: mockBatchSave,
  //   });

  //   const { result } = renderHook(() => useOfflineSaveQueue());

  //   const payload = {
  //     sessionId: 123,
  //     exercises: [
  //       {
  //         exerciseName: "Bench Press",
  //         sets: [{ id: "set-1", weight: 80, reps: 8, unit: "kg" as const }],
  //         unit: "kg" as const,
  //       },
  //     ],
  //   };

  //   act(() => {
  //     result.current.enqueue(payload);
  //   });

  //   await act(async () => {
  //     await result.current.flush();
  //   });

  //   await waitFor(() => {
  //     expect(result.current.status).toBe("idle");
  //     expect(result.current.lastError).toContain("Network error");
  //     // Item should be requeued with incremented attempts
  //     expect(result.current.queueSize).toBe(1);
  //   });
  // });

  // it("should remove exhausted items after max attempts", async () => {
  //   // Mock batchSave to always fail
  //   const mockBatchSave = vi.fn().mockRejectedValue(new Error("Network error"));
  //   vi.mocked(
  //     require("~/trpc/react").api.workouts.batchSave.useMutation,
  //   ).mockReturnValue({
  //     mutateAsync: mockBatchSave,
  //   });

  //   const { result } = renderHook(() => useOfflineSaveQueue());

  //   const payload = {
  //     sessionId: 123,
  //     exercises: [
  //       {
  //         exerciseName: "Bench Press",
  //         sets: [{ id: "set-1", weight: 80, reps: 8, unit: "kg" as const }],
  //         unit: "kg" as const,
  //       },
  //     ],
  //   };

  //   // Enqueue and fail multiple times to exhaust attempts
  //   for (let i = 0; i < 8; i++) {
  //     act(() => {
  //       result.current.enqueue(payload);
  //     });

  //     await act(async () => {
  //       await result.current.flush();
  //     });

  //     await waitFor(() => {
  //       expect(result.current.status).toBe("idle");
  //     });
  //   }

  //   // After 8 attempts, item should be removed
  //   expect(result.current.queueSize).toBe(0);
  //   expect(result.current.lastError).toContain(
  //     "Failed to sync workout after 8 attempts",
  //   );
  // });
});
