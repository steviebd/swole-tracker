import {
  Outlet,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { Suspense, lazy } from "react";
import { ThemeProvider } from "~/providers/ThemeProvider";
import { AuthProvider } from "~/providers/AuthProvider";
import { Toaster } from "~/components/ui/toaster";
import "~/styles/globals.css";

const PostHogProvider = lazy(() =>
  import("~/providers/PostHogProvider").then((m) => ({
    default: m.PostHogProvider,
  })),
);

interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Swole Tracker" },
    ],
    links: [{ rel: "icon", href: "/favicon.ico" }],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <html lang="en" className="antialiased">
      <head>
        <HeadContent />
      </head>
      <body>
        <AuthProvider>
          <Suspense fallback={null}>
            <PostHogProvider>
              <ThemeProvider initialTheme="system" initialResolvedTheme="dark">
                <Outlet />
                <Toaster />
              </ThemeProvider>
            </PostHogProvider>
          </Suspense>
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}
