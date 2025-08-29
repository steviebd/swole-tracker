import { redirect } from "next/navigation";
import { getSignInUrl } from "@workos-inc/authkit-nextjs";
import { NextResponse } from "next/server";

export async function GET() {
  // Debug: Check environment variables
  if (process.env.NODE_ENV === "development") {
    console.log("DEBUG - Environment variables:");
    console.log("WORKOS_API_KEY:", process.env.WORKOS_API_KEY ? "SET" : "NOT SET");
    console.log("WORKOS_CLIENT_ID:", process.env.WORKOS_CLIENT_ID || "NOT SET");
    console.log("NEXT_PUBLIC_WORKOS_CLIENT_ID:", process.env.NEXT_PUBLIC_WORKOS_CLIENT_ID || "NOT SET");
    console.log("NEXT_PUBLIC_WORKOS_REDIRECT_URI:", process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI || "NOT SET");
    console.log("WORKOS_COOKIE_PASSWORD:", process.env.WORKOS_COOKIE_PASSWORD ? "SET" : "NOT SET");
  }

  try {
    const signInUrl = await getSignInUrl();
    console.log("Generated sign-in URL:", signInUrl);
    redirect(signInUrl);
  } catch (error: any) {
    // NEXT_REDIRECT is expected behavior for redirect() function
    if (error.message === "NEXT_REDIRECT") {
      throw error; // Re-throw to allow Next.js to handle the redirect
    }
    console.error("Error generating sign-in URL:", error);
    return NextResponse.json({ error: "Failed to generate sign-in URL", details: error.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const signInUrl = await getSignInUrl();
    redirect(signInUrl);
  } catch (error: any) {
    // NEXT_REDIRECT is expected behavior for redirect() function
    if (error.message === "NEXT_REDIRECT") {
      throw error; // Re-throw to allow Next.js to handle the redirect
    }
    console.error("Error generating sign-in URL:", error);
    return NextResponse.json({ error: "Failed to generate sign-in URL", details: error.message }, { status: 500 });
  }
}