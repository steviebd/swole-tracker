import { getUser } from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const { user } = await getUser();

  // If already authenticated, redirect to home
  if (user) {
    redirect('/');
  }

  // Otherwise, redirect to WorkOS hosted authentication
  redirect('/api/auth/login');
}