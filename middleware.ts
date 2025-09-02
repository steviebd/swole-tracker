import { NextResponse } from 'next/server';

export default function middleware() {
  // No-op middleware: we use route-based auth pages and server-side token minting
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
