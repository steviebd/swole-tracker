"use client";

import { useAuth } from '@workos-inc/authkit-nextjs/components';
import { useMultiTabSync } from '~/hooks/useMultiTabSync';
import { toast } from 'sonner';

export function SignOutButton() {
  const { signOut } = useAuth();
  const { enhancedSignOut } = useMultiTabSync();

  const handleSignOut = async () => {
    try {
      // Use enhanced sign out that broadcasts to other tabs
      await enhancedSignOut();
      toast.success('Signed out successfully');
    } catch (error) {
      console.error("Sign-out error:", error);
      toast.error('Failed to sign out. Please try again.');
    }
  };

  return (
    <button
      onClick={handleSignOut}
      className="flex items-center px-3 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
    >
      Sign Out
    </button>
  );
}