import { Brain, CheckCircle, Settings } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function SetSuggestions() {
  const suggestions = [
    {
      setNumber: 1,
      weight: "115kg",
      reps: "5",
      rest: "2 minutes",
      rationale:
        "Historical data shows steady weight increases (e.g., 100kg to 105kg), with no cross-template linking; apply full overload; rest 2 minutes for strength exercise based on rho.",
    },
    {
      setNumber: 2,
      weight: "110kg",
      reps: "5",
      rest: "2 minutes",
      rationale:
        "Reduce weight by 5% for set 2 fatigue; reps remain stable per history; rest 2 minutes 15 seconds to support progressive overload without overexertion.",
    },
    {
      setNumber: 3,
      weight: "105kg",
      reps: "5",
      rest: "3 minutes",
      rationale:
        "Apply 10% fatigue reduction; consistent with prior bests like 525kg volume; rest 2 minutes 30 seconds to prioritize recovery and session completion.",
    },
  ]

  return (
    <Card className="bg-gradient-to-br from-card to-card/50 border-border/50 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl font-serif font-bold">
          <Brain className="h-5 w-5 text-primary" />
          Set Suggestions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {suggestions.map((suggestion) => (
          <div key={suggestion.setNumber} className="bg-muted/20 rounded-lg p-4 border border-border/50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-lg">Set {suggestion.setNumber}</h3>
              <div className="flex gap-2">
                <Button size="sm" className="bg-gradient-to-r from-primary to-accent text-white">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Accept AI
                </Button>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-1" />
                  Options
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-3">
              <div>
                <span className="text-sm text-muted-foreground">Suggested Weight</span>
                <div className="text-xl font-bold text-primary">{suggestion.weight}</div>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Suggested Reps</span>
                <div className="text-xl font-bold text-primary">{suggestion.reps}</div>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Suggested Rest</span>
                <div className="text-xl font-bold text-primary">{suggestion.rest}</div>
              </div>
            </div>

            <div className="bg-muted/30 rounded p-3">
              <span className="text-sm font-medium text-muted-foreground block mb-1">AI Rationale</span>
              <p className="text-sm leading-relaxed">{suggestion.rationale}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
