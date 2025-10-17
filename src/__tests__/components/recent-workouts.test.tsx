import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import SuperJSON from "superjson";

import { api } from "~/trpc/react";
import { AuthContext } from "~/providers/AuthProvider";

type FetchHandler = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

interface WorkOSUser {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  profile_picture_url?: string;
}

type AuthContextType = {
  user: WorkOSUser | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
};

const defaultUser = {
  user: { id: "test-user", email: "test@example.com" },
  isLoading: false,
  signOut: async () => {},
};

const createResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify([{ result: { data: { json: payload } } }]), {
    status,
    headers: { "content-type": "application/json" },
  });

async function renderRecentWorkouts(
  fetchImpl: FetchHandler,
  authValue: AuthContextType = defaultUser,
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const trpcClient = api.createClient({
    links: [
      httpBatchLink({
        url: "http://mock-trpc", // not used but required
        transformer: SuperJSON,
        fetch: fetchImpl,
      }),
    ],
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <api.Provider client={trpcClient} queryClient={queryClient}>
        <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>
      </api.Provider>
    </QueryClientProvider>
  );

  const { RecentWorkouts } = await import(
    "~/app/_components/recent-workouts"
  );

  return render(<RecentWorkouts />, { wrapper });
}

describe("RecentWorkouts", () => {
  it("renders loading skeletons when data is loading", async () => {
    let resolveFetch: ((response: Response) => void) | undefined;
    const fetchImpl: FetchHandler = () =>
      new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      });

    await renderRecentWorkouts(fetchImpl);

    const skeletonElements = document.querySelectorAll(".skeleton");
    expect(skeletonElements.length).toBeGreaterThan(0);

    resolveFetch?.(createResponse([]));
  });

  it("renders error state when query fails", async () => {
    const fetchImpl: FetchHandler = async () =>
      new Response(
        JSON.stringify([
          {
            error: {
              message: "Server error",
              code: -32603,
            },
          },
        ]),
        {
          status: 500,
          headers: { "content-type": "application/json" },
        },
      );

    await renderRecentWorkouts(fetchImpl);

    await waitFor(() => {
      expect(
        screen.getByText("Error loading workouts"),
      ).toBeInTheDocument();
    });
  });

  it("renders empty state when no workouts exist", async () => {
    const fetchImpl: FetchHandler = async () => createResponse([]);

    await renderRecentWorkouts(fetchImpl);

    await waitFor(() => {
      expect(
        screen.getByText("No recent workouts. Start your first workout!"),
      ).toBeInTheDocument();
    });
  });

  it("renders workout list with correct data", async () => {
    const fetchImpl: FetchHandler = async () =>
      createResponse([
        {
          id: 1,
          workoutDate: "2024-10-15",
          templateId: 1,
          template: { name: "Push Day" },
          exercises: [{ id: 1 }, { id: 2 }],
        },
        {
          id: 2,
          workoutDate: "2024-10-14",
          templateId: 2,
          template: { name: "Pull Day" },
          exercises: [{ id: 3 }],
        },
      ]);

    await renderRecentWorkouts(fetchImpl);

    await waitFor(() => {
      expect(screen.getByText("Push Day")).toBeInTheDocument();
      expect(screen.getByText("Pull Day")).toBeInTheDocument();
    });

    expect(screen.getByText("2 exercises logged")).toBeInTheDocument();
    expect(screen.getByText("1 exercise logged")).toBeInTheDocument();
    expect(screen.getByText("10/15/2024")).toBeInTheDocument();
    expect(screen.getByText("10/14/2024")).toBeInTheDocument();
  });

  it("handles workouts with unknown templates", async () => {
    const fetchImpl: FetchHandler = async () =>
      createResponse([
        {
          id: 3,
          workoutDate: "2024-10-13",
          templateId: 3,
          template: null,
          exercises: [],
        },
      ]);

    await renderRecentWorkouts(fetchImpl);

    await waitFor(() => {
      expect(screen.getByText("Unknown Template")).toBeInTheDocument();
    });
  });

  it("does not fetch when user is not authenticated", async () => {
    const fetchImpl = vi.fn<FetchHandler>();

    await renderRecentWorkouts(fetchImpl, {
      user: null,
      isLoading: false,
      signOut: async () => {},
    });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(
      screen.getByText("No recent workouts. Start your first workout!"),
    ).toBeInTheDocument();
  });
});
