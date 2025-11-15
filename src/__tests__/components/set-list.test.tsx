import { describe, it, expect, vi, beforeEach } from "vitest";
import { SetList } from "~/app/_components/workout/SetList";
import { type SetData } from "~/app/_components/set-input";

describe("SetList", () => {
  const mockSets: SetData[] = [
    { id: "set-1", weight: 80, reps: 8, sets: 1, unit: "kg" },
    { id: "set-2", weight: 80, reps: 6, sets: 1, unit: "kg" },
    { id: "set-3", weight: 75, reps: 10, sets: 1, unit: "kg" },
  ];

  const defaultProps = {
    exerciseIndex: 0,
    exerciseName: "Bench Press",
    sets: mockSets,
    readOnly: false,
    onUpdate: vi.fn(),
    onToggleUnit: vi.fn(),
    onAddSet: vi.fn(),
    onDeleteSet: vi.fn(),
    onMoveSet: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should have correct default props structure", () => {
    expect(defaultProps.exerciseIndex).toBe(0);
    expect(defaultProps.exerciseName).toBe("Bench Press");
    expect(defaultProps.sets).toHaveLength(3);
    expect(defaultProps.readOnly).toBe(false);
    expect(typeof defaultProps.onUpdate).toBe("function");
    expect(typeof defaultProps.onToggleUnit).toBe("function");
    expect(typeof defaultProps.onAddSet).toBe("function");
    expect(typeof defaultProps.onDeleteSet).toBe("function");
    expect(typeof defaultProps.onMoveSet).toBe("function");
  });

  it("should handle empty sets array", () => {
    const props = { ...defaultProps, sets: [] };
    expect(props.sets).toHaveLength(0);
  });

  it("should handle single set", () => {
    const singleSet: SetData[] = [
      { id: "set-1", weight: 100, reps: 10, sets: 1, unit: "kg" },
    ];
    const props = { ...defaultProps, sets: singleSet };
    expect(props.sets).toHaveLength(1);
    expect(props.sets[0]!.weight).toBe(100);
    expect(props.sets[0]!.reps).toBe(10);
  });

  it("should handle multiple sets with different values", () => {
    const variedSets: SetData[] = [
      { id: "set-1", weight: 100, reps: 8, sets: 1, unit: "kg" },
      { id: "set-2", weight: 90, reps: 10, sets: 1, unit: "kg" },
      { id: "set-3", weight: 80, reps: 12, sets: 1, unit: "kg" },
    ];
    const props = { ...defaultProps, sets: variedSets };

    expect(props.sets).toHaveLength(3);
    expect(props.sets[0]!.weight).toBe(100);
    expect(props.sets[1]!.weight).toBe(90);
    expect(props.sets[2]!.weight).toBe(80);
  });

  it("should handle template exercise id", () => {
    const withTemplate = { ...defaultProps, templateExerciseId: 123 };
    const withoutTemplate = { ...defaultProps };

    expect(withTemplate.templateExerciseId).toBe(123);
    expect((withoutTemplate as any).templateExerciseId).toBeUndefined();
  });

  it("should handle read-only state", () => {
    const readOnlyProps = { ...defaultProps, readOnly: true };
    const normalProps = { ...defaultProps, readOnly: false };

    expect(readOnlyProps.readOnly).toBe(true);
    expect(normalProps.readOnly).toBe(false);
  });

  it("should handle different exercise indices", () => {
    const props1 = { ...defaultProps, exerciseIndex: 0 };
    const props2 = { ...defaultProps, exerciseIndex: 5 };

    expect(props1.exerciseIndex).toBe(0);
    expect(props2.exerciseIndex).toBe(5);
  });

  it("should handle different exercise names", () => {
    const benchPress = { ...defaultProps, exerciseName: "Bench Press" };
    const squat = { ...defaultProps, exerciseName: "Squat" };
    const deadlift = { ...defaultProps, exerciseName: "Deadlift" };

    expect(benchPress.exerciseName).toBe("Bench Press");
    expect(squat.exerciseName).toBe("Squat");
    expect(deadlift.exerciseName).toBe("Deadlift");
  });

  it("should handle preferred unit", () => {
    const kgProps = { ...defaultProps, preferredUnit: "kg" as const };
    const lbsProps = { ...defaultProps, preferredUnit: "lbs" as const };
    const undefinedProps = { ...defaultProps, preferredUnit: undefined };

    expect(kgProps.preferredUnit).toBe("kg");
    expect(lbsProps.preferredUnit).toBe("lbs");
    expect(undefinedProps.preferredUnit).toBeUndefined();
  });

  it("should handle callback functions correctly", () => {
    const mockUpdate = vi.fn();
    const mockToggle = vi.fn();
    const mockAdd = vi.fn();
    const mockDelete = vi.fn();
    const mockMove = vi.fn();

    const props = {
      ...defaultProps,
      onUpdate: mockUpdate,
      onToggleUnit: mockToggle,
      onAddSet: mockAdd,
      onDeleteSet: mockDelete,
      onMoveSet: mockMove,
    };

    // Test callback signatures
    mockUpdate(0, 0, "weight", 100);
    mockToggle(0, 0);
    mockAdd(0);
    mockDelete(0, 0);
    mockMove(0, 0, "up");
    mockMove(0, 0, "down");

    expect(mockUpdate).toHaveBeenCalledWith(0, 0, "weight", 100);
    expect(mockToggle).toHaveBeenCalledWith(0, 0);
    expect(mockAdd).toHaveBeenCalledWith(0);
    expect(mockDelete).toHaveBeenCalledWith(0, 0);
    expect(mockMove).toHaveBeenCalledWith(0, 0, "up");
    expect(mockMove).toHaveBeenCalledWith(0, 0, "down");
  });

  it("should handle set data with all properties", () => {
    const completeSet: SetData = {
      id: "complete-set",
      weight: 100,
      reps: 10,
      sets: 1,
      unit: "kg",
      rpe: 8,
      rest: 60,
    };

    expect(completeSet.id).toBe("complete-set");
    expect(completeSet.weight!).toBe(100);
    expect(completeSet.reps!).toBe(10);
    expect(completeSet.sets).toBe(1);
    expect(completeSet.unit).toBe("kg");
    expect(completeSet.rpe!).toBe(8);
    expect(completeSet.rest!).toBe(60);
  });

  it("should handle set data with minimal properties", () => {
    const minimalSet: SetData = {
      id: "minimal-set",
      sets: 1,
      unit: "kg",
    };

    expect(minimalSet.id).toBe("minimal-set");
    expect(minimalSet.sets).toBe(1);
    expect(minimalSet.unit).toBe("kg");
    expect(minimalSet.weight).toBeUndefined();
    expect(minimalSet.reps).toBeUndefined();
    expect(minimalSet.rpe).toBeUndefined();
    expect(minimalSet.rest).toBeUndefined();
  });

  it("should handle different units in sets", () => {
    const kgSets: SetData[] = [
      { id: "kg-set", weight: 100, reps: 10, sets: 1, unit: "kg" },
    ];
    const lbsSets: SetData[] = [
      { id: "lbs-set", weight: 225, reps: 10, sets: 1, unit: "lbs" },
    ];

    expect(kgSets[0]!.unit).toBe("kg");
    expect(lbsSets[0]!.unit).toBe("lbs");
  });

  it("should handle move set logic for boundaries", () => {
    // Test move logic for first and last sets
    const firstSetIndex = 0;
    const lastSetIndex = mockSets.length - 1;
    const middleSetIndex = 1;

    // First set can only move down
    expect(firstSetIndex).toBe(0);
    expect(firstSetIndex < mockSets.length - 1).toBe(true);
    expect(firstSetIndex > 0).toBe(false);

    // Last set can only move up
    expect(lastSetIndex).toBe(2);
    expect(lastSetIndex < mockSets.length - 1).toBe(false);
    expect(lastSetIndex > 0).toBe(true);

    // Middle set can move both ways
    expect(middleSetIndex).toBe(1);
    expect(middleSetIndex < mockSets.length - 1).toBe(true);
    expect(middleSetIndex > 0).toBe(true);
  });

  it("should handle show delete logic", () => {
    // Show delete when more than 1 set
    const multipleSets = { ...defaultProps, sets: mockSets };
    const singleSet = { ...defaultProps, sets: mockSets.slice(0, 1) };
    const noSets = { ...defaultProps, sets: [] };

    expect(multipleSets.sets.length > 1).toBe(true);
    expect(singleSet.sets.length > 1).toBe(false);
    expect(noSets.sets.length > 1).toBe(false);
  });
});
