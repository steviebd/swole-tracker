"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

const data = [
  { date: "Aug 10", weight: 100 },
  { date: "Aug 12", weight: 102.5 },
  { date: "Aug 14", weight: 105 },
  { date: "Aug 16", weight: 110 },
]

export function StrengthChart() {
  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-serif font-black">Strength Progression</CardTitle>
          <Select defaultValue="bench">
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bench">Bench Press</SelectItem>
              <SelectItem value="squat">Squat</SelectItem>
              <SelectItem value="deadlift">Deadlift</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground">Current Max</p>
            <p className="text-2xl font-serif font-black text-foreground">105kg</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground">Best 1RM Est.</p>
            <p className="text-2xl font-serif font-black text-foreground">122.5kg</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground">Sessions</p>
            <p className="text-2xl font-serif font-black text-foreground">3</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground">Progress</p>
            <p className="text-2xl font-serif font-black text-chart-1">+105.0kg</p>
          </div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="hsl(var(--chart-1))"
                strokeWidth={3}
                dot={{ fill: "hsl(var(--chart-1))", strokeWidth: 2, r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
