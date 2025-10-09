"use client";

import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import Link from "next/link";
import { GoogleAuthButton } from "~/app/_components/google-auth-button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Alert, AlertDescription } from "~/components/ui/alert";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams?.get("redirectTo") || "/";

  // Since WorkOS handles authentication, redirect immediately
  React.useEffect(() => {
    window.location.href = `/api/auth/login?redirectTo=${encodeURIComponent(redirectTo)}`;
  }, [redirectTo]);

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-2xl font-bold sm:text-3xl">
          Redirecting...
        </CardTitle>
        <CardDescription className="text-sm sm:text-base">
          Redirecting to authentication service
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center overflow-x-hidden px-4 sm:px-6 lg:px-8">
      <Suspense
        fallback={
          <Card className="w-full max-w-md">
            <CardHeader className="space-y-4">
              <div className="skeleton h-6 sm:h-8"></div>
              <div className="skeleton h-4"></div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="skeleton h-10"></div>
              <div className="skeleton h-10"></div>
              <div className="skeleton h-10"></div>
            </CardContent>
          </Card>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
