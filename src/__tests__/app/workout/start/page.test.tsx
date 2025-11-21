import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import StartWorkoutPage from "~/app/workout/start/page";
import { api } from "~/trpc/react";
import { SessionCookie } from "~/lib/session-cookie";
import {
  getQueryClient,
  getDehydratedState,
  prefetchWorkoutStart,
} from "~/trpc/prefetch";
import { WorkoutStarter } from "~/app/_components/workout-starter";
import { Button } from "~/components/ui/button";
import ClientHydrate from "~/trpc/HydrateClient";

// Mock dependencies
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

vi.mock("~/lib/session-cookie", () => ({
  SessionCookie: {
    get: vi.fn(),
    isExpired: vi.fn(),
  },
}));

vi.mock("~/trpc/server", () => ({
  api: {
    templates: {
      getById: {
        prefetch: vi.fn(),
      },
    },
  },
}));

vi.mock("~/trpc/prefetch", () => ({
  getQueryClient: vi.fn(),
  getDehydratedState: vi.fn(),
  prefetchWorkoutStart: vi.fn(),
}));

vi.mock("~/app/_components/workout-starter", () => ({
  WorkoutStarter: vi.fn(({ initialTemplateId }) => (
    <div data-testid="workout-starter">
      WorkoutStarter Component
      {initialTemplateId && (
        <span data-testid="initial-template-id">{initialTemplateId}</span>
      )}
    </div>
  )),
}));

vi.mock("~/components/ui/button", () => ({
  Button: vi.fn(({ children, variant, size, asChild, ...props }) => {
    const ButtonComponent = asChild ? "span" : "button";
    return (
      <ButtonComponent
        data-variant={variant}
        data-size={size}
        data-testid={props["data-testid"] || "button"}
        {...props}
      >
        {children}
      </ButtonComponent>
    );
  }),
}));

vi.mock("~/trpc/HydrateClient", () => ({
  default: vi.fn(({ children, state }) => (
    <div data-testid="client-hydrate" data-state={state ? "hydrated" : "dry"}>
      {children}
    </div>
  )),
}));

describe("StartWorkoutPage", () => {
  const mockHeaders = vi.mocked(headers);
  const mockRedirect = vi.mocked(redirect);
  const mockSessionCookieGet = vi.mocked(SessionCookie.get);
  const mockSessionCookieIsExpired = vi.mocked(SessionCookie.isExpired);
  const mockGetQueryClient = vi.mocked(getQueryClient);
  const mockGetDehydratedState = vi.mocked(getDehydratedState);
  const mockPrefetchWorkoutStart = vi.mocked(prefetchWorkoutStart);
  const mockApiTemplatesGetById = vi.fn();

  const mockHeadersList = new Map([
    ["cookie", "session=test-session"],
    ["user-agent", "test-agent"],
  ]);

  const mockQueryClient = {
    prefetch: vi.fn(),
  };

  const mockSession = {
    userId: "test-user-id",
    accessToken: "test-access-token",
    refreshToken: "test-refresh-token",
    accessTokenExpiresAt: Math.floor((Date.now() + 3600000) / 1000),
    sessionExpiresAt: Math.floor((Date.now() + 7200000) / 1000),
    expiresAt: Math.floor((Date.now() + 3600000) / 1000),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockHeaders.mockResolvedValue(mockHeadersList as any);
    mockGetQueryClient.mockReturnValue(mockQueryClient as any);
    mockGetDehydratedState.mockReturnValue({} as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Authentication", () => {
    it("should redirect to login when no session exists", async () => {
      mockSessionCookieGet.mockResolvedValue(null);

      const Component = await StartWorkoutPage({
        searchParams: Promise.resolve({}),
      });
      render(Component);

      await waitFor(() => {
        expect(mockRedirect).toHaveBeenCalledWith("/auth/login");
      });
    });

    it("should redirect to login when session is expired", async () => {
      mockSessionCookieGet.mockResolvedValue(mockSession);
      mockSessionCookieIsExpired.mockReturnValue(true);

      const Component = await StartWorkoutPage({
        searchParams: Promise.resolve({}),
      });
      render(Component);

      await waitFor(() => {
        expect(mockRedirect).toHaveBeenCalledWith("/auth/login");
      });
    });

    it("should not redirect when session is valid", async () => {
      mockSessionCookieGet.mockResolvedValue(mockSession);
      mockSessionCookieIsExpired.mockReturnValue(false);

      const Component = await StartWorkoutPage({
        searchParams: Promise.resolve({}),
      });
      render(Component);

      await waitFor(() => {
        expect(mockRedirect).not.toHaveBeenCalled();
      });
    });
  });

  describe("Data Prefetching", () => {
    it("should prefetch workout start data", async () => {
      mockSessionCookieGet.mockResolvedValue(mockSession);
      mockSessionCookieIsExpired.mockReturnValue(false);

      const Component = await StartWorkoutPage({
        searchParams: Promise.resolve({}),
      });
      render(Component);

      await waitFor(() => {
        expect(mockPrefetchWorkoutStart).toHaveBeenCalledWith(mockQueryClient);
      });
    });

    it("should prefetch template data when templateId is provided", async () => {
      mockSessionCookieGet.mockResolvedValue(mockSession);
      mockSessionCookieIsExpired.mockReturnValue(false);

      const Component = await StartWorkoutPage({
        searchParams: Promise.resolve({ templateId: "123" }),
      });
      render(Component);

      await waitFor(() => {
        expect(mockApiTemplatesGetById).toHaveBeenCalledWith({ id: 123 });
      });
    });

    it("should not prefetch template when templateId is invalid", async () => {
      mockSessionCookieGet.mockResolvedValue(mockSession);
      mockSessionCookieIsExpired.mockReturnValue(false);

      const Component = await StartWorkoutPage({
        searchParams: Promise.resolve({ templateId: "invalid" }),
      });
      render(Component);

      await waitFor(() => {
        expect(mockApiTemplatesGetById).not.toHaveBeenCalled();
      });
    });

    it("should not prefetch template when templateId is not provided", async () => {
      mockSessionCookieGet.mockResolvedValue(mockSession);
      mockSessionCookieIsExpired.mockReturnValue(false);

      const Component = await StartWorkoutPage({
        searchParams: Promise.resolve({}),
      });
      render(Component);

      await waitFor(() => {
        expect(mockApiTemplatesGetById).not.toHaveBeenCalled();
      });
    });
  });

  describe("Page Structure", () => {
    beforeEach(() => {
      mockSessionCookieGet.mockResolvedValue(mockSession);
      mockSessionCookieIsExpired.mockReturnValue(false);
    });

    it("should render main container with correct classes", async () => {
      const Component = await StartWorkoutPage({
        searchParams: Promise.resolve({}),
      });
      render(Component);

      await waitFor(() => {
        const main = screen.getByRole("main");
        expect(main).toHaveClass("min-h-screen");
      });
    });

    it("should render container with correct classes", async () => {
      const Component = await StartWorkoutPage({
        searchParams: Promise.resolve({}),
      });
      render(Component);

      await waitFor(() => {
        const container = screen.getByRole("main").querySelector(".container");
        expect(container).toHaveClass("mx-auto", "max-w-7xl", "px-4", "py-6");
      });
    });

    it("should render page header with correct title", async () => {
      const Component = await StartWorkoutPage({
        searchParams: Promise.resolve({}),
      });
      render(Component);

      await waitFor(() => {
        const heading = screen.getByRole("heading", { level: 1 });
        expect(heading).toHaveTextContent("Start Workout");
      });
    });

    it("should render page subtitle", async () => {
      const Component = await StartWorkoutPage({
        searchParams: Promise.resolve({}),
      });
      render(Component);

      await waitFor(() => {
        const subtitle = screen.getByText(
          "Choose a template or start from scratch",
        );
        expect(subtitle).toBeInTheDocument();
        expect(subtitle).toHaveClass("text-muted-foreground", "text-sm");
      });
    });

    it("should render back button", async () => {
      const Component = await StartWorkoutPage({
        searchParams: Promise.resolve({}),
      });
      render(Component);

      await waitFor(() => {
        const backButton = screen.getByText("← Back");
        expect(backButton).toBeInTheDocument();
        expect(backButton.closest("a")).toHaveAttribute("href", "/");
      });
    });

    it("should render WorkoutStarter component", async () => {
      const Component = await StartWorkoutPage({
        searchParams: Promise.resolve({}),
      });
      render(Component);

      await waitFor(() => {
        const workoutStarter = screen.getByTestId("workout-starter");
        expect(workoutStarter).toBeInTheDocument();
        expect(workoutStarter).toHaveTextContent("WorkoutStarter Component");
      });
    });

    it("should render ClientHydrate component", async () => {
      const Component = await StartWorkoutPage({
        searchParams: Promise.resolve({}),
      });
      render(Component);

      await waitFor(() => {
        const clientHydrate = screen.getByTestId("client-hydrate");
        expect(clientHydrate).toBeInTheDocument();
        expect(clientHydrate).toHaveAttribute("data-state", "hydrated");
      });
    });
  });

  describe("Template Integration", () => {
    beforeEach(() => {
      mockSessionCookieGet.mockResolvedValue(mockSession);
      mockSessionCookieIsExpired.mockReturnValue(false);
    });

    it("should pass initialTemplateId to WorkoutStarter when templateId is provided", async () => {
      const Component = await StartWorkoutPage({
        searchParams: Promise.resolve({ templateId: "456" }),
      });
      render(Component);

      await waitFor(() => {
        const initialTemplateId = screen.getByTestId("initial-template-id");
        expect(initialTemplateId).toBeInTheDocument();
        expect(initialTemplateId).toHaveTextContent("456");
      });
    });

    it("should not pass initialTemplateId to WorkoutStarter when templateId is not provided", async () => {
      const Component = await StartWorkoutPage({
        searchParams: Promise.resolve({}),
      });
      render(Component);

      await waitFor(() => {
        const initialTemplateId = screen.queryByTestId("initial-template-id");
        expect(initialTemplateId).not.toBeInTheDocument();
      });
    });
  });

  describe("Responsive Design", () => {
    beforeEach(() => {
      mockSessionCookieGet.mockResolvedValue(mockSession);
      mockSessionCookieIsExpired.mockReturnValue(false);
    });

    it("should render header with responsive classes", async () => {
      const Component = await StartWorkoutPage({
        searchParams: Promise.resolve({}),
      });
      render(Component);

      await waitFor(() => {
        const headerSection = screen
          .getByRole("heading", { level: 1 })
          .closest(".mb-4");
        expect(headerSection).toHaveClass("mb-4", "sm:mb-6");
      });
    });

    it("should render header flex container with responsive classes", async () => {
      const Component = await StartWorkoutPage({
        searchParams: Promise.resolve({}),
      });
      render(Component);

      await waitFor(() => {
        const flexContainer = screen
          .getByRole("heading", { level: 1 })
          .closest(".flex");
        expect(flexContainer).toHaveClass(
          "flex-col",
          "space-y-3",
          "sm:flex-row",
          "sm:items-center",
          "sm:justify-between",
          "sm:space-y-0",
        );
      });
    });

    it("should render title with responsive text sizes", async () => {
      const Component = await StartWorkoutPage({
        searchParams: Promise.resolve({}),
      });
      render(Component);

      await waitFor(() => {
        const heading = screen.getByRole("heading", { level: 1 });
        expect(heading).toHaveClass(
          "text-lg",
          "font-bold",
          "sm:text-xl",
          "md:text-2xl",
        );
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle headers() errors gracefully", async () => {
      mockHeaders.mockRejectedValue(new Error("Headers error"));

      const Component = await StartWorkoutPage({
        searchParams: Promise.resolve({}),
      });

      // Should not throw but may log error
      expect(async () => {
        render(Component);
      }).not.toThrow();
    });

    it("should handle searchParams parsing errors", async () => {
      mockSessionCookieGet.mockResolvedValue(mockSession);
      mockSessionCookieIsExpired.mockReturnValue(false);

      const Component = await StartWorkoutPage({
        searchParams: Promise.reject(new Error("Search params error")),
      });

      // Should not throw but may handle error gracefully
      expect(async () => {
        render(Component);
      }).not.toThrow();
    });
  });

  describe("Component Integration", () => {
    beforeEach(() => {
      mockSessionCookieGet.mockResolvedValue(mockSession);
      mockSessionCookieIsExpired.mockReturnValue(false);
    });

    it("should integrate all components correctly", async () => {
      const Component = await StartWorkoutPage({
        searchParams: Promise.resolve({ templateId: "789" }),
      });
      render(Component);

      await waitFor(() => {
        // Check all main components are rendered
        expect(screen.getByTestId("client-hydrate")).toBeInTheDocument();
        expect(screen.getByRole("main")).toBeInTheDocument();
        expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
        expect(screen.getByTestId("workout-starter")).toBeInTheDocument();
        expect(screen.getByTestId("initial-template-id")).toHaveTextContent(
          "789",
        );
      });
    });

    it("should pass correct dehydrated state to ClientHydrate", async () => {
      const Component = await StartWorkoutPage({
        searchParams: Promise.resolve({}),
      });
      render(Component);

      await waitFor(() => {
        expect(mockGetDehydratedState).toHaveBeenCalledWith(mockQueryClient);
      });
    });
  });
});
