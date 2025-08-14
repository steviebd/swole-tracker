"use client";

import { api } from "~/trpc/react";

export function WhoopProfile() {
  const { data: profile, isLoading } = api.whoop.getProfile.useQuery();

  const formatDate = (dateString: Date | string | null) => {
    if (!dateString) return "--";
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(dateString));
  };

  if (isLoading) {
    return (
      <div className="py-8 text-center">
        <p className="text-secondary">Loading profile data...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="py-8 text-center">
        <p className="text-secondary">No profile data available. Try syncing your WHOOP data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h3 className="text-xl font-semibold">WHOOP Profile</h3>
        <p className="text-secondary text-sm">Your WHOOP account information</p>
      </div>

      <div className="card p-6 max-w-md">
        <div className="space-y-4">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center" 
                 style={{ backgroundColor: 'var(--color-primary)' }}>
              <span className="text-2xl font-bold text-white">
                {profile.first_name?.[0]?.toUpperCase() || "W"}
                {profile.last_name?.[0]?.toUpperCase() || ""}
              </span>
            </div>
            <h4 className="text-lg font-semibold">
              {profile.first_name} {profile.last_name}
            </h4>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-secondary">Email:</span>
              <span className="font-medium">{profile.email}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-secondary">WHOOP User ID:</span>
              <span className="font-mono text-xs">{profile.whoop_user_id}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-secondary">Last Updated:</span>
              <span>{formatDate(profile.last_updated)}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-secondary">Synced:</span>
              <span>{formatDate(profile.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}