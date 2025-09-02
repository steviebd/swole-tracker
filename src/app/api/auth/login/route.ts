// WorkOS AuthKit login route
// Redirects to the WorkOS hosted sign-in page

import { getSignInUrl } from "@workos-inc/authkit-nextjs";
import { NextResponse } from "next/server";

export async function GET() {
  const signInUrl = await getSignInUrl();
  return NextResponse.redirect(signInUrl);
}
