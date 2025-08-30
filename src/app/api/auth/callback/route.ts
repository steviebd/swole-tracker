import { handleAuth } from '@workos-inc/authkit-nextjs';

// WorkOS AuthKit provides GET, POST, and other HTTP methods
export const { GET, POST, PUT, DELETE, HEAD, OPTIONS, PATCH } = handleAuth();