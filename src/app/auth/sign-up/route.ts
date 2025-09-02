// WorkOS AuthKit sign-up route
// Redirects to the WorkOS hosted sign-up page

import { getSignUpUrl } from '@workos-inc/authkit-nextjs';
import { NextResponse } from 'next/server';

export async function GET() {
  const signUpUrl = await getSignUpUrl();
  return NextResponse.redirect(signUpUrl);
}