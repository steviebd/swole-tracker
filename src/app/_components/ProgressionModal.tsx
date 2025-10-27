"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "~/trpc/react";
import { FocusTrap, useReturnFocus } from "./focus-trap";

interface ProgressionModalProps {
  open: boolean;
  onClose: () => void;
  exerciseName?: string;
}

type TimeRange = "week" | "month" | "year";

export function ProgressionModal({
  open,
  onClose,
  exerciseName,
}: ProgressionModalProps) {
  const { restoreFocus } = useReturnFocus();
  const firstFocusRef = useRef<HTMLButtonElement>(null);
  const [selectedExerciseName, setSelectedExerciseName] = useState<string>(
    exerciseName || "",
  );
  const [selectedTemplateExerciseId, setSelectedTemplateExerciseId] = useState<
    number | null
  >(null);
  const [timeRange, setTimeRange] = useState<TimeRange>("month");

  // Get list of exercises for dropdown
  const { data: exerciseList, isLoading: exerciseListLoading } =
    api.progress.getExerciseList.useQuery(undefined, { enabled: open });

  useEffect(() => {
    if (
      open &&
      !exerciseListLoading &&
      exerciseList?.length &&
      !selectedExerciseName
    ) {
      const first = exerciseList[0]!;
      setSelectedExerciseName(first.exerciseName);
      setSelectedTemplateExerciseId(
        (first.templateExerciseIds ?? [])[0] ?? null,
      );
    }
  }, [exerciseList, exerciseListLoading, open, selectedExerciseName]);

  const selectedOptionId = useMemo(() => {
    if (!exerciseList || exerciseList.length === 0) {
      return "";
    }
    if (typeof selectedTemplateExerciseId === "number") {
      const match = exerciseList.find((exercise) =>
        (exercise.templateExerciseIds ?? []).includes(
          selectedTemplateExerciseId,
        ),
      );
      if (match) {
        return match.id;
      }
    }
    if (selectedExerciseName) {
      const match = exerciseList.find(
        (exercise) => exercise.exerciseName === selectedExerciseName,
      );
      if (match) {
        return match.id;
      }
    }
    return "";
  }, [exerciseList, selectedExerciseName, selectedTemplateExerciseId]);

  const handleExerciseChange = (optionId: string) => {
    if (!exerciseList) return;
    const option = exerciseList.find((exercise) => exercise.id === optionId);
    if (!option) return;
    setSelectedExerciseName(option.exerciseName);
    setSelectedTemplateExerciseId(
      (option.templateExerciseIds ?? [])[0] ?? null,
    );
  };

  // Get strength progression data for selected exercise
  const hasExerciseSelection =
    Boolean(selectedExerciseName) ||
    typeof selectedTemplateExerciseId === "number";

  const { data: strengthData, isLoading: strengthLoading } =
    api.progress.getStrengthProgression.useQuery(
      {
        exerciseName: selectedExerciseName,
        templateExerciseId: selectedTemplateExerciseId ?? undefined,
        timeRange,
      },
      {
        enabled: open && hasExerciseSelection,
      },
    );

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="progression-title"
      className="bg-background/70 fixed inset-0 z-[50000] flex min-h-screen items-center justify-center p-4"
      onClick={() => {
        restoreFocus();
        onClose();
      }}
    >
      <FocusTrap
        onEscape={() => {
          restoreFocus();
          onClose();
        }}
        initialFocusRef={firstFocusRef as React.RefObject<HTMLElement>}
        preventScroll
      >
        <div
          className="glass-surface max-h-[90vh] w-full max-w-2xl overflow-y-auto shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="glass-hairline border-b px-6 py-4">
            <h2
              id="progression-title"
              className="text-xl font-bold"
              style={{ color: "var(--color-text)" }}
            >
              Exercise Progression
            </h2>
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              Select an exercise to track your progress over time
            </p>
          </div>

          {/* Content */}
          <div className="px-6 py-5">
            {/* Exercise Selection and Time Range */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row">
              {/* Exercise Selector */}
              <div className="flex-1">
                <label
                  className="mb-2 block text-sm font-medium"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  Exercise
                </label>
                {exerciseListLoading ? (
                  <div
                    className="h-10 animate-pulse rounded-lg"
                    style={{ backgroundColor: "var(--color-border)" }}
                  ></div>
                ) : (
                  <select
                    value={selectedOptionId}
                    onChange={(event) =>
                      handleExerciseChange(event.target.value)
                    }
                    className="w-full rounded-lg border px-3 py-2 text-sm transition-colors"
                    style={{
                      backgroundColor: "var(--color-bg-surface)",
                      borderColor: "var(--color-border)",
                      color: "var(--color-text)",
                    }}
                  >
                    <option value="">Choose an exercise...</option>
                    {exerciseList?.map((exercise) => (
                      <option
                        key={exercise.id}
                        value={exercise.id}
                        title={
                          exercise.aliases.length > 0
                            ? exercise.aliases.join(", ")
                            : undefined
                        }
                      >
                        {exercise.exerciseName}
                        {exercise.aliasCount > 1
                          ? ` (${exercise.aliasCount} linked)`
                          : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Time Range Selector */}
              <div>
                <label
                  className="mb-2 block text-sm font-medium"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  Time Range
                </label>
                <div className="glass-surface flex space-x-1 rounded-lg p-1">
                  {(["week", "month", "year"] as TimeRange[]).map((range) => (
                    <button
                      key={range}
                      onClick={() => setTimeRange(range)}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                        timeRange === range ? "btn-primary" : "btn-ghost"
                      }`}
                    >
                      {range.charAt(0).toUpperCase() + range.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {hasExerciseSelection ? (
              <>
                {strengthLoading ? (
                  <div className="space-y-4">
                    <div
                      className="h-64 animate-pulse rounded-lg"
                      style={{ backgroundColor: "var(--color-border)" }}
                    ></div>
                    <div
                      className="h-32 animate-pulse rounded-lg"
                      style={{ backgroundColor: "var(--color-border)" }}
                    ></div>
                  </div>
                ) : strengthData && strengthData.length > 0 ? (
                  <>
                    {/* Simple Chart Visualization */}
                    <div className="mb-6">
                      <h3
                        className="mb-3 text-lg font-semibold"
                        style={{ color: "var(--color-text)" }}
                      >
                        Weight Progress
                      </h3>

                      <div
                        className="h-64 rounded-lg p-4"
                        style={{ backgroundColor: "var(--color-bg-surface)" }}
                      >
                        <svg className="h-full w-full" viewBox="0 0 400 200">
                          {/* Grid lines */}
                          <defs>
                            <pattern
                              id="grid"
                              width="40"
                              height="20"
                              patternUnits="userSpaceOnUse"
                            >
                              <path
                                d="M 40 0 L 0 0 0 20"
                                fill="none"
                                stroke="var(--color-border)"
                                strokeWidth="0.5"
                              />
                            </pattern>
                          </defs>
                          <rect width="100%" height="100%" fill="url(#grid)" />

                          {/* Data points and line */}
                          {strengthData.map((point, index) => {
                            const maxWeight = Math.max(
                              ...strengthData.map((d) => d.weight),
                            );
                            const minWeight = Math.min(
                              ...strengthData.map((d) => d.weight),
                            );
                            const range = maxWeight - minWeight || 1;

                            const x =
                              (index / Math.max(1, strengthData.length - 1)) *
                                360 +
                              20;
                            const y =
                              180 - ((point.weight - minWeight) / range) * 160;

                            return (
                              <g key={index}>
                                {/* Line to next point */}
                                {index < strengthData.length - 1 && (
                                  <line
                                    x1={x}
                                    y1={y}
                                    x2={
                                      ((index + 1) /
                                        Math.max(1, strengthData.length - 1)) *
                                        360 +
                                      20
                                    }
                                    y2={
                                      180 -
                                      ((strengthData[index + 1]!.weight -
                                        minWeight) /
                                        range) *
                                        160
                                    }
                                    stroke="var(--color-primary)"
                                    strokeWidth="2"
                                  />
                                )}

                                {/* Data point */}
                                <circle
                                  cx={x}
                                  cy={y}
                                  r="4"
                                  fill="var(--color-primary)"
                                  className="hover:r-6 cursor-pointer transition-all"
                                />

                                {/* Weight label */}
                                <text
                                  x={x}
                                  y={y - 10}
                                  textAnchor="middle"
                                  className="text-xs font-medium"
                                  style={{
                                    fill: "var(--color-text-secondary)",
                                  }}
                                >
                                  {point.weight}kg
                                </text>
                              </g>
                            );
                          })}
                        </svg>
                      </div>
                    </div>

                    {/* Progression Table */}
                    <div className="space-y-3">
                      <h3
                        className="text-lg font-semibold"
                        style={{ color: "var(--color-text)" }}
                      >
                        Recent Sessions
                      </h3>

                      <div className="glass-hairline mobile-table-container max-h-64 overflow-y-auto rounded-lg">
                        <div className="mobile-table">
                          <div
                            className="glass-header sticky top-0 grid grid-cols-6 gap-2 border-b px-2 py-3 text-xs font-medium sm:gap-4 sm:px-4 sm:text-sm"
                            style={{ color: "var(--color-text-muted)" }}
                          >
                            <div>Date</div>
                            <div>Weight</div>
                            <div>Reps</div>
                            <div>Sets</div>
                            <div>Volume</div>
                            <div>1RM Est.</div>
                          </div>
                          {strengthData.slice(0, 10).map((session, index) => (
                            <div
                              key={index}
                              className={`grid grid-cols-6 gap-2 px-2 py-3 text-xs sm:gap-4 sm:px-4 sm:text-sm ${
                                index !== Math.min(9, strengthData.length - 1)
                                  ? "glass-hairline border-b"
                                  : ""
                              }`}
                            >
                              <div
                                style={{ color: "var(--color-text-secondary)" }}
                              >
                                {new Date(
                                  session.workoutDate,
                                ).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </div>
                              <div
                                className="font-medium"
                                style={{ color: "var(--color-text)" }}
                              >
                                {session.weight}kg
                              </div>
                              <div
                                style={{ color: "var(--color-text-secondary)" }}
                              >
                                {session.reps}
                              </div>
                              <div
                                style={{ color: "var(--color-text-secondary)" }}
                              >
                                {session.sets}
                              </div>
                              <div
                                className="font-medium"
                                style={{ color: "var(--color-text)" }}
                              >
                                {(
                                  session.weight *
                                  session.reps *
                                  session.sets
                                ).toLocaleString()}
                                kg
                              </div>
                              <div
                                className="font-medium"
                                style={{ color: "var(--color-text)" }}
                              >
                                {session.oneRMEstimate}kg
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-12 text-center">
                    <svg
                      className="mx-auto mb-4 h-16 w-16"
                      style={{ color: "var(--color-text-muted)" }}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                    <p
                      className="mb-2 text-lg font-medium"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      No data found
                    </p>
                    <p
                      className="text-sm"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      Complete some workouts with{" "}
                      {selectedExerciseName || "this exercise"} to see your
                      progression.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="py-12 text-center">
                <svg
                  className="mx-auto mb-4 h-16 w-16"
                  style={{ color: "var(--color-text-muted)" }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
                <p
                  className="mb-2 text-lg font-medium"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  Select an Exercise
                </p>
                <p
                  className="text-sm"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Choose an exercise from the dropdown to view your progression.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="glass-hairline flex items-center justify-between border-t px-6 py-4">
            {hasExerciseSelection && (
              <a
                href="/progress"
                onClick={onClose}
                className="btn-ghost inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium"
                style={{ color: "var(--color-primary)" }}
              >
                <svg
                  className="mr-2 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 712-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 712-2h2a2 2 0 712 2v14a2 2 0 71-2 2h-2a2 2 0 71-2-2z"
                  />
                </svg>
                View Full Progress Dashboard
              </a>
            )}
            <button
              ref={firstFocusRef}
              onClick={() => {
                restoreFocus();
                onClose();
              }}
              className="btn-secondary"
            >
              Close
            </button>
          </div>
        </div>
      </FocusTrap>
    </div>
  );
}
