"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bell,
  Dumbbell,
  LayoutDashboard,
  Layers,
  LineChart,
  Menu,
  Moon,
  Settings,
  Sun,
  type LucideIcon,
} from "lucide-react";

import { PreferencesModal } from "~/app/_components/PreferencesModal";
import { GlobalStatusTray } from "~/components/global-status-tray";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "~/components/ui/sheet";
import { cn } from "~/lib/utils";
import { useAuth } from "~/providers/AuthProvider";
import { useTheme } from "~/providers/ThemeProvider";

interface PrimaryNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  requiresAuth?: boolean;
}

const PRIMARY_NAV: PrimaryNavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard, requiresAuth: true },
  { label: "Workouts", href: "/workouts", icon: Dumbbell, requiresAuth: true },
  { label: "Progress", href: "/progress", icon: LineChart, requiresAuth: true },
  { label: "Templates", href: "/templates", icon: Layers, requiresAuth: true },
  { label: "Whoop", href: "/connect-whoop", icon: Activity, requiresAuth: true },
];

export function DashboardHeader() {
  const pathname = usePathname();
  const { toggle: toggleTheme, resolvedTheme } = useTheme();
  const { user, isLoading, signOut } = useAuth();

  const [hasMounted, setHasMounted] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    setUserMenuOpen(false);
    setMobileNavOpen(false);
  }, [pathname]);

  const navItems = useMemo(() => {
    if (!user) return [];
    return PRIMARY_NAV.filter((item) => !item.requiresAuth || !!user);
  }, [user]);

  const showNav = navItems.length > 0;

  const displayName = useMemo(() => {
    if (!user) return "";

    const firstName = user.user_metadata?.first_name;
    if (typeof firstName === "string" && firstName.trim().length > 0) {
      return firstName.trim();
    }

    const display = user.user_metadata?.display_name;
    if (typeof display === "string" && display.trim().length > 0) {
      return display.trim();
    }

    const emailPrefix = user.email?.split("@")[0];
    if (emailPrefix && emailPrefix.length > 0) {
      return emailPrefix;
    }

    return "Athlete";
  }, [user]);

  const initials = useMemo(() => {
    if (!user) return "";
    const nameSource = displayName || user.email || "";
    const matches = nameSource.match(/\b\w/g) ?? [];
    const letters = matches.slice(0, 2).join("");
    return letters.toUpperCase() || "S";
  }, [displayName, user]);

  const isActive = (href: string) => {
    if (!pathname) return false;
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  const themeIcon = hasMounted ? (resolvedTheme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />) : (
    <Moon className="h-5 w-5 opacity-0" />
  );

  const renderNavLink = (item: PrimaryNavItem) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "group flex items-center gap-2 rounded-full px-3 py-2 text-sm transition-all",
          active
            ? "bg-gradient-to-r from-primary/20 to-accent/20 text-foreground shadow-sm"
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
        )}
      >
        <Icon className={cn("h-4 w-4", active && "text-primary")}
          aria-hidden
        />
        <span className="hidden lg:inline">{item.label}</span>
        <span className="lg:hidden">{item.label}</span>
      </Link>
    );
  };

  const handleSignOut = async () => {
    await signOut();
    setUserMenuOpen(false);
  };

  const HeaderBrand = (
    <Link href="/" className="flex items-center gap-2" aria-label="Swole Tracker home">
      <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-primary/60 to-accent text-lg font-black text-primary-foreground shadow-sm">
        S
      </span>
      <div className="flex flex-col">
        <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-lg font-semibold text-transparent">
          Swole Tracker
        </span>
        {user && (
          <span className="text-xs text-muted-foreground">
            Welcome back, {displayName}
          </span>
        )}
      </div>
    </Link>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/75 backdrop-blur-xl">
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
              <SheetContent side="left" className="w-full max-w-xs border-r border-border/40 bg-background/95 px-5 py-6">
                <div className="flex flex-col gap-6">
                  <div>{HeaderBrand}</div>
                  <nav className="space-y-1" aria-label="Primary">
                    {navItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileNavOpen(false)}
                        className={cn(
                          "flex items-center justify-between rounded-xl border border-transparent px-3 py-3 text-sm font-medium transition-colors",
                          isActive(item.href)
                            ? "border-primary/40 bg-primary/10 text-foreground"
                            : "text-muted-foreground hover:border-border/50 hover:bg-muted/50 hover:text-foreground",
                        )}
                      >
                        <span className="flex items-center gap-3">
                          <item.icon className="h-4 w-4" aria-hidden />
                          {item.label}
                        </span>
                        {isActive(item.href) && <span className="text-xs text-primary">Active</span>}
                      </Link>
                    ))}
                  </nav>

                  <div className="space-y-3 border-t border-border/40 pt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
                      Quick controls
                    </p>
                    <div onClick={() => setMobileNavOpen(false)}>
                      <GlobalStatusTray />
                    </div>
                    <Button
                      variant="outline"
                      className="justify-start gap-3"
                      onClick={() => {
                        toggleTheme();
                        setMobileNavOpen(false);
                      }}
                    >
                      {hasMounted && resolvedTheme === "dark" ? (
                        <Sun className="h-4 w-4" aria-hidden />
                      ) : (
                        <Moon className="h-4 w-4" aria-hidden />
                      )}
                      Toggle theme
                    </Button>
                    <Button
                      variant="outline"
                      className="justify-start gap-3"
                      onClick={() => {
                        setPreferencesOpen(true);
                        setMobileNavOpen(false);
                      }}
                    >
                      <Settings className="h-4 w-4" aria-hidden /> Preferences
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          ) : null}

          <div className="flex items-center gap-4">
            {HeaderBrand}
            {showNav && (
              <nav className="hidden md:flex items-center gap-1" aria-label="Primary">
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

          <Button
            variant="ghost"
            size="icon"
            aria-label="Notifications"
            className="hidden sm:inline-flex"
          >
            <Bell className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            aria-label="Open preferences"
            onClick={() => setPreferencesOpen(true)}
            className="hidden sm:inline-flex"
          >
            <Settings className="h-5 w-5" />
          </Button>

          {user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen((open) => !open)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-card/80 transition-colors hover:border-primary/40"
                aria-label="Account menu"
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/fitness-user-avatar.png" alt={`${displayName}'s avatar`} />
                  <AvatarFallback className="bg-primary/20 text-sm font-semibold text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-2xl border border-border/60 bg-card/95 shadow-xl backdrop-blur">
                  <div className="border-b border-border/50 px-4 py-3 text-sm text-muted-foreground">
                    {user.email}
                  </div>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/60"
                  >
                    Sign out
                    <span className="text-xs text-muted-foreground">↩</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            !isLoading && (
              <div className="flex items-center gap-2">
                <Link
                  href="/auth/login"
                  className="rounded-full border border-border/60 px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary/50 hover:bg-primary/10"
                >
                  Sign in
                </Link>
                <Button
                  className="rounded-full bg-gradient-to-r from-primary to-accent px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90"
                  asChild
                >
                  <Link href="/auth/register">Create account</Link>
                </Button>
              </div>
            )
          )}
        </div>
      </div>

      <PreferencesModal
        open={preferencesOpen}
        onClose={() => setPreferencesOpen(false)}
      />
    </header>
  );
}
