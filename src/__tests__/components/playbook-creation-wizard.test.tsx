import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, waitFor } from "~/__tests__/test-utils";
import { PlaybookCreationWizard } from "~/app/_components/playbooks/PlaybookCreationWizard";
import { api } from "~/trpc/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";

// Mock the API
vi.mock("~/trpc/react", () => ({
  api: {
    playbooks: {
      create: {
        useMutation: vi.fn(() => ({
          mutateAsync: vi.fn(),
          isPending: false,
        })),
      },
    },
    templates: {
      getAll: {
        useQuery: vi.fn(() => ({
          data: [
            { id: 1, name: "Template 1", description: "Test template" },
            { id: 2, name: "Template 2", description: "Another template" },
          ],
          isLoading: false,
        })),
      },
    },
    exercises: {
      getAll: {
        useQuery: vi.fn(() => ({
          data: [
            { id: 1, name: "Squat", category: "compound" },
            { id: 2, name: "Bench Press", category: "compound" },
          ],
          isLoading: false,
        })),
      },
      getAllMaster: {
        useQuery: vi.fn(() => ({
          data: [
            { id: 1, name: "Squat", category: "compound" },
            { id: 2, name: "Bench Press", category: "compound" },
          ],
          isLoading: false,
        })),
      },
    },
    useUtils: vi.fn(() => ({
      playbooks: {
        invalidate: vi.fn(),
      },
    })),
  },
  TRPCProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  })),
  usePathname: vi.fn(() => "/"),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

// Mock Framer Motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      whileHover,
      whileTap,
      initial,
      animate,
      transition,
      ...props
    }: any) => React.createElement("div", props, children),
    button: ({
      children,
      whileHover,
      whileTap,
      initial,
      animate,
      transition,
      ...props
    }: any) => React.createElement("button", props, children),
    main: ({
      children,
      whileHover,
      whileTap,
      initial,
      animate,
      transition,
      ...props
    }: any) => React.createElement("main", props, children),
    header: ({
      children,
      whileHover,
      whileTap,
      initial,
      animate,
      transition,
      ...props
    }: any) => React.createElement("header", props, children),
    section: ({
      children,
      whileHover,
      whileTap,
      initial,
      animate,
      transition,
      ...props
    }: any) => React.createElement("section", props, children),
  },
  AnimatePresence: ({ children }: any) => children,
}));

describe("PlaybookCreationWizard - Basic Rendering", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>,
    );
  };

  it("should render without crashing", () => {
    const mockCreate = ((api.playbooks.create.useMutation as any) = vi.fn(
      () =>
        ({
          mutateAsync: vi.fn(),
          isPending: false,
        }) as any,
    ));

    expect(() => {
      renderWithProviders(<PlaybookCreationWizard />);
    }).not.toThrow();
  });

  it("should show create playbook title", () => {
    const mockCreate = ((api.playbooks.create.useMutation as any) = vi.fn(
      () =>
        ({
          mutateAsync: vi.fn(),
          isPending: false,
        }) as any,
    ));

    const { getByText } = renderWithProviders(<PlaybookCreationWizard />);
    expect(getByText("Create Training Playbook")).toBeInTheDocument();
  });

  it("should show cancel button", () => {
    const mockCreate = ((api.playbooks.create.useMutation as any) = vi.fn(
      () =>
        ({
          mutateAsync: vi.fn(),
          isPending: false,
        }) as any,
    ));

    const { getAllByText } = renderWithProviders(<PlaybookCreationWizard />);
    expect(getAllByText("Cancel")).toHaveLength(2); // One in header, one in navigation
  });
});
