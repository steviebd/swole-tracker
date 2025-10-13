import "~/styles/globals.css";

import { type Metadata } from "next";
import { cookies } from "next/headers";

import { TRPCReactProvider } from "~/trpc/react";
import { PostHogProvider } from "~/providers/PostHogProvider";
import { ThemeProvider } from "~/providers/ThemeProvider";
import { AuthProvider } from "~/providers/AuthProvider";
import { DashboardHeader } from "~/components/dashboard-header";
import { ErrorBoundary } from "~/components/error-boundary";
import {
  THEME_PREFERENCE_COOKIE,
  parseThemeCookie,
  type ThemeMode,
  type ThemeVariant,
} from "~/lib/theme-prefs";

export const metadata: Metadata = {
  title: "Swole Tracker",
  description: "Simple workout tracking application",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export const runtime = "nodejs";

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover", // Better Android/iOS handling for devices with notches
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const preferenceCookie = cookieStore.get(THEME_PREFERENCE_COOKIE);
  const parsed = parseThemeCookie(preferenceCookie?.value);

  const initialTheme: ThemeMode = parsed?.mode ?? "system";
  const initialResolvedTheme: ThemeVariant =
    parsed?.resolved ?? (initialTheme === "system" ? "light" : initialTheme);

  const htmlClassName =
    initialResolvedTheme === "dark" ? "antialiased dark" : "antialiased";
  return (
    <html
      lang="en"
      className={htmlClassName}
      data-theme={initialResolvedTheme}
      data-theme-mode={initialTheme}
    >
      <body>
        <AuthProvider>
          <PostHogProvider>
            <ThemeProvider
              initialTheme={initialTheme}
              initialResolvedTheme={initialResolvedTheme}
            >
              <TRPCReactProvider>
                <ErrorBoundary>
                  <DashboardHeader />
                  {children}
                </ErrorBoundary>
              </TRPCReactProvider>
            </ThemeProvider>
          </PostHogProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
