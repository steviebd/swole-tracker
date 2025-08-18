import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">About Swole Tracker</h1>
          <p className="text-muted-foreground">
            The smart way to track your fitness journey
          </p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Our Mission</CardTitle>
              <CardDescription>
                Empowering fitness enthusiasts to reach their goals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Swole Tracker was built to help fitness enthusiasts track their workouts, 
                monitor progress, and optimize their training. We believe that consistent 
                tracking and data-driven insights are key to achieving your fitness goals.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Key Features</CardTitle>
              <CardDescription>
                What makes Swole Tracker special
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-muted-foreground">
                <li>• Comprehensive workout tracking and templates</li>
                <li>• WHOOP integration for recovery insights</li>
                <li>• AI-powered health advice and recommendations</li>
                <li>• Personal records and progress analytics</li>
                <li>• Offline support for uninterrupted workouts</li>
                <li>• Mobile-first design for gym convenience</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Technology</CardTitle>
              <CardDescription>
                Built with modern, reliable technology
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Swole Tracker is built using Next.js, TypeScript, and the T3 Stack 
                for a fast, reliable, and secure experience. We prioritize user privacy 
                and data security while delivering a seamless fitness tracking experience.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Created By</CardTitle>
              <CardDescription>
                Passionate about fitness and technology
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Swole Tracker was created by Steven Duong, combining a passion for 
                fitness with expertise in software development to create a tool that 
                helps people achieve their fitness goals.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}