import Link from "next/link";
import { getSignInUrl, getSignUpUrl } from "@workos-inc/authkit-nextjs";

export default async function SignInPage() {
  const signInUrl = await getSignInUrl();
  const signUpUrl = await getSignUpUrl();

  return (
    <div className="flex flex-col justify-center items-center h-screen space-y-4">
      <h1 className="text-2xl font-bold">Welcome to Swole Tracker</h1>
      <div className="flex flex-col space-y-2">
        <Link 
          href={signInUrl}
          className="btn-primary px-6 py-3 text-center rounded-lg"
        >
          Sign In
        </Link>
        <Link 
          href={signUpUrl}
          className="btn-secondary px-6 py-3 text-center rounded-lg"
        >
          Sign Up
        </Link>
      </div>
    </div>
  );
}