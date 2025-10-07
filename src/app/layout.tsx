import "~/styles/globals.css";

import { type Metadata } from "next";

import { TRPCReactProvider } from "~/trpc/react";
import { PostHogProvider } from "~/providers/PostHogProvider";
import { ThemeProvider } from "~/providers/ThemeProvider";
import { AuthProvider } from "~/providers/AuthProvider";
import { DashboardHeader } from "~/components/dashboard-header";
import { ErrorBoundary } from "~/components/error-boundary";

export const metadata: Metadata = {
  title: "Swole Tracker",
  description: "Simple workout tracking application",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export const runtime = "edge";

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover", // Better Android/iOS handling for devices with notches
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // No-FOUC inline script: sets initial theme class before hydration
  // Reads localStorage('theme'), falls back to 'system', and applies theme attributes
  // Supports new gentle themes: current, cool, warm, neutral
  // Ensure SSR and client produce the same initial <html> attributes:
  // - Do NOT set 'dark' class or data-theme at SSR time; only the client-side inline script updates them.
  // - This avoids hydration mismatches where CSR chooses a different theme than SSR snapshot.
  const noFoucScript = `
    (function() {
      try {
        var key = 'theme';
        var stored = localStorage.getItem(key) || 'system';
        var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        // Determine effective theme
        var effectiveTheme = stored === 'system' ? (prefersDark ? 'dark' : 'light') : stored;
        
        var root = document.documentElement;
        var dark = effectiveTheme === 'dark';
        if (dark) root.classList.add('dark'); else root.classList.remove('dark');

        // Align data attributes so CSS variables match the active palette
        root.setAttribute('data-theme', effectiveTheme);
        root.setAttribute('data-theme-mode', stored);
      } catch (_) {}
    })();
  `;
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className="antialiased"
    >
      <body>
        {/* Prevent theme flash and ensure client applies theme attributes after hydration */}
        <script dangerouslySetInnerHTML={{ __html: noFoucScript }} />
        <AuthProvider>
          <PostHogProvider>
            <ThemeProvider>
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
