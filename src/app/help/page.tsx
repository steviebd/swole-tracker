import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";

export default function HelpPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Help Center</h1>
          <p className="text-muted-foreground">
            Get help with using Swole Tracker
          </p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
              <CardDescription>
                Learn the basics of tracking your workouts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-muted-foreground">
                <li>• Creating your first workout template</li>
                <li>• Starting and completing workout sessions</li>
                <li>• Understanding the exercise database</li>
                <li>• Setting up WHOOP integration</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Common Questions</CardTitle>
              <CardDescription>
                Frequently asked questions and troubleshooting
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-muted-foreground">
                <li>• How do I sync my WHOOP data?</li>
                <li>• Can I work out offline?</li>
                <li>• How do I edit or delete exercises?</li>
                <li>• What are personal records and how are they calculated?</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Support</CardTitle>
              <CardDescription>
                Need more help? Get in touch with our team
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                For additional support, please visit our support page or contact us directly.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}