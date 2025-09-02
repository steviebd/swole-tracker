// WorkOS AuthKit sign-out route
// Signs the user out and redirects to the home page

import { getSignOutUrl } from '@workos-inc/authkit-nextjs';
import { NextResponse } from 'next/server';

export async function GET() {
  const signOutUrl = await getSignOutUrl();
  return NextResponse.redirect(signOutUrl);
}