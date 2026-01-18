"use client";

import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Dumbbell, Layers, LineChart, Menu, Moon, Sun } from "lucide-react";

import { GlobalStatusTray } from "~/components/global-status-tray";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "~/components/ui/sheet";
import { cn } from "~/lib/utils";
import { useAuth } from "~/providers/AuthProvider";
import { useTheme } from "~/providers/ThemeProvider";

interface PrimaryNavItem {
  label: string;
  to: string;
  icon: typeof Dumbbell;
  requiresAuth?: boolean;
}

const PRIMARY_NAV: PrimaryNavItem[] = [
  {
    label: "Dashboard",
    to: "/workout/start",
    icon: Dumbbell,
    requiresAuth: true,
  },
  { label: "Workouts", to: "/workouts", icon: Layers, requiresAuth: true },
  { label: "Progress", to: "/progress", icon: LineChart, requiresAuth: true },
  { label: "Templates", to: "/templates", icon: Layers, requiresAuth: true },
];

export function DashboardHeader() {
  const location = useLocation();
  const { toggle: toggleTheme, resolvedTheme } = useTheme();
  const { user, signOut } = useAuth();

  const [hasMounted, setHasMounted] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    setUserMenuOpen(false);
    setMobileNavOpen(false);
  }, [location.pathname]);

  const navItems = useMemo(() => {
    if (!user) return [];
    return PRIMARY_NAV.filter((item) => !item.requiresAuth || !!user);
  }, [user]);

  const showNav = navItems.length > 0;

  const initials = useMemo(() => {
    if (!user) return "U";
    const emailPrefix = user.email?.split("@")[0];
    const matches = (emailPrefix || "U").match(/\b\w/g) ?? [];
    return matches.slice(0, 2).join("").toUpperCase() || "U";
  }, [user]);

  const isActive = (to: string) => {
    if (!location.pathname) return false;
    if (to === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(to);
  };

  const themeIcon = hasMounted ? (
    resolvedTheme === "dark" ? (
      <Sun className="h-5 w-5" />
    ) : (
      <Moon className="h-5 w-5" />
    )
  ) : (
    <Moon className="h-5 w-5 opacity-0" />
  );

  const renderNavLink = (item: PrimaryNavItem) => {
    const Icon = item.icon;
    const active = isActive(item.to);
    return (
      <Link
        key={item.to}
        to={item.to}
        className={cn(
          "group flex items-center gap-2 rounded-full px-3 py-2 text-sm transition-all",
          active
            ? "from-primary/20 to-accent/20 text-foreground bg-gradient-to-r shadow-sm"
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
        )}
      >
        <Icon className={cn("h-4 w-4", active && "text-primary")} aria-hidden />
        <span>{item.label}</span>
      </Link>
    );
  };

  const handleSignOut = async () => {
    await signOut();
    setUserMenuOpen(false);
  };

  return (
    <header className="border-border/60 bg-background/75 sticky top-0 z-50 border-b backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          {showNav ? (
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  aria-label="Open navigation menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="border-border/40 bg-background/95 w-full max-w-xs border-r px-5 py-6"
              >
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-2">
                    <span className="from-primary via-primary/60 to-accent text-primary-foreground flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br text-lg font-black shadow-sm">
                      S
                    </span>
                    <span className="from-primary to-accent bg-gradient-to-r bg-clip-text text-lg font-semibold text-transparent">
                      Swole Tracker
                    </span>
                  </div>
                  <nav className="space-y-1" aria-label="Primary">
                    {navItems.map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setMobileNavOpen(false)}
                        className={cn(
                          "flex items-center justify-between rounded-xl border border-transparent px-3 py-3 text-sm font-medium transition-colors",
                          isActive(item.to)
                            ? "border-primary/40 bg-primary/10 text-foreground"
                            : "text-muted-foreground hover:border-border/50 hover:bg-muted/50 hover:text-foreground",
                        )}
                      >
                        <span className="flex items-center gap-3">
                          <item.icon className="h-4 w-4" aria-hidden />
                          {item.label}
                        </span>
                      </Link>
                    ))}
                  </nav>
                  <div className="border-border/40 space-y-3 border-t pt-4">
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-3"
                      onClick={() => toggleTheme()}
                    >
                      {hasMounted && resolvedTheme === "dark" ? (
                        <Sun className="h-4 w-4" aria-hidden />
                      ) : (
                        <Moon className="h-4 w-4" aria-hidden />
                      )}
                      Toggle theme
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          ) : null}

          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="flex items-center gap-2"
              aria-label="Swole Tracker home"
            >
              <span className="from-primary via-primary/60 to-accent text-primary-foreground flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br text-lg font-black shadow-sm">
                S
              </span>
              {user && (
                <span className="text-muted-foreground text-xs">
                  Welcome back
                </span>
              )}
            </Link>
            {showNav && (
              <nav
                className="hidden items-center gap-1 md:flex"
                aria-label="Primary"
              >
                {navItems.map(renderNavLink)}
              </nav>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {user && <GlobalStatusTray />}

          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            onClick={toggleTheme}
            className="hidden sm:inline-flex"
          >
            {themeIcon}
          </Button>

          {user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen((open) => !open)}
                className="border-border/60 bg-card/80 hover:border-primary/40 flex h-9 w-9 items-center justify-center rounded-full border transition-colors"
                aria-label="Account menu"
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/20 text-primary text-sm font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </button>
              {userMenuOpen && (
                <div className="border-border/60 bg-card/95 absolute right-0 mt-2 w-52 overflow-hidden rounded-2xl border shadow-xl backdrop-blur">
                  <div className="border-border/50 text-muted-foreground border-b px-4 py-3 text-sm">
                    {user.email}
                  </div>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="text-foreground hover:bg-muted/60 flex w-full items-center justify-between px-4 py-3 text-sm font-medium transition-colors"
                  >
                    Sign out
                    <span className="text-muted-foreground text-xs">↩</span>
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
