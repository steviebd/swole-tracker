"use client";

import React from "react";
import { useTheme } from "~/providers/ThemeProvider";
import { HomePageHeader } from "./HomePageHeader";
import { PreferencesStatusBar } from "./PreferencesStatusBar";

interface HomePageLayoutProps {
  children: React.ReactNode;
  showHeader?: boolean;
  showStatusBar?: boolean;
}

export function HomePageLayout({ children, showHeader = true, showStatusBar = true }: HomePageLayoutProps) {
  const { theme, resolvedTheme } = useTheme();

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      theme !== "system" || (theme === "system" && resolvedTheme === "dark") 
        ? "bg-black" 
        : "bg-gray-50 dark:bg-gray-950"
    }`}>
      {showStatusBar && <PreferencesStatusBar />}
      {showHeader && <HomePageHeader />}
      
      <main className="container mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}