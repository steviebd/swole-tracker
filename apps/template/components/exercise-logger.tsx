"use client"

import { useState } from "react"
import { MoreVertical, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { SetSuggestions } from "@/components/set-suggestions"

export function ExerciseLogger() {
  const [expandedExercises, setExpandedExercises] = useState<string[]>(["squat"])

  const toggleExercise = (exercise: string) => {
    setExpandedExercises((prev) => (prev.includes(exercise) ? prev.filter((e) => e !== exercise) : [...prev, exercise]))
  }

  return (
    <div className="space-y-6">
      <SetSuggestions />

      <Card className="bg-gradient-to-br from-card to-card/50 border-border/50 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold">Squat</h3>
              <p className="text-sm text-muted-foreground">Prev best: 110kg × 120 (1 set)</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => toggleExercise("squat")}>
                {expandedExercises.includes("squat") ? "Collapse" : "Expand"}
              </Button>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {expandedExercises.includes("squat") && (
          <CardContent className="space-y-6">
            <div className="bg-muted/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="font-medium">INSIGHTS</span>
                <span className="text-sm">Best: 110kg × 120</span>
                <span className="text-sm text-muted-foreground">1RM: 550.0kg</span>
                <div className="ml-auto">
                  <span className="text-sm">Suggest: 113kg</span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">LAST WORKOUT</h4>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-green-500 text-white text-xs flex items-center justify-center font-bold">
                    3
                  </div>
                  <span className="font-medium">110kg</span>
                  <span className="text-muted-foreground">120 reps</span>
                  <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">Best</Badge>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs flex items-center justify-center">
                    2
                  </div>
                  <span>90kg</span>
                  <span>80 reps</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs flex items-center justify-center">
                    1
                  </div>
                  <span>70kg</span>
                  <span>60 reps</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {[1, 2, 3].map((setNumber) => (
                <div key={setNumber} className="grid grid-cols-12 gap-3 items-center p-4 bg-muted/10 rounded-lg">
                  <div className="col-span-1">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 text-white text-sm font-bold flex items-center justify-center">
                      {setNumber}
                    </div>
                  </div>

                  <div className="col-span-2">
                    <label className="text-xs text-muted-foreground block mb-1">Weight</label>
                    <div className="relative">
                      <Input
                        type="number"
                        placeholder="0"
                        className="pr-8"
                        defaultValue={setNumber === 1 ? "70" : setNumber === 2 ? "90" : "110"}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        kg
                      </span>
                    </div>
                  </div>

                  <div className="col-span-2">
                    <label className="text-xs text-muted-foreground block mb-1">Reps</label>
                    <div className="relative">
                      <Input
                        type="number"
                        placeholder="0"
                        defaultValue={setNumber === 1 ? "60" : setNumber === 2 ? "80" : "120"}
                      />
                    </div>
                  </div>

                  <div className="col-span-1">
                    <label className="text-xs text-muted-foreground block mb-1">Sets</label>
                    <Input type="number" placeholder="1" defaultValue="1" />
                  </div>

                  <div className="col-span-3">
                    <label className="text-xs text-muted-foreground block mb-1">RPE</label>
                    <div className="flex gap-1">
                      {[6, 7, 8, 9, 10].map((rpe) => (
                        <Button key={rpe} variant="outline" size="sm" className="w-8 h-8 p-0 text-xs bg-transparent">
                          {rpe}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="col-span-2">
                    <label className="text-xs text-muted-foreground block mb-1">Rest (s)</label>
                    <div className="flex gap-1">
                      {[30, 60, 90].map((rest) => (
                        <Button key={rest} variant="outline" size="sm" className="text-xs px-2 bg-transparent">
                          {rest}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="col-span-1 flex justify-end">
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
                      ×
                    </Button>
                  </div>
                </div>
              ))}

              <Button variant="outline" className="w-full bg-transparent">
                Add Set
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      <Card className="bg-gradient-to-br from-card to-card/50 border-border/50 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold">Bench</h3>
              <p className="text-sm text-muted-foreground">Prev best: 105kg × 5 (1 set)</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => toggleExercise("bench")}>
                Expand
              </Button>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>
    </div>
  )
}
