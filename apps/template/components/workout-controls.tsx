import { Plus, Save, CheckCircle, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export function WorkoutControls() {
  return (
    <div className="space-y-6">
      <div className="flex gap-4 justify-center">
        <Button variant="outline" className="flex-1 max-w-xs bg-transparent">
          <Plus className="h-4 w-4 mr-2" />
          Add Set
        </Button>
        <Button variant="outline" className="flex-1 max-w-xs bg-transparent">
          <Save className="h-4 w-4 mr-2" />
          Save
        </Button>
        <Button className="flex-1 max-w-xs bg-gradient-to-r from-primary to-accent text-white">
          <CheckCircle className="h-4 w-4 mr-2" />
          Complete
        </Button>
      </div>

      <div className="flex justify-center">
        <Button variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10">
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Workout
        </Button>
      </div>

      <footer className="text-center space-y-2 pt-8 border-t border-border/50">
        <div className="flex justify-center gap-6 text-sm text-muted-foreground">
          <a href="#" className="hover:text-foreground transition-colors">
            Privacy Policy
          </a>
          <a href="#" className="hover:text-foreground transition-colors">
            Terms of Service
          </a>
        </div>
        <p className="text-xs text-muted-foreground">© 2025 Steven Duong. All rights reserved.</p>
      </footer>
    </div>
  )
}
