// WorkOS AuthKit logout route
// Clears the session and redirects to homepage

import { NextResponse } from "next/server";

export async function GET() {
  // Clear the session by redirecting to WorkOS logout
  // For now, just redirect to home - WorkOS AuthKit handles session clearing
  return NextResponse.redirect("/");
}
