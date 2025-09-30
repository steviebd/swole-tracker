"use client";

import * as React from "react";

import {
  RecentWorkouts as SharedRecentWorkouts,
  type RecentWorkoutsProps as SharedRecentWorkoutsProps,
} from "~/components/recent-workouts";

export interface RecentWorkoutsProps
  extends Omit<SharedRecentWorkoutsProps, "variant"> {}

const RecentWorkouts = React.forwardRef<HTMLDivElement, RecentWorkoutsProps>(
  ({ limit, ...props }, ref) => (
    <SharedRecentWorkouts
      ref={ref}
      variant="dashboard"
      limit={limit ?? 5}
      {...props}
    />
  ),
);

RecentWorkouts.displayName = "DashboardRecentWorkouts";

export { RecentWorkouts };
