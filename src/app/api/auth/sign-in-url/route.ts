import { getSignInUrl } from '@workos-inc/authkit-nextjs';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const signInUrl = await getSignInUrl();
    return NextResponse.json({ signInUrl });
  } catch (error) {
    console.error('Error getting sign-in URL:', error);
    return NextResponse.json({ error: 'Failed to get sign-in URL' }, { status: 500 });
  }
}