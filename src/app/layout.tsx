import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";

import { TRPCReactProvider } from "~/trpc/react";
import { ConnectionStatus } from "~/app/_components/connection-status";
import { SyncIndicator } from "~/app/_components/sync-indicator";
import { PostHogProvider } from "~/providers/PostHogProvider";
import { PageTracker } from "~/app/_components/page-tracker";

export const metadata: Metadata = {
  title: "Swole Tracker",
  description: "Simple workout tracking application",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
      telemetry={false}
    >
      <html lang="en" className={`${geist.variable} dark`}>
        <body className="min-h-screen bg-gray-900 text-white flex flex-col">
          {/* Skip to content link */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[10000] btn-primary px-3 py-1.5 text-sm"
          >
            Skip to main content
          </a>
          <PostHogProvider>
            <PageTracker />
            <ConnectionStatus />
            <TRPCReactProvider>
              <SyncIndicator />

              <main id="main-content" className="flex-1" role="main" tabIndex={-1}>
                {children}
              </main>

              {/* Mobile Bottom Tab Bar */}
              <nav className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-gray-800 bg-black/70 backdrop-blur supports-[backdrop-filter]:bg-black/60" role="navigation" aria-label="Primary">
                <div className="mx-auto grid grid-cols-4">
                  <a href="/" className="flex flex-col items-center justify-center py-2 text-xs text-gray-300 hover:text-white" aria-label="Home" rel="prefetch" aria-current={typeof window !== "undefined" && window.location?.pathname === "/" ? "page" : undefined}>
                    <span>Home</span>
                  </a>
                  <a href="/workout/start" className="flex flex-col items-center justify-center py-2 text-xs text-gray-300 hover:text-white" aria-label="Start a workout" rel="prefetch" aria-current={typeof window !== "undefined" && window.location?.pathname.startsWith("/workout/start") ? "page" : undefined}>
                    <span>Start Workout</span>
                  </a>
                  <a href="/templates" className="flex flex-col items-center justify-center py-2 text-xs text-gray-300 hover:text-white" aria-label="Manage templates" rel="prefetch" aria-current={typeof window !== "undefined" && window.location?.pathname.startsWith("/templates") ? "page" : undefined}>
                    <span>Manage Templates</span>
                  </a>
                  <a href="/connect-whoop" className="flex flex-col items-center justify-center py-2 text-xs text-gray-300 hover:text-white" aria-label="Connect to Whoop" rel="prefetch" aria-current={typeof window !== "undefined" && window.location?.pathname.startsWith("/connect-whoop") ? "page" : undefined}>
                    <span>Connect</span>
                  </a>
                </div>
              </nav>

              <footer className="mt-auto py-6 border-t border-gray-800">
                <div className="container mx-auto px-4 text-center">
                  <div className="flex justify-center space-x-6 text-sm text-gray-400">
                    <a 
                      href="/privacy" 
                      className="hover:text-white transition-colors duration-200"
                    >
                      Privacy Policy
                    </a>
                    <a 
                      href="/terms" 
                      className="hover:text-white transition-colors duration-200"
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
          </PostHogProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
