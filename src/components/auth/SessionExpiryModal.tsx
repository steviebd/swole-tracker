"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

interface SessionExpiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignIn: () => void;
}

/**
 * Modal that shows when the user's session has expired
 * Provides options to sign in again or dismiss
 */
export function SessionExpiryModal({ isOpen, onClose, onSignIn }: SessionExpiryModalProps) {
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    if (!isOpen) {
      setCountdown(30);
      return;
    }

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Auto-redirect to sign in when countdown reaches 0
          onSignIn();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, onSignIn]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-[9999]" 
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
        <div 
          className="glass-surface card p-6 rounded-xl max-w-md w-full shadow-2xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="session-expired-title"
          aria-describedby="session-expired-description"
        >
          <div className="text-center space-y-4">
            <div className="text-5xl">🔒</div>
            
            <h2 
              id="session-expired-title" 
              className="text-xl font-bold text-primary"
            >
              Session Expired
            </h2>
            
            <p 
              id="session-expired-description" 
              className="text-secondary"
            >
              Your session has expired for security reasons. 
              Please sign in again to continue.
            </p>

            <div className="text-sm text-muted">
              Auto-redirecting in {countdown} seconds...
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={onSignIn}
                className="btn-primary px-6 py-2 rounded-lg flex-1"
                autoFocus
              >
                Sign In Again
              </button>
              <button
                onClick={onClose}
                className="btn-outline px-6 py-2 rounded-lg"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Hook to handle session expiry detection and modal display
 */
export function useSessionExpiryHandler() {
  const [showModal, setShowModal] = useState(false);

  const handleTokenRefreshFailure = () => {
    console.warn("Token refresh failed - session expired");
    toast.error("Your session has expired", { duration: 3000 });
    setShowModal(true);
  };

  const handleSignIn = () => {
    setShowModal(false);
    window.location.href = "/api/auth/login";
  };

  const handleDismiss = () => {
    setShowModal(false);
  };

  return {
    showModal,
    handleTokenRefreshFailure,
    handleSignIn,
    handleDismiss,
  };
}