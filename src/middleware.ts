import { authkitMiddleware } from '@workos-inc/authkit-nextjs';

export default authkitMiddleware();

export const config = {
  matcher: [
    '/((?!api/(?!auth)|_next/static|_next/image|favicon.ico).*)',
    '/api/auth/:path*'
  ],
};