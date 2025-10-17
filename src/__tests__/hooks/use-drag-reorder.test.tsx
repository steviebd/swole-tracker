import React from "react";
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  type MockedFunction,
} from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDragReorder } from "~/hooks/use-drag-reorder";

describe("useDragReorder", () => {
  let mockOnReorder: MockedFunction<(newItems: string[]) => void>;
  let mockOnStartDrag: MockedFunction<(index: number) => void>;
  let mockOnEndDrag: MockedFunction<() => void>;
  let items: string[];

  beforeEach(() => {
    mockOnReorder = vi.fn();
    mockOnStartDrag = vi.fn();
    mockOnEndDrag = vi.fn();
    items = ["item1", "item2", "item3", "item4"];
  });

  it("returns initial state and handlers", () => {
    const { result } = renderHook(() =>
      useDragReorder(items, mockOnReorder, mockOnStartDrag, mockOnEndDrag),
    );

    const [state, handlers] = result.current;

    expect(state).toEqual({
      draggedIndex: null,
      dragOverIndex: null,
      isDragging: false,
      dragOffset: { x: 0, y: 0 },
    });

    expect(typeof handlers.onDragStart).toBe("function");
    expect(typeof handlers.onDragEnd).toBe("function");
    expect(typeof handlers.onDragOver).toBe("function");
    expect(typeof handlers.onDrop).toBe("function");
    expect(typeof handlers.onDragEnter).toBe("function");
    expect(typeof handlers.onDragLeave).toBe("function");
  });

  it("handles drag start correctly", () => {
    const { result } = renderHook(() =>
      useDragReorder(items, mockOnReorder, mockOnStartDrag, mockOnEndDrag),
    );

    const [, handlers] = result.current;

    const mockDragEvent = {
      clientX: 100,
      clientY: 200,
      dataTransfer: {
        setDragImage: vi.fn(),
        setData: vi.fn(),
        effectAllowed: "",
      },
    } as unknown as React.DragEvent;

    act(() => {
      handlers.onDragStart(1)(mockDragEvent);
    });

    const [state] = result.current;

    expect(state.draggedIndex).toBe(1);
    expect(state.isDragging).toBe(true);
    expect(state.dragOffset).toEqual({ x: 0, y: 0 });
    expect(mockOnStartDrag).toHaveBeenCalledWith(1);
    expect(mockDragEvent.dataTransfer.setData).toHaveBeenCalledWith(
      "text/plain",
      "1",
    );
    expect(mockDragEvent.dataTransfer.effectAllowed).toBe("move");
  });

  it("handles drag over and updates offset", () => {
    const { result } = renderHook(() =>
      useDragReorder(items, mockOnReorder, mockOnStartDrag, mockOnEndDrag),
    );

    // Start drag first
    const startDragEvent = {
      clientX: 100,
      clientY: 200,
      dataTransfer: {
        setDragImage: vi.fn(),
        setData: vi.fn(),
        effectAllowed: "",
        dropEffect: "",
      },
    } as unknown as React.DragEvent;

    act(() => {
      result.current[1].onDragStart(1)(startDragEvent);
    });

    // Check that drag started
    let [state] = result.current;
    expect(state.draggedIndex).toBe(1);
    expect(state.isDragging).toBe(true);

    // Now drag over
    const dragOverEvent = {
      preventDefault: vi.fn(),
      clientX: 150,
      clientY: 250,
      dataTransfer: {
        dropEffect: "",
      },
    } as unknown as React.DragEvent;

    act(() => {
      result.current[1].onDragOver(2)(dragOverEvent);
    });

    [state] = result.current;

    expect(state.dragOverIndex).toBe(2);
    expect(state.dragOffset).toEqual({ x: 50, y: 50 });
    expect(dragOverEvent.preventDefault).toHaveBeenCalled();
    expect(dragOverEvent.dataTransfer.dropEffect).toBe("move");
  });

  it("does not set dragOverIndex when dragging over the same item", () => {
    const { result } = renderHook(() =>
      useDragReorder(items, mockOnReorder, mockOnStartDrag, mockOnEndDrag),
    );

    const [, handlers] = result.current;

    // Start drag
    const startDragEvent = {
      clientX: 100,
      clientY: 200,
      dataTransfer: {
        setDragImage: vi.fn(),
        setData: vi.fn(),
        effectAllowed: "",
        dropEffect: "",
      },
    } as unknown as React.DragEvent;

    act(() => {
      handlers.onDragStart(1)(startDragEvent);
    });

    // Drag over the same item
    const dragOverEvent = {
      preventDefault: vi.fn(),
      clientX: 150,
      clientY: 250,
      dataTransfer: {
        dropEffect: "",
      },
    } as unknown as React.DragEvent;

    act(() => {
      handlers.onDragOver(1)(dragOverEvent);
    });

    const [state] = result.current;

    expect(state.dragOverIndex).toBe(null);
  });

  it("handles drop and reorders items correctly", () => {
    const { result } = renderHook(() =>
      useDragReorder(items, mockOnReorder, mockOnStartDrag, mockOnEndDrag),
    );

    // Start drag
    const startDragEvent = {
      clientX: 100,
      clientY: 200,
      dataTransfer: {
        setDragImage: vi.fn(),
        setData: vi.fn(),
        effectAllowed: "",
      },
    } as unknown as React.DragEvent;

    act(() => {
      result.current[1].onDragStart(1)(startDragEvent);
    });

    // Drop at index 3
    const dropEvent = {
      preventDefault: vi.fn(),
    } as unknown as React.DragEvent;

    act(() => {
      result.current[1].onDrop(3)(dropEvent);
    });

    expect(mockOnReorder).toHaveBeenCalledWith([
      "item1",
      "item3",
      "item2",
      "item4",
    ]);

    const [state] = result.current;
    expect(state.draggedIndex).toBe(null);
    expect(state.dragOverIndex).toBe(null);
    expect(state.isDragging).toBe(false);
    expect(state.dragOffset).toEqual({ x: 0, y: 0 });
  });

  it("handles drop with correct insertion when dragging forward", () => {
    const { result } = renderHook(() =>
      useDragReorder(items, mockOnReorder, mockOnStartDrag, mockOnEndDrag),
    );

    // Start drag at index 0
    const startDragEvent = {
      clientX: 100,
      clientY: 200,
      dataTransfer: {
        setDragImage: vi.fn(),
        setData: vi.fn(),
        effectAllowed: "",
      },
    } as unknown as React.DragEvent;

    act(() => {
      result.current[1].onDragStart(0)(startDragEvent);
    });

    // Drop at index 2 (should insert at index 1)
    const dropEvent = {
      preventDefault: vi.fn(),
    } as unknown as React.DragEvent;

    act(() => {
      result.current[1].onDrop(2)(dropEvent);
    });

    expect(mockOnReorder).toHaveBeenCalledWith([
      "item2",
      "item1",
      "item3",
      "item4",
    ]);
  });

  it("does not reorder when dropping on the same index", () => {
    const { result } = renderHook(() =>
      useDragReorder(items, mockOnReorder, mockOnStartDrag, mockOnEndDrag),
    );

    const [, handlers] = result.current;

    // Start drag
    const startDragEvent = {
      clientX: 100,
      clientY: 200,
      dataTransfer: {
        setDragImage: vi.fn(),
        setData: vi.fn(),
        effectAllowed: "",
      },
    } as unknown as React.DragEvent;

    act(() => {
      handlers.onDragStart(1)(startDragEvent);
    });

    // Drop on the same index
    const dropEvent = {
      preventDefault: vi.fn(),
    } as unknown as React.DragEvent;

    act(() => {
      handlers.onDrop(1)(dropEvent);
    });

    expect(mockOnReorder).not.toHaveBeenCalled();
  });

  it("handles drag end and resets state", () => {
    const { result } = renderHook(() =>
      useDragReorder(items, mockOnReorder, mockOnStartDrag, mockOnEndDrag),
    );

    const [, handlers] = result.current;

    // Start drag
    const startDragEvent = {
      clientX: 100,
      clientY: 200,
      dataTransfer: {
        setDragImage: vi.fn(),
        setData: vi.fn(),
        effectAllowed: "",
        dropEffect: "",
      },
    } as unknown as React.DragEvent;

    act(() => {
      handlers.onDragStart(1)(startDragEvent);
    });

    // Drag over
    const dragOverEvent = {
      preventDefault: vi.fn(),
      clientX: 150,
      clientY: 250,
      dataTransfer: {
        dropEffect: "",
      },
    } as unknown as React.DragEvent;

    act(() => {
      handlers.onDragOver(2)(dragOverEvent);
    });

    // End drag
    const dragEndEvent = {} as unknown as React.DragEvent;

    act(() => {
      handlers.onDragEnd(dragEndEvent);
    });

    const [state] = result.current;

    expect(state.draggedIndex).toBe(null);
    expect(state.dragOverIndex).toBe(null);
    expect(state.isDragging).toBe(false);
    expect(state.dragOffset).toEqual({ x: 0, y: 0 });
    expect(mockOnEndDrag).toHaveBeenCalled();
  });

  it("handles drag enter correctly", () => {
    const { result } = renderHook(() =>
      useDragReorder(items, mockOnReorder, mockOnStartDrag, mockOnEndDrag),
    );

    // Start drag
    const startDragEvent = {
      clientX: 100,
      clientY: 200,
      dataTransfer: {
        setDragImage: vi.fn(),
        setData: vi.fn(),
        effectAllowed: "",
      },
    } as unknown as React.DragEvent;

    act(() => {
      result.current[1].onDragStart(1)(startDragEvent);
    });

    // Drag enter
    const dragEnterEvent = {
      preventDefault: vi.fn(),
    } as unknown as React.DragEvent;

    act(() => {
      result.current[1].onDragEnter(3)(dragEnterEvent);
    });

    const [state] = result.current;

    expect(state.dragOverIndex).toBe(3);
    expect(dragEnterEvent.preventDefault).toHaveBeenCalled();
  });

  it("does not set dragOverIndex on drag enter when dragging the same item", () => {
    const { result } = renderHook(() =>
      useDragReorder(items, mockOnReorder, mockOnStartDrag, mockOnEndDrag),
    );

    const [, handlers] = result.current;

    // Start drag
    const startDragEvent = {
      clientX: 100,
      clientY: 200,
      dataTransfer: {
        setDragImage: vi.fn(),
        setData: vi.fn(),
        effectAllowed: "",
      },
    } as unknown as React.DragEvent;

    act(() => {
      handlers.onDragStart(1)(startDragEvent);
    });

    // Drag enter the same item
    const dragEnterEvent = {
      preventDefault: vi.fn(),
    } as unknown as React.DragEvent;

    act(() => {
      handlers.onDragEnter(1)(dragEnterEvent);
    });

    const [state] = result.current;

    expect(state.dragOverIndex).toBe(null);
  });

  it("handles drag leave and clears dragOverIndex when leaving bounds", () => {
    const { result } = renderHook(() =>
      useDragReorder(items, mockOnReorder, mockOnStartDrag, mockOnEndDrag),
    );

    const [, handlers] = result.current;

    // Start drag and set drag over
    const startDragEvent = {
      clientX: 100,
      clientY: 200,
      dataTransfer: {
        setDragImage: vi.fn(),
        setData: vi.fn(),
        effectAllowed: "",
      },
    } as unknown as React.DragEvent;

    act(() => {
      handlers.onDragStart(1)(startDragEvent);
    });

    act(() => {
      handlers.onDragEnter(2)({
        preventDefault: vi.fn(),
      } as unknown as React.DragEvent);
    });

    // Mock element bounds
    const mockElement = {
      getBoundingClientRect: () => ({
        left: 50,
        right: 150,
        top: 50,
        bottom: 150,
      }),
    };

    // Drag leave with coordinates outside bounds
    const dragLeaveEvent = {
      preventDefault: vi.fn(),
      clientX: 200, // Outside right bound
      clientY: 100,
      currentTarget: mockElement,
    } as unknown as React.DragEvent;

    act(() => {
      handlers.onDragLeave(dragLeaveEvent);
    });

    const [state] = result.current;

    expect(state.dragOverIndex).toBe(null);
    expect(dragLeaveEvent.preventDefault).toHaveBeenCalled();
  });

  it("does not clear dragOverIndex when drag leave is within bounds", () => {
    const { result } = renderHook(() =>
      useDragReorder(items, mockOnReorder, mockOnStartDrag, mockOnEndDrag),
    );

    // Start drag and set drag over
    const startDragEvent = {
      clientX: 100,
      clientY: 200,
      dataTransfer: {
        setDragImage: vi.fn(),
        setData: vi.fn(),
        effectAllowed: "",
      },
    } as unknown as React.DragEvent;

    act(() => {
      result.current[1].onDragStart(1)(startDragEvent);
    });

    act(() => {
      result.current[1].onDragEnter(2)({
        preventDefault: vi.fn(),
      } as unknown as React.DragEvent);
    });

    // Mock element bounds
    const mockElement = {
      getBoundingClientRect: () => ({
        left: 50,
        right: 150,
        top: 50,
        bottom: 150,
      }),
    };

    // Drag leave with coordinates within bounds
    const dragLeaveEvent = {
      preventDefault: vi.fn(),
      clientX: 100, // Within bounds
      clientY: 100,
      currentTarget: mockElement,
    } as unknown as React.DragEvent;

    act(() => {
      result.current[1].onDragLeave(dragLeaveEvent);
    });

    const [state] = result.current;

    expect(state.dragOverIndex).toBe(2); // Should not be cleared
  });

  it("calls onStartDrag and onEndDrag callbacks", () => {
    const { result } = renderHook(() =>
      useDragReorder(items, mockOnReorder, mockOnStartDrag, mockOnEndDrag),
    );

    const [, handlers] = result.current;

    // Start drag
    const startDragEvent = {
      clientX: 100,
      clientY: 200,
      dataTransfer: {
        setDragImage: vi.fn(),
        setData: vi.fn(),
        effectAllowed: "",
      },
    } as unknown as React.DragEvent;

    act(() => {
      handlers.onDragStart(2)(startDragEvent);
    });

    expect(mockOnStartDrag).toHaveBeenCalledWith(2);

    // End drag
    const dragEndEvent = {} as unknown as React.DragEvent;

    act(() => {
      handlers.onDragEnd(dragEndEvent);
    });

    expect(mockOnEndDrag).toHaveBeenCalled();
  });

  it("works without optional callbacks", () => {
    const { result } = renderHook(() => useDragReorder(items, mockOnReorder));

    const [, handlers] = result.current;

    const startDragEvent = {
      clientX: 100,
      clientY: 200,
      dataTransfer: {
        setDragImage: vi.fn(),
        setData: vi.fn(),
        effectAllowed: "",
      },
    } as unknown as React.DragEvent;

    expect(() => {
      act(() => {
        handlers.onDragStart(1)(startDragEvent);
      });
    }).not.toThrow();

    const dragEndEvent = {} as unknown as React.DragEvent;

    expect(() => {
      act(() => {
        handlers.onDragEnd(dragEndEvent);
      });
    }).not.toThrow();
  });
});
