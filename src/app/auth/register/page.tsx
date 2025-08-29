import { withAuth } from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";

export default async function RegisterPage() {
  const { user } = await withAuth();

  // If already authenticated, redirect to home
  if (user) {
    redirect('/');
  }

  // Otherwise, redirect to WorkOS hosted authentication
  // WorkOS handles both sign in and sign up in the same flow
  redirect('/api/auth/login');
}