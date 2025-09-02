// WorkOS AuthKit callback route (alternative path for dashboard compatibility)
// Handles the OAuth callback and establishes the session

import { handleAuth } from '@workos-inc/authkit-nextjs';

export const GET = handleAuth();