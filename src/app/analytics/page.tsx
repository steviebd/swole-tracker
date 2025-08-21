import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";

export default function AnalyticsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Analytics</h1>
          <p className="text-muted-foreground">
            Detailed workout analytics and insights
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Coming Soon</CardTitle>
            <CardDescription>
              Advanced analytics features are currently in development
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              We're working on comprehensive analytics to help you track your progress, 
              identify patterns, and optimize your training. Features will include:
            </p>
            <ul className="mt-4 space-y-2 text-muted-foreground">
              <li>• Strength progression charts</li>
              <li>• Volume tracking over time</li>
              <li>• Exercise performance analysis</li>
              <li>• Training frequency insights</li>
              <li>• Personal records visualization</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}