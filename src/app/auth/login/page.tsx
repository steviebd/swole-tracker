import { redirect } from "next/navigation";

export default async function LoginPage() {
  // Always hand off to our login route which builds the WorkOS URL
  redirect('/api/auth/login');
}