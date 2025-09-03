"use client"

import { Bell, Settings, Moon, Sun } from "lucide-react"
import { Button } from "~/components/ui/button"
import { useTheme } from "~/providers/ThemeProvider"
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar"
import { useAuth } from "~/providers/AuthProvider"
import { useEffect, useState } from "react"
import { PreferencesModal } from "~/app/_components/PreferencesModal"

export function DashboardHeader() {
  const { toggle: toggleTheme, resolvedTheme } = useTheme()
  const { user, signOut } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [preferencesOpen, setPreferencesOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!user) return null

  // Extract display name from user metadata or email
  const displayName = user.user_metadata?.first_name || 
                     user.user_metadata?.display_name || 
                     user.email?.split('@')[0] ||
                     'User'

  const toggleUserMenu = () => {
    setUserMenuOpen(!userMenuOpen)
  }

  if (!mounted) {
    return (
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 sm:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <span className="text-primary-foreground font-serif font-black text-xl">S</span>
              </div>
              <div>
                <h1 className="text-2xl font-serif font-black bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Swole Tracker
                </h1>
                <p className="text-muted-foreground text-sm">Welcome back, {displayName}!</p>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-4">
              <Button variant="ghost" size="icon" className="hover:bg-muted">
                <Moon className="h-5 w-5" />
              </Button>

              <Button variant="ghost" size="icon" className="hover:bg-muted">
                <Bell className="h-5 w-5" />
              </Button>

              <Button 
                variant="ghost" 
                size="icon" 
                className="hover:bg-muted"
                onClick={() => {
                  console.log("Preferences button clicked");
                  setPreferencesOpen(true);
                }}
                aria-label="Open Preferences"
                title="Preferences"
              >
                <Settings className="h-5 w-5" />
              </Button>

              <Avatar className="h-11 w-11">
                <AvatarImage src="/fitness-user-avatar.png" />
                <AvatarFallback className="gradient-primary text-primary-foreground font-semibold">
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </header>
    )
  }

  const currentTheme = resolvedTheme

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-6 sm:px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <span className="text-primary-foreground font-serif font-black text-xl">S</span>
            </div>
            <div>
              <h1 className="text-2xl font-serif font-black bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Swole Tracker
              </h1>
              <p className="text-muted-foreground text-sm">Welcome back, {displayName}!</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="hover:bg-muted">
              {currentTheme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>

            <Button variant="ghost" size="icon" className="hover:bg-muted">
              <Bell className="h-5 w-5" />
            </Button>

            <Button 
              variant="ghost" 
              size="icon" 
              className="hover:bg-muted" 
              onClick={() => {
                console.log("Preferences button clicked");
                setPreferencesOpen(true);
              }}
              aria-label="Open Preferences"
              title="Preferences"
            >
              <Settings className="h-5 w-5" />
            </Button>

            <div className="relative">
              <Avatar className="h-11 w-11 cursor-pointer" onClick={toggleUserMenu}>
                <AvatarImage src="/fitness-user-avatar.png" />
                <AvatarFallback className="gradient-primary text-primary-foreground font-semibold">
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-card rounded-lg shadow-lg border border-border z-50">
                  <div className="py-2">
                    <div className="px-4 py-2 text-sm text-muted-foreground border-b border-border">
                      {user.email}
                    </div>
                    <button
                      onClick={() => {
                        signOut()
                        setUserMenuOpen(false)
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Preferences Modal */}
      <PreferencesModal 
        open={preferencesOpen} 
        onClose={() => {
          console.log("Closing preferences modal");
          setPreferencesOpen(false);
        }} 
      />
    </header>
  )
}