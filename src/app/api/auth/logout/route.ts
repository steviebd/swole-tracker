import { signOut } from '@workos-inc/authkit-nextjs';

export async function GET() {
  await signOut();
  return new Response(null, { status: 200 });
}

export async function POST() {
  await signOut();
  return new Response(null, { status: 200 });
}