import { authkitMiddleware } from '@workos-inc/authkit-nextjs';

export default authkitMiddleware({
  middlewareAuth: {
    enabled: true,
    unauthenticatedPaths: ['/', '/sign-in', '/sign-up', '/api/auth/sign-in-url', '/api/auth/login', '/api/auth/callback', '/api/auth/workos', '/api/auth/logout'],
  },
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files, but include all API routes and pages
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};