import { authkitMiddleware } from '@workos-inc/authkit-nextjs';

export default authkitMiddleware();

// Match against pages that require auth
export const config = { 
  matcher: [
    '/workouts/:path*',
    '/templates/:path*',
    '/profile/:path*',
    '/settings/:path*',
    '/dashboard/:path*'
  ] 
};