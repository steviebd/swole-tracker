import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist, Inter, Space_Grotesk } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";

import { TRPCReactProvider } from "~/trpc/react";
import { ConnectionStatus } from "~/app/_components/connection-status";
import { SyncIndicator } from "~/app/_components/sync-indicator";
import { PostHogProvider } from "~/providers/PostHogProvider";
import { PageTracker } from "~/app/_components/page-tracker";
import { ThemeProvider } from "~/providers/ThemeProvider";
import { ThemeSwitcher } from "~/app/_components/theme-switcher";
import ClientPerfInit from "~/app/_components/ClientPerfInit";

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
        var dark = (t === 'dark') || (t === 'system' && prefersDark) || (t === 'Horizon_wow');
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
      <html lang="en" className={`${geist.variable} ${inter.variable} ${spaceGrotesk.variable}`}>
        <body className="min-h-screen flex flex-col text-gray-900 dark:text-white page-shell">
          {/* Prevent theme flash */}
          <script dangerouslySetInnerHTML={{ __html: noFoucScript }} />
          {/* Skip to content link */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[10000] btn-primary px-3 py-1.5 text-sm"
          >
            Skip to main content
          </a>
          <PostHogProvider>
            <ThemeProvider>
              <ClientPerfInit />
              <div className="page-backdrop" aria-hidden="true" />
              <PageTracker />
              <ConnectionStatus />
              <TRPCReactProvider>
                <SyncIndicator />

                <main id="main-content" className="flex-1 container-default py-6" role="main" tabIndex={-1}>
                  <div className="grid gap-6">
                    {children}
                  </div>
                </main>

                {/* Mobile Bottom Tab Bar */}
                <nav
                  className="md:hidden fixed inset-x-0 bottom-0 app-footer text-gray-300"
                  role="navigation"
                  aria-label="Primary"
                >
                  <div className="mx-auto grid grid-cols-5">
                    <a
                      href="/"
                      className="flex flex-col items-center justify-center py-2 text-xs hover:text-gray-900 dark:hover:text-white"
                      aria-label="Home"
                      rel="prefetch"
                      aria-current={
                        typeof window !== "undefined" && window.location?.pathname === "/"
                          ? "page"
                          : undefined
                      }
                    >
                      <span>Home</span>
                    </a>
                    <a
                      href="/workout/start"
                      className="flex flex-col items-center justify-center py-2 text-xs hover:text-gray-900 dark:hover:text-white"
                      aria-label="Start a workout"
                      rel="prefetch"
                      aria-current={
                        typeof window !== "undefined" && window.location?.pathname.startsWith("/workout/start")
                          ? "page"
                          : undefined
                      }
                    >
                      <span>Start</span>
                    </a>
                    <a
                      href="/templates"
                      className="flex flex-col items-center justify-center py-2 text-xs hover:text-gray-900 dark:hover:text-white"
                      aria-label="Manage templates"
                      rel="prefetch"
                      aria-current={
                        typeof window !== "undefined" && window.location?.pathname.startsWith("/templates")
                          ? "page"
                          : undefined
                      }
                    >
                      <span>Templates</span>
                    </a>
                    <a
                      href="/connect-whoop"
                      className="flex flex-col items-center justify-center py-2 text-xs hover:text-gray-900 dark:hover:text-white"
                      aria-label="Connect to Whoop"
                      rel="prefetch"
                      aria-current={
                        typeof window !== "undefined" && window.location?.pathname.startsWith("/connect-whoop")
                          ? "page"
                          : undefined
                      }
                    >
                      <span>Connect</span>
                    </a>
                    <div className="flex items-center justify-center py-2">
                      <ThemeSwitcher compact />
                    </div>
                  </div>
                </nav>

                <footer className="mt-auto py-6 app-footer">
                  <div className="container mx-auto px-4 text-center">
                    <div className="flex justify-center space-x-6 text-sm text-gray-300">
                      <a 
                        href="/privacy" 
                        className="hover:text-white transition-colors duration-200 link-primary"
                      >
                        Privacy Policy
                      </a>
                      <a 
                        href="/terms" 
                        className="hover:text-white transition-colors duration-200 link-primary"
                      >
                        Terms of Service
                      </a>
                    </div>
                    <div className="mt-3 text-xs text-gray-500">
                      © 2025 Steven Duong. All rights reserved.
                    </div>
                  </div>
                </footer>
              </TRPCReactProvider>
            </ThemeProvider>
          </PostHogProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
