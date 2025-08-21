import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";

export default function GuidesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Guides</h1>
          <p className="text-muted-foreground">
            Learn how to get the most out of Swole Tracker
          </p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Workout Templates Guide</CardTitle>
              <CardDescription>
                Master the art of creating effective workout templates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Learn how to create, customize, and optimize workout templates 
                for different training goals and schedules.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>WHOOP Integration Setup</CardTitle>
              <CardDescription>
                Connect your WHOOP device for enhanced insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Step-by-step guide to connecting your WHOOP device and leveraging 
                recovery data to optimize your training.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Progress Tracking Best Practices</CardTitle>
              <CardDescription>
                Maximize your fitness journey with effective tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Discover the best practices for tracking your workouts, 
                setting goals, and monitoring your progress over time.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Exercise Database</CardTitle>
              <CardDescription>
                Understanding and customizing your exercise library
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Learn how to search, add, and manage exercises in your personal 
                exercise database for better workout planning.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}