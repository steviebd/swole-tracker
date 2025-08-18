"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "~/lib/supabase-browser";
import Link from "next/link";
import { GoogleAuthButton } from "~/app/_components/google-auth-button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "~/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/";
  const supabase = createBrowserSupabaseClient();

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const { handleSubmit, formState: { isSubmitting, errors }, setError } = form;

  const onSubmit = async (data: LoginForm) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        setError("root", {
          type: "manual",
          message: error.message,
        });
        return;
      }

      router.push(redirectTo);
      router.refresh();
    } catch (_err) {
      setError("root", {
        type: "manual",
        message: "An unexpected error occurred",
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="text-center space-y-2">
        <CardTitle className="text-2xl sm:text-3xl font-bold">Sign In</CardTitle>
        <CardDescription className="text-sm sm:text-base">
          Sign in to your Swole Tracker account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <GoogleAuthButton mode="signin" redirectTo={redirectTo} />
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-card px-2 text-muted-foreground">
                Or continue with email
              </span>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {errors.root && (
              <Alert variant="destructive">
                <AlertDescription>
                  {errors.root.message}
                </AlertDescription>
              </Alert>
            )}

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input 
                      type="email" 
                      placeholder="Enter your email"
                      autoComplete="email"
                      className="w-full"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      className="w-full"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full"
              aria-busy={isSubmitting}
            >
              {isSubmitting ? "Signing In..." : "Sign In"}
            </Button>
          </form>
        </Form>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link
              href="/auth/register"
              className="font-medium text-primary hover:text-primary/90 transition-colors"
            >
              Sign up
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 w-full">
      <div className="w-full max-w-md">
        <Suspense fallback={
          <Card className="w-full">
            <CardHeader className="space-y-4">
              <div className="h-6 sm:h-8 skeleton"></div>
              <div className="h-4 skeleton"></div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-10 skeleton"></div>
              <div className="h-10 skeleton"></div>
              <div className="h-10 skeleton"></div>
            </CardContent>
          </Card>
        }>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}