import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";

export default function SupportPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Support</h1>
          <p className="text-muted-foreground">
            Get help and support for Swole Tracker
          </p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Technical Support</CardTitle>
              <CardDescription>
                Having technical issues? We're here to help
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                If you're experiencing technical difficulties with Swole Tracker, 
                please describe your issue and we'll get back to you as soon as possible.
              </p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p><strong>Response Time:</strong> Usually within 24 hours</p>
                <p><strong>Coverage:</strong> Monday - Friday, 9 AM - 5 PM PST</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Feature Requests</CardTitle>
              <CardDescription>
                Have an idea for improving Swole Tracker?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                We love hearing from our users! Share your ideas for new features 
                or improvements to existing functionality.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bug Reports</CardTitle>
              <CardDescription>
                Found something that's not working correctly?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Help us improve Swole Tracker by reporting bugs or issues you encounter. 
                Please include as much detail as possible about what happened and how to reproduce it.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}