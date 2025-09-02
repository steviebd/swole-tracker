// WorkOS AuthKit callback route
// Handles the OAuth callback and establishes the session

import { handleAuth } from '@workos-inc/authkit-nextjs';

export const GET = handleAuth();