"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "~/providers/AuthProvider";
import { useTheme } from "~/providers/ThemeProvider";

// Icon components (using simple SVG icons to avoid external dependencies)
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

export function Header() {
  const { user, isLoading, signOut } = useAuth();
  const { resolvedTheme, toggle: toggleTheme } = useTheme();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

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
    if (!pathname) return false;
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

  if (!mounted) {
    // Return skeleton during hydration to prevent flash
    return (
      <header className="glass-header sticky top-0 z-50">
        <div className="container-default">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary">
                <span className="font-bold text-sm text-primary-foreground">S</span>
              </div>
              <h1 className="text-lg font-bold text-foreground">Swole Tracker</h1>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-lg transition-colors hover:bg-muted">
                <div className="w-5 h-5 bg-muted-foreground" />
              </button>
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="glass-header sticky top-0 z-50">
      <div className="container-default">
        <div className="flex items-center justify-between py-3">
          {/* Logo and Title */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 bg-primary">
                <span className="font-bold text-sm text-primary-foreground">S</span>
              </div>
              <h1 className="text-lg font-bold transition-colors group-hover:text-primary text-foreground">
                Swole Tracker
              </h1>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1" role="navigation" aria-label="Primary navigation">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    active
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
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
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg transition-colors hover:bg-muted text-muted-foreground"
              aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} theme. Current theme: ${resolvedTheme}`}
              aria-pressed={resolvedTheme === "dark"}
              title={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} theme`}
            >
              <span className="sr-only">
                {resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              </span>
              {resolvedTheme === "dark" ? (
                <SunIcon className="w-5 h-5" aria-hidden="true" />
              ) : (
                <MoonIcon className="w-5 h-5" aria-hidden="true" />
              )}
            </button>

            {/* User Menu */}
            {!isLoading && (
              <>
                {user ? (
                  <div className="flex items-center gap-2">
                    {/* User Avatar */}
                    <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-muted">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium bg-primary text-primary-foreground">
                        {getUserInitials()}
                      </div>
                      <span className="text-sm font-medium text-muted-foreground">
                        {user.email?.split("@")[0]}
                      </span>
                    </div>
                    {/* Sign Out Button */}
                    <button
                      onClick={handleSignOut}
                      className="p-2 rounded-lg transition-colors hover:bg-muted text-muted-foreground"
                      aria-label="Sign out"
                      title="Sign out"
                    >
                      <LogoutIcon className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <Link
                    href="/auth/login"
                    className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors bg-primary text-primary-foreground hover:bg-primary/90"
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
            className="md:hidden p-2 rounded-lg transition-colors hover:bg-muted text-muted-foreground"
            aria-label="Toggle mobile menu"
            aria-expanded={mobileMenuOpen}
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
          <div className="md:hidden border-t py-2 border-border">
            <nav className="flex flex-col gap-1" role="navigation" aria-label="Mobile navigation">
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      active
                        ? "text-primary bg-primary/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Mobile Actions */}
            <div className="flex items-center justify-between pt-2 mt-2 border-t border-border">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-muted text-muted-foreground"
                aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} theme. Current theme: ${resolvedTheme}`}
                aria-pressed={resolvedTheme === "dark"}
              >
                {resolvedTheme === "dark" ? (
                  <>
                    <SunIcon className="w-4 h-4" aria-hidden="true" />
                    <span>Light Mode</span>
                  </>
                ) : (
                  <>
                    <MoonIcon className="w-4 h-4" aria-hidden="true" />
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
                        {user.email?.split("@")[0]}
                      </div>
                      <button
                        onClick={handleSignOut}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-muted text-muted-foreground"
                      >
                        <LogoutIcon className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  ) : (
                    <Link
                      href="/auth/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors bg-primary text-primary-foreground hover:bg-primary/90"
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
    </header>
  );
}