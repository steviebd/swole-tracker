import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { simpleRender as renderSimple } from "~/__tests__/test-utils";

// Ensure React is available globally for JSX
global.React = React;

// Import after mocking
import LiveRegionProvider, {
  useLiveRegion,
  useAttachLiveRegion,
} from "~/app/_components/LiveRegion";

// Test component that uses the hook
function TestComponent() {
  const announce = useLiveRegion();

  useAttachLiveRegion(announce);

  const handlePoliteAnnounce = () => {
    announce("Test polite message");
  };

  const handleAssertiveAnnounce = () => {
    announce("Test assertive message", { assertive: true });
  };

  return (
    <div>
      <button onClick={handlePoliteAnnounce}>Announce Polite</button>
      <button onClick={handleAssertiveAnnounce}>Announce Assertive</button>
    </div>
  );
}

describe("LiveRegion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear any global live region announce function
    delete (window as any).__liveRegionAnnounce;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Clean up global state
    delete (window as any).__liveRegionAnnounce;
  });

  describe("LiveRegionProvider", () => {
    it("renders children without crashing", () => {
      expect(() => {
        renderSimple(
          <LiveRegionProvider>
            <div>Test content</div>
          </LiveRegionProvider>,
        );
      }).not.toThrow();
    });

    it("renders live regions with correct accessibility attributes", () => {
      renderSimple(
        <LiveRegionProvider>
          <div>Test content</div>
        </LiveRegionProvider>,
      );

      const politeRegion = screen.getByTestId("live-region-polite");
      const assertiveRegion = screen.getByTestId("live-region-assertive");

      expect(politeRegion).toHaveAttribute("aria-live", "polite");
      expect(politeRegion).toHaveAttribute("aria-atomic", "true");
      expect(politeRegion).toHaveClass("sr-only");

      expect(assertiveRegion).toHaveAttribute("aria-live", "assertive");
      expect(assertiveRegion).toHaveAttribute("aria-atomic", "true");
      expect(assertiveRegion).toHaveClass("sr-only");
    });

    it("renders children content", () => {
      renderSimple(
        <LiveRegionProvider>
          <div>Test content</div>
        </LiveRegionProvider>,
      );

      expect(screen.getByText("Test content")).toBeInTheDocument();
    });
  });

  describe("useLiveRegion hook", () => {
    it("returns an announce function", () => {
      let announceFn: any;

      function TestHookComponent() {
        announceFn = useLiveRegion();
        return null;
      }

      renderSimple(
        <LiveRegionProvider>
          <TestHookComponent />
        </LiveRegionProvider>,
      );

      expect(typeof announceFn).toBe("function");
    });

    it("announce function has __attach method", () => {
      let announceFn: any;

      function TestHookComponent() {
        announceFn = useLiveRegion();
        return null;
      }

      renderSimple(
        <LiveRegionProvider>
          <TestHookComponent />
        </LiveRegionProvider>,
      );

      expect(typeof announceFn.__attach).toBe("function");
    });
  });

  describe("useAttachLiveRegion hook", () => {
    it("attaches announce function to global when provider is available", () => {
      let announceFn: any;

      function TestHookComponent() {
        announceFn = useLiveRegion();
        useAttachLiveRegion(announceFn);
        return null;
      }

      renderSimple(
        <LiveRegionProvider>
          <TestHookComponent />
        </LiveRegionProvider>,
      );

      // The global should be set
      expect((window as any).__liveRegionAnnounce).toBeDefined();
      expect(typeof (window as any).__liveRegionAnnounce).toBe("function");
    });

    it("does not attach when announce function is not available", () => {
      function TestHookComponent() {
        const announce = useLiveRegion();
        useAttachLiveRegion(announce);
        return null;
      }

      // Render without provider
      renderSimple(<TestHookComponent />);

      // Global should not be set
      expect((window as any).__liveRegionAnnounce).toBeUndefined();
    });
  });

  describe("Announcement functionality", () => {
    it("sets up announcement infrastructure", () => {
      renderSimple(
        <LiveRegionProvider>
          <TestComponent />
        </LiveRegionProvider>,
      );

      // Verify the infrastructure is set up
      expect(screen.getByTestId("live-region-polite")).toBeInTheDocument();
      expect(screen.getByTestId("live-region-assertive")).toBeInTheDocument();
      expect((window as any).__liveRegionAnnounce).toBeDefined();
    });

    it("handles announce function calls without errors", () => {
      renderSimple(
        <LiveRegionProvider>
          <TestComponent />
        </LiveRegionProvider>,
      );

      const politeButton = screen.getByText("Announce Polite");
      const assertiveButton = screen.getByText("Announce Assertive");

      // Should not throw errors
      expect(() => {
        politeButton.click();
        assertiveButton.click();
      }).not.toThrow();
    });

    it("handles empty messages gracefully", () => {
      let announceFn: any;

      function TestEmptyComponent() {
        announceFn = useLiveRegion();
        useAttachLiveRegion(announceFn);

        const handleEmptyAnnounce = () => {
          announceFn("");
        };

        return <button onClick={handleEmptyAnnounce}>Announce Empty</button>;
      }

      renderSimple(
        <LiveRegionProvider>
          <TestEmptyComponent />
        </LiveRegionProvider>,
      );

      const button = screen.getByText("Announce Empty");

      // Should not throw errors
      expect(() => {
        button.click();
      }).not.toThrow();
    });
  });

  describe("LiveRegionBridge", () => {
    it("sets global announce function on mount", () => {
      renderSimple(
        <LiveRegionProvider>
          <div>Test</div>
        </LiveRegionProvider>,
      );

      expect((window as any).__liveRegionAnnounce).toBeDefined();
      expect(typeof (window as any).__liveRegionAnnounce).toBe("function");
    });

    it("cleans up global announce function on unmount", () => {
      const { unmount } = renderSimple(
        <LiveRegionProvider>
          <div>Test</div>
        </LiveRegionProvider>,
      );

      expect((window as any).__liveRegionAnnounce).toBeDefined();

      unmount();

      expect((window as any).__liveRegionAnnounce).toBeUndefined();
    });

    it("sets up and cleans up global announce function", () => {
      expect((window as any).__liveRegionAnnounce).toBeUndefined();

      const { unmount } = renderSimple(
        <LiveRegionProvider>
          <div>Test</div>
        </LiveRegionProvider>,
      );

      expect((window as any).__liveRegionAnnounce).toBeDefined();

      unmount();

      expect((window as any).__liveRegionAnnounce).toBeUndefined();
    });
  });

  describe("Queue management", () => {
    it("handles multiple announce calls without errors", () => {
      let announceFn: any;

      function TestQueueComponent() {
        announceFn = useLiveRegion();
        useAttachLiveRegion(announceFn);

        const handleMultipleAnnounces = () => {
          announceFn("Message 1");
          announceFn("Message 2", { assertive: true });
          announceFn("Message 3");
        };

        return (
          <button onClick={handleMultipleAnnounces}>Announce Multiple</button>
        );
      }

      renderSimple(
        <LiveRegionProvider>
          <TestQueueComponent />
        </LiveRegionProvider>,
      );

      const button = screen.getByText("Announce Multiple");

      // Should not throw errors when called multiple times
      expect(() => {
        button.click();
      }).not.toThrow();
    });

    it("handles rapid successive announcements", () => {
      let announceFn: any;

      function TestRapidComponent() {
        announceFn = useLiveRegion();
        useAttachLiveRegion(announceFn);

        const handleRapidAnnounces = () => {
          for (let i = 0; i < 5; i++) {
            announceFn(`Message ${i}`, { assertive: i % 2 === 0 });
          }
        };

        return <button onClick={handleRapidAnnounces}>Announce Rapid</button>;
      }

      renderSimple(
        <LiveRegionProvider>
          <TestRapidComponent />
        </LiveRegionProvider>,
      );

      const button = screen.getByText("Announce Rapid");

      // Should not throw errors with rapid calls
      expect(() => {
        button.click();
      }).not.toThrow();
    });
  });

  describe("Edge cases", () => {
    it("handles announce calls before provider is ready", () => {
      let announceFn: any;

      function TestEarlyAnnounceComponent() {
        announceFn = useLiveRegion();
        useAttachLiveRegion(announceFn);

        React.useEffect(() => {
          // Try to announce before bridge is set up
          announceFn("Early message");
        }, []);

        return null;
      }

      // Should not crash
      expect(() => {
        renderSimple(
          <LiveRegionProvider>
            <TestEarlyAnnounceComponent />
          </LiveRegionProvider>,
        );
      }).not.toThrow();
    });

    it("handles undefined options gracefully", () => {
      let announceFn: any;

      function TestUndefinedOptionsComponent() {
        announceFn = useLiveRegion();
        useAttachLiveRegion(announceFn);

        const handleUndefinedOptions = () => {
          announceFn("Test message", undefined);
        };

        return (
          <button onClick={handleUndefinedOptions}>Announce Undefined</button>
        );
      }

      renderSimple(
        <LiveRegionProvider>
          <TestUndefinedOptionsComponent />
        </LiveRegionProvider>,
      );

      const button = screen.getByText("Announce Undefined");

      // Should not throw errors
      expect(() => {
        button.click();
      }).not.toThrow();
    });
  });
});
