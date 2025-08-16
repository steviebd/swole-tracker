"use client"

import { Bell, Settings, Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function DashboardHeader() {
  const { theme, setTheme } = useTheme()

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <span className="text-primary-foreground font-serif font-black text-xl">S</span>
            </div>
            <div>
              <h1 className="text-2xl font-serif font-black bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Swole Tracker
              </h1>
              <p className="text-muted-foreground text-sm">Welcome back, Steven!</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="hover:bg-muted"
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>

            <Button variant="ghost" size="icon" className="hover:bg-muted">
              <Bell className="h-5 w-5" />
            </Button>

            <Button variant="ghost" size="icon" className="hover:bg-muted">
              <Settings className="h-5 w-5" />
            </Button>

            <Avatar className="h-9 w-9">
              <AvatarImage src="/fitness-user-avatar.png" />
              <AvatarFallback className="gradient-primary text-primary-foreground font-semibold">SB</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </header>
  )
}
