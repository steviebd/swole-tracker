import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";

export default function ContactPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Contact Us</h1>
          <p className="text-muted-foreground">
            Get in touch with the Swole Tracker team
          </p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>General Inquiries</CardTitle>
              <CardDescription>
                Questions about Swole Tracker or need general information?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                For general questions about Swole Tracker, features, or how to get started, 
                please check our Help Center first. If you can't find what you're looking for, 
                feel free to reach out to us directly.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Technical Support</CardTitle>
              <CardDescription>
                Need help with technical issues or bugs?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                If you're experiencing technical difficulties, please visit our 
                Support page where you can report issues and get assistance from our team.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Feature Requests & Feedback</CardTitle>
              <CardDescription>
                Have ideas for improving Swole Tracker?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                We love hearing from our users! Your feedback and feature requests 
                help us improve Swole Tracker and build features that matter most to our community.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Business & Partnerships</CardTitle>
              <CardDescription>
                Interested in partnerships or business opportunities?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                For business inquiries, partnership opportunities, or press-related questions, 
                please reach out and we'll get back to you as soon as possible.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Connect With Us</CardTitle>
              <CardDescription>
                Follow us on social media for updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Stay up to date with the latest Swole Tracker news, updates, and fitness tips:
              </p>
              <div className="flex gap-4">
                <a 
                  href="https://twitter.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 transition-colors"
                >
                  Twitter
                </a>
                <a 
                  href="https://github.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 transition-colors"
                >
                  GitHub
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}