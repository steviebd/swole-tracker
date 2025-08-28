import "~/styles/globals.css";

import { type Metadata } from "next";
import { Open_Sans, Montserrat } from "next/font/google";
import Link from "next/link";

import { TRPCReactProvider } from "~/trpc/react";
import { ConnectionStatus } from "~/app/_components/connection-status";
import { SyncIndicator } from "~/app/_components/sync-indicator";
import { EnhancedSyncIndicator } from "~/app/_components/enhanced-sync-indicator";
import { NetworkStatusBanner } from "~/app/_components/network-status-banner";
import { PostHogProvider } from "~/providers/PostHogProvider";
import { PageTracker } from "~/app/_components/page-tracker";
import { ThemeProvider } from "~/providers/ThemeProvider";
import { AuthProvider } from "~/providers/AuthProvider";
import ClientPerfInit from "@/app/_components/ClientPerfInit";
import LiveRegionProvider from "~/app/_components/LiveRegion";
import { DashboardHeader } from "~/components/dashboard/dashboard-header";
import { FloatingActionButtons } from "~/components/navigation/floating-action-buttons";

export const metadata: Metadata = {
  title: "Swole Tracker",
  description: "Simple workout tracking application",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover", // Better Android/iOS handling for devices with notches
};

const openSans = Open_Sans({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-sans",
  display: "swap",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["700", "900"],
  variable: "--font-display",
  display: "swap",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // No-FOUC inline script: sets initial theme class before hydration
  // Reads localStorage('theme'), falls back to 'system', and applies dark based on system if needed.
  // Ensure SSR and client produce the same initial <html> attributes:
  // - Do NOT set 'dark' class or data-theme at SSR time; only the client-side inline script updates them.
  // - This avoids hydration mismatches where CSR chooses a different theme than SSR snapshot.
  const noFoucScript = `
    (function() {
      try {
        var key = 'theme';
        var t = localStorage.getItem(key) || 'system';
        var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        var dark = (t === 'system' && prefersDark) || (t === 'dark');
        var root = document.documentElement;
        if (dark) root.classList.add('dark'); else root.classList.remove('dark');
        // Only apply data-theme for client. Do not set this attribute in SSR markup to avoid hydration warnings.
        root.setAttribute('data-theme', t);
      } catch (_) {}
    })();
  `;
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${openSans.variable} ${montserrat.variable} overflow-x-hidden`}
    >
      <body className="page-shell flex min-h-screen flex-col overflow-x-hidden" style={{ color: "var(--color-text)" }}>
        {/* Prevent theme flash and ensure client applies theme attributes after hydration */}
        <script dangerouslySetInnerHTML={{ __html: noFoucScript }} />
        {/* Skip to content link */}
        <a
          href="#main-content"
          className="btn-primary sr-only px-3 py-1.5 text-sm focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[10000]"
        >
          Skip to main content
        </a>
        <AuthProvider>
          <PostHogProvider>
            <ThemeProvider>
              <LiveRegionProvider>
                <ClientPerfInit />
                <div className="page-backdrop" aria-hidden="true" />
                <PageTracker />
                <NetworkStatusBanner />
                <ConnectionStatus />
                <TRPCReactProvider>
                  <SyncIndicator />
                  <EnhancedSyncIndicator />
                  
                  <DashboardHeader />

                  <main
                    id="main-content"
                    className="container-default flex-1 py-4 sm:py-6 overflow-x-hidden"
                    role="main"
                    tabIndex={-1}
                  >
                    <div className="grid gap-2 sm:gap-3 md:gap-4 lg:gap-6 w-full min-w-0 overflow-x-hidden">{children}</div>
                  </main>

                  {/* Floating Action Buttons */}
                  <FloatingActionButtons />


                  <footer className="app-footer mt-auto py-6">
                    <div className="container mx-auto px-4 text-center">
                      <div className="flex justify-center space-x-6 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                        <Link
                          href="/privacy"
                          className="link-primary"
                          prefetch
                        >
                          Privacy Policy
                        </Link>
                        <Link
                          href="/terms"
                          className="link-primary"
                          prefetch
                        >
                          Terms of Service
                        </Link>
                      </div>
                      <div className="mt-3 text-xs" style={{ color: "var(--color-text-muted)" }}>
                        © 2025 Steven Duong. All rights reserved.
                      </div>
                    </div>
                  </footer>
                </TRPCReactProvider>
              </LiveRegionProvider>
            </ThemeProvider>
          </PostHogProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
