import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function AuthCodeError() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-3xl font-bold text-destructive">Authentication Error</CardTitle>
          <CardDescription>
            There was an error processing your authentication request.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Authentication Failed</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>This could happen if:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>The authentication link has expired</li>
                <li>The link has already been used</li>
                <li>There was a temporary server error</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <Button asChild className="w-full">
              <Link href="/auth/login">
                Try Signing In Again
              </Link>
            </Button>
            <div className="text-center">
              <Link
                href="/auth/register"
                className="text-sm text-primary hover:text-primary/90 transition-colors"
              >
                Or create a new account
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}