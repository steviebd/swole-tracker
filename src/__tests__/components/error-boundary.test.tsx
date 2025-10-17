import React from "react";
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { render, screen, fireEvent } from "~/__tests__/test-utils";
import { ErrorBoundary, withErrorBoundary } from "~/components/error-boundary";

// Component that throws an error
const ErrorThrowingComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error("Test error");
  }
  return <div>No error</div>;
};

// Component that throws in event handler
const EventErrorComponent = () => {
  const handleClick = () => {
    throw new Error("Event error");
  };

  return <button onClick={handleClick}>Click me</button>;
};

describe("ErrorBoundary", () => {
  // Mock console.error to avoid noise in test output
  const originalError = console.error;
  beforeAll(() => {
    console.error = vi.fn();
  });

  afterAll(() => {
    console.error = originalError;
  });

  it("renders children when no error occurs", () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>,
    );

    expect(screen.getByText("Test content")).toBeInTheDocument();
  });

  it("renders default fallback when error occurs", () => {
    render(
      <ErrorBoundary>
        <ErrorThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Test error")).toBeInTheDocument();
    expect(screen.getByText("Try again")).toBeInTheDocument();
  });

  it("renders custom fallback when provided", () => {
    const CustomFallback = ({
      error,
      retry,
    }: {
      error?: Error;
      retry: () => void;
    }) => (
      <div>
        <p>Custom error: {error?.message}</p>
        <button onClick={retry}>Retry custom</button>
      </div>
    );

    render(
      <ErrorBoundary fallback={CustomFallback}>
        <ErrorThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Custom error: Test error")).toBeInTheDocument();
    expect(screen.getByText("Retry custom")).toBeInTheDocument();
  });

  it("renders retry button in default fallback", () => {
    render(
      <ErrorBoundary>
        <ErrorThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Try again")).toBeInTheDocument();
  });

  // Note: Error boundaries don't catch errors in event handlers
  // This test verifies that synchronous render errors are caught
  it("handles errors thrown during render", () => {
    render(
      <ErrorBoundary>
        <ErrorThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Test error")).toBeInTheDocument();
  });

  it("logs error to console when componentDidCatch is called", () => {
    const mockConsoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ErrorThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(mockConsoleError).toHaveBeenCalledWith(
      "ErrorBoundary caught an error:",
      expect.any(Error),
      expect.any(Object), // errorInfo
    );

    mockConsoleError.mockRestore();
  });
});

describe("withErrorBoundary", () => {
  it("wraps component with ErrorBoundary", () => {
    const TestComponent = ({ text }: { text: string }) => <div>{text}</div>;
    const WrappedComponent = withErrorBoundary(TestComponent);

    render(<WrappedComponent text="Hello" />);

    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("passes custom fallback to ErrorBoundary", () => {
    const TestComponent = () => <ErrorThrowingComponent shouldThrow={true} />;
    const CustomFallback = () => <div>Custom fallback</div>;
    const WrappedComponent = withErrorBoundary(TestComponent, CustomFallback);

    render(<WrappedComponent />);

    expect(screen.getByText("Custom fallback")).toBeInTheDocument();
  });

  it("sets displayName correctly", () => {
    const TestComponent = () => <div>Test</div>;
    TestComponent.displayName = "TestComponent";
    const WrappedComponent = withErrorBoundary(TestComponent);

    expect(WrappedComponent.displayName).toBe(
      "withErrorBoundary(TestComponent)",
    );
  });

  it("handles component without displayName", () => {
    const TestComponent = () => <div>Test</div>;
    const WrappedComponent = withErrorBoundary(TestComponent);

    expect(WrappedComponent.displayName).toBe("withErrorBoundary()");
  });
});
