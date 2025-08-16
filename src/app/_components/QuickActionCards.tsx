"use client";

import Link from "next/link";

export function QuickActionCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
      {/* Start Workout Card */}
      <Link href="/workout/start" className="card-interactive group rounded-2xl transform hover:-translate-y-1 hover:shadow-xl transition-all duration-300 overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-orange-500 to-red-500" />
        <div className="p-4 sm:p-6 md:p-8">
          <div className="flex items-center justify-between mb-3 sm:mb-4 md:mb-6">
            <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center shadow-sm flex-shrink-0 bg-gradient-to-br from-orange-500 to-red-500 group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <svg className="w-4 h-4 sm:w-5 sm:h-5 transition-colors duration-300 text-muted-foreground group-hover:text-secondary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <h3 className="text-base sm:text-lg md:text-xl font-bold mb-1 sm:mb-2 text-foreground">Start Workout</h3>
          <p className="text-xs sm:text-sm md:text-base mb-3 sm:mb-4 md:mb-6 text-muted-foreground">Begin a new workout session</p>
          <div className="gradient-primary w-full text-center py-2 sm:py-3 rounded-xl text-sm sm:text-base text-white font-medium shadow-sm hover:shadow-md transition-shadow">
            Open
          </div>
        </div>
      </Link>

      {/* Progress Dashboard Card */}
      <Link href="/progress" className="card-interactive group rounded-2xl transform hover:-translate-y-1 hover:shadow-xl transition-all duration-300 overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-red-500 to-red-600" />
        <div className="p-4 sm:p-6 md:p-8">
          <div className="flex items-center justify-between mb-3 sm:mb-4 md:mb-6">
            <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center shadow-sm flex-shrink-0 bg-gradient-to-br from-red-500 to-red-600 group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <svg className="w-4 h-4 sm:w-5 sm:h-5 transition-colors duration-300 text-muted-foreground group-hover:text-secondary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <h3 className="text-base sm:text-lg md:text-xl font-bold mb-1 sm:mb-2 text-foreground">View Progress</h3>
          <p className="text-xs sm:text-sm md:text-base mb-3 sm:mb-4 md:mb-6 text-muted-foreground">Track your strength gains and consistency</p>
          <div className="gradient-primary w-full text-center py-2 sm:py-3 rounded-xl text-sm sm:text-base text-white font-medium shadow-sm hover:shadow-md transition-shadow">
            Open
          </div>
        </div>
      </Link>

      {/* Manage Templates Card */}
      <Link href="/templates" className="card-interactive group rounded-2xl transform hover:-translate-y-1 hover:shadow-xl transition-all duration-300 overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-amber-500 to-orange-500" />
        <div className="p-4 sm:p-6 md:p-8">
          <div className="flex items-center justify-between mb-3 sm:mb-4 md:mb-6">
            <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center shadow-sm flex-shrink-0 bg-gradient-to-br from-amber-500 to-orange-500 group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <svg className="w-4 h-4 sm:w-5 sm:h-5 transition-colors duration-300 text-muted-foreground group-hover:text-secondary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <h3 className="text-base sm:text-lg md:text-xl font-bold mb-1 sm:mb-2 text-foreground">Manage Templates</h3>
          <p className="text-xs sm:text-sm md:text-base mb-3 sm:mb-4 md:mb-6 text-muted-foreground">Create and edit workout templates</p>
          <div className="gradient-primary w-full text-center py-2 sm:py-3 rounded-xl text-sm sm:text-base text-white font-medium shadow-sm hover:shadow-md transition-shadow">
            Open
          </div>
        </div>
      </Link>
    </div>
  );
}