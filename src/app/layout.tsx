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
          <PostHogProvider>
            <PageTracker />
            <ConnectionStatus />
            <TRPCReactProvider>
              <SyncIndicator />
              <main className="flex-1">
                {children}
              </main>
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
