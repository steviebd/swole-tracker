import { redirect } from "next/navigation";

export default async function RegisterPage() {
  // WorkOS handles both sign in and sign up in the same flow
  redirect('/api/auth/login');
}