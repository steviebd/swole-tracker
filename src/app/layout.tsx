import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist, Inter, Space_Grotesk } from "next/font/google";
import Link from "next/link";
import { ClerkProvider } from "@clerk/nextjs";

import { TRPCReactProvider } from "~/trpc/react";
import { ConnectionStatus } from "~/app/_components/connection-status";
import { SyncIndicator } from "~/app/_components/sync-indicator";
import { PostHogProvider } from "~/providers/PostHogProvider";
import { PageTracker } from "~/app/_components/page-tracker";
import { ThemeProvider } from "~/providers/ThemeProvider";
import ClientPerfInit from "@/app/_components/ClientPerfInit";
import LiveRegionProvider from "~/app/_components/LiveRegion";

export const metadata: Metadata = {
  title: "Swole Tracker",
  description: "Simple workout tracking application",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-ui",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display-internal",
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
        var dark = (t === 'system' && prefersDark) || (t === 'dark') || (t === 'CalmDark') || (t === 'BoldDark') || (t === 'PlayfulDark');
        var root = document.documentElement;
        if (dark) root.classList.add('dark'); else root.classList.remove('dark');
        // Only apply data-theme for client. Do not set this attribute in SSR markup to avoid hydration warnings.
        root.setAttribute('data-theme', t);
      } catch (_) {}
    })();
  `;
  return (
    <ClerkProvider
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
      telemetry={false}
    >
      {/* Do not set data-theme or dark class on the server to avoid hydration mismatches */}
      <html
        lang="en"
        suppressHydrationWarning
        className={`${geist.variable} ${inter.variable} ${spaceGrotesk.variable}`}
      >
        <body className="page-shell flex min-h-screen flex-col" style={{ color: "var(--color-text)" }}>
          {/* Prevent theme flash and ensure client applies theme attributes after hydration */}
          <script dangerouslySetInnerHTML={{ __html: noFoucScript }} />
          {/* Skip to content link */}
          <a
            href="#main-content"
            className="btn-primary sr-only px-3 py-1.5 text-sm focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[10000]"
          >
            Skip to main content
          </a>
          <PostHogProvider>
            <ThemeProvider>
              <LiveRegionProvider>
                <ClientPerfInit />
                <div className="page-backdrop" aria-hidden="true" />
                <PageTracker />
                <ConnectionStatus />
                <TRPCReactProvider>
                  <SyncIndicator />

                  <main
                    id="main-content"
                    className="container-default flex-1 py-6 pb-20 md:pb-6"
                    role="main"
                    tabIndex={-1}
                  >
                    <div className="grid gap-4 sm:gap-6">{children}</div>
                  </main>

                  {/* Mobile Bottom Tab Bar */}
                  <nav
                    className="app-footer fixed inset-x-0 bottom-0 md:hidden"
                    role="navigation"
                    aria-label="Primary"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    <div className="mx-auto grid grid-cols-3">
                      <Link
                        href="/"
                        className="flex flex-col items-center justify-center py-2 text-xs transition-colors hover:text-[var(--color-text)]"
                        style={{ color: "var(--color-text-secondary)" }}
                        aria-label="Home"
                        prefetch
                        aria-current={
                          typeof window !== "undefined" &&
                          window.location?.pathname === "/"
                            ? "page"
                            : undefined
                        }
                      >
                        <span>Home</span>
                      </Link>
                      <Link
                        href="/workout/start"
                        className="flex flex-col items-center justify-center py-2 text-xs transition-colors hover:text-[var(--color-text)]"
                        style={{ color: "var(--color-text-secondary)" }}
                        aria-label="Start a workout"
                        prefetch
                        aria-current={
                          typeof window !== "undefined" &&
                          window.location?.pathname.startsWith("/workout/start")
                            ? "page"
                            : undefined
                        }
                      >
                        <span>Start</span>
                      </Link>
                      <Link
                        href="/templates"
                        className="flex flex-col items-center justify-center py-2 text-xs transition-colors hover:text-[var(--color-text)]"
                        style={{ color: "var(--color-text-secondary)" }}
                        aria-label="Manage templates"
                        prefetch
                        aria-current={
                          typeof window !== "undefined" &&
                          window.location?.pathname.startsWith("/templates")
                            ? "page"
                            : undefined
                        }
                      >
                        <span>Templates</span>
                      </Link>
                    </div>
                  </nav>

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
        </body>
      </html>
    </ClerkProvider>
  );
}
