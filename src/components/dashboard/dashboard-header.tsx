"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "~/providers/AuthProvider";
import { useTheme } from "~/providers/ThemeProvider";
import { api } from "~/trpc/react";
import { GlassSurface } from "~/components/ui/glass-surface";
import { Breadcrumb } from "~/components/navigation/breadcrumb";

// Icon components (using existing SVG icons)
const HomeIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const WorkoutIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const TemplatesIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const ProgressIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const SunIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const MoonIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
  </svg>
);

const UserIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const LogoutIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

const MenuIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const XIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  authRequired?: boolean;
}

const navigationItems: NavItem[] = [
  { href: "/", label: "Home", icon: HomeIcon, authRequired: false },
  { href: "/workout/start", label: "Start Workout", icon: WorkoutIcon, authRequired: true },
  { href: "/templates", label: "Templates", icon: TemplatesIcon, authRequired: true },
  { href: "/workouts", label: "Progress", icon: ProgressIcon, authRequired: true },
];

// Helper function to get user's first name
function getFirstName(user: { email?: string } | null, whoopProfile: { first_name?: string | null } | null | undefined): string {
  // Try WHOOP profile first (most reliable)
  if (whoopProfile?.first_name) {
    return whoopProfile.first_name;
  }
  
  // Fall back to email-based extraction
  if (user?.email) {
    const emailLocal = user.email.split("@")[0];
    if (emailLocal) {
      const parts = emailLocal.split(".");
      if (parts.length >= 1 && parts[0]) {
        // Capitalize first letter
        return parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
      }
    }
  }
  
  return "";
}

// Get motivational greeting based on time of day
function getGreeting(): string {
  const hour = new Date().getHours();
  
  if (hour < 6) return "Rise and grind";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Keep pushing";
  if (hour < 21) return "Evening warrior";
  return "Late night gains";
}

export function DashboardHeader() {
  const { user, isLoading, signOut } = useAuth();
  const { resolvedTheme, toggle: toggleTheme } = useTheme();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Fetch WHOOP profile for first name if available
  const { data: whoopProfile } = api.whoop.getProfile.useQuery(undefined, {
    enabled: !!user,
    retry: false, // Don't retry if user doesn't have WHOOP connected
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      setMobileMenuOpen(false);
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  const visibleNavItems = navigationItems.filter(
    (item) => !item.authRequired || user
  );

  // Get user initials for avatar fallback
  const getUserInitials = () => {
    if (!user?.email) return "U";
    const email = user.email;
    const parts = email.split("@")[0]?.split(".") || [email];
    if (parts.length >= 2) {
      return `${parts[0]?.[0] || ""}${parts[1]?.[0] || ""}`.toUpperCase();
    }
    return email.slice(0, 2).toUpperCase();
  };

  // Generate personalized greeting
  const generateGreeting = () => {
    const firstName = getFirstName(user, whoopProfile);
    const greeting = getGreeting();
    
    if (firstName) {
      return `${greeting}, ${firstName}!`;
    }
    return `${greeting}!`;
  };

  if (!mounted) {
    // Return skeleton during hydration to prevent flash
    return (
      <header className="sticky top-0 z-50">
        <GlassSurface as="div" className="border-b">
          <div className="container-default">
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary">
                  <span className="font-bold text-sm text-primary-foreground">S</span>
                </div>
                <div className="flex flex-col">
                  <h1 className="text-lg font-bold text-foreground">Swole Tracker</h1>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 rounded-lg transition-all duration-300 hover:bg-muted/50">
                  <div className="w-5 h-5 bg-muted-foreground" />
                </button>
              </div>
            </div>
          </div>
        </GlassSurface>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50">
      <GlassSurface as="div" className="border-b">
        <div className="container-default">
          <div className="flex items-center justify-between py-3">
            {/* Logo, Title, and Greeting */}
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-3 group">
                {/* Enhanced gradient logo */}
                <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary via-blue-500 to-purple-600" />
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-white/10" />
                  <span className="relative font-bold text-sm text-white drop-shadow-sm">S</span>
                </div>
                
                <div className="flex flex-col">
                  <h1 className="text-lg font-bold transition-colors group-hover:text-primary text-foreground">
                    Swole Tracker
                  </h1>
                  {/* Motivational greeting */}
                  {user && (
                    <p className="text-sm text-muted-foreground transition-colors group-hover:text-primary/70">
                      {generateGreeting()}
                    </p>
                  )}
                </div>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-2" role="navigation" aria-label="Primary navigation">
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 hover:scale-105 ${
                      active
                        ? "text-primary bg-gradient-to-r from-primary/10 to-primary/5 shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-2">
              {/* Floating theme toggle with enhanced effects */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg transition-all duration-300 hover:bg-muted/50 hover:scale-110 text-muted-foreground hover:text-foreground"
                aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} theme. Current theme: ${resolvedTheme}`}
                aria-pressed={resolvedTheme === "dark"}
                title={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} theme`}
              >
                <span className="sr-only">
                  {resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                </span>
                <div className="relative">
                  {resolvedTheme === "dark" ? (
                    <SunIcon className="w-5 h-5 transition-transform duration-300" aria-hidden="true" />
                  ) : (
                    <MoonIcon className="w-5 h-5 transition-transform duration-300" aria-hidden="true" />
                  )}
                </div>
              </button>

              {/* User Menu */}
              {!isLoading && (
                <>
                  {user ? (
                    <div className="flex items-center gap-2">
                      {/* Enhanced user avatar with gradient */}
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted transition-all duration-300">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium bg-gradient-to-br from-primary to-purple-600 text-white shadow-sm">
                          {getUserInitials()}
                        </div>
                        <span className="text-sm font-medium text-muted-foreground">
                          {getFirstName(user, whoopProfile) || user.email?.split("@")[0]}
                        </span>
                      </div>
                      {/* Sign Out Button */}
                      <button
                        onClick={handleSignOut}
                        className="p-2 rounded-lg transition-all duration-300 hover:bg-muted/50 hover:scale-110 text-muted-foreground hover:text-foreground"
                        aria-label="Sign out"
                        title="Sign out"
                      >
                        <LogoutIcon className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <Link
                      href="/auth/login"
                      className="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 bg-gradient-to-r from-primary to-purple-600 text-white hover:scale-105 hover:shadow-md"
                    >
                      Sign In
                    </Link>
                  )}
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg transition-all duration-300 hover:bg-muted/50 hover:scale-110 text-muted-foreground"
              aria-label="Toggle mobile menu"
              aria-expanded={mobileMenuOpen}
              style={{ minHeight: '44px', minWidth: '44px' }} // Touch-friendly size
            >
              {mobileMenuOpen ? (
                <XIcon className="w-5 h-5" />
              ) : (
                <MenuIcon className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t py-2 border-border/50 bg-gradient-to-b from-transparent to-muted/20">
              <nav className="flex flex-col gap-2" role="navigation" aria-label="Mobile navigation">
                {visibleNavItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                        active
                          ? "text-primary bg-gradient-to-r from-primary/10 to-primary/5"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      }`}
                      style={{ minHeight: '44px' }} // Touch-friendly size
                      aria-current={active ? "page" : undefined}
                    >
                      <Icon className="w-5 h-5" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              {/* Mobile Actions */}
              <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/50">
                {/* Theme Toggle */}
                <button
                  onClick={toggleTheme}
                  className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-300 hover:bg-muted/50 text-muted-foreground"
                  style={{ minHeight: '44px' }} // Touch-friendly size
                  aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} theme. Current theme: ${resolvedTheme}`}
                  aria-pressed={resolvedTheme === "dark"}
                >
                  {resolvedTheme === "dark" ? (
                    <>
                      <SunIcon className="w-5 h-5" aria-hidden="true" />
                      <span>Light Mode</span>
                    </>
                  ) : (
                    <>
                      <MoonIcon className="w-5 h-5" aria-hidden="true" />
                      <span>Dark Mode</span>
                    </>
                  )}
                </button>

                {/* User Section */}
                {!isLoading && (
                  <>
                    {user ? (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <UserIcon className="w-4 h-4" />
                          <span>{getFirstName(user, whoopProfile) || user.email?.split("@")[0]}</span>
                        </div>
                        <button
                          onClick={handleSignOut}
                          className="flex items-center gap-2 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-300 hover:bg-muted/50 text-muted-foreground"
                          style={{ minHeight: '44px' }} // Touch-friendly size
                        >
                          <LogoutIcon className="w-5 h-5" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    ) : (
                      <Link
                        href="/auth/login"
                        onClick={() => setMobileMenuOpen(false)}
                        className="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 bg-gradient-to-r from-primary to-purple-600 text-white hover:shadow-md"
                        style={{ minHeight: '44px' }} // Touch-friendly size
                      >
                        Sign In
                      </Link>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Breadcrumb navigation - shows below header on authenticated pages */}
        {user && (
          <div className="container-default pb-2">
            <Breadcrumb />
          </div>
        )}
      </GlassSurface>
    </header>
  );
}