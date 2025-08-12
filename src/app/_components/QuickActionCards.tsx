"use client";

import Link from "next/link";

export function QuickActionCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {/* Start Workout Card */}
      <Link href="/workout/start" className="glass-surface transition-all duration-300 cursor-pointer group rounded-2xl transform hover:-translate-y-1 hover:shadow-lg"
        style={{ 
          borderColor: "var(--color-border)",
          boxShadow: "var(--shadow-sm)"
        } as React.CSSProperties}>
        <div className="p-6 sm:p-8">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div 
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shadow-sm"
              style={{ backgroundColor: "var(--color-info)" }}
            >
              <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <svg className="w-5 h-5 transition-colors duration-300 group-hover:text-[var(--color-text-secondary)]" 
              style={{ color: "var(--color-text-muted)" }}
              fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <h3 className="text-lg sm:text-xl font-bold mb-2" style={{ color: "var(--color-text)" }}>Start Workout</h3>
          <p className="text-sm sm:text-base mb-4 sm:mb-6" style={{ color: "var(--color-text-secondary)" }}>Begin a new workout session</p>
          <div className="btn-primary w-full text-center py-3 rounded-xl">
            Open
          </div>
        </div>
      </Link>

      {/* Progress Dashboard Card */}
      <Link href="/progress" className="glass-surface transition-all duration-300 cursor-pointer group rounded-2xl transform hover:-translate-y-1 hover:shadow-lg"
        style={{ 
          borderColor: "var(--color-border)",
          boxShadow: "var(--shadow-sm)"
        } as React.CSSProperties}>
        <div className="p-6 sm:p-8">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div 
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shadow-sm"
              style={{ backgroundColor: "var(--color-success)" }}
            >
              <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <svg className="w-5 h-5 transition-colors duration-300 group-hover:text-[var(--color-text-secondary)]" 
              style={{ color: "var(--color-text-muted)" }}
              fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <h3 className="text-lg sm:text-xl font-bold mb-2" style={{ color: "var(--color-text)" }}>View Progress</h3>
          <p className="text-sm sm:text-base mb-4 sm:mb-6" style={{ color: "var(--color-text-secondary)" }}>Track your strength gains and consistency</p>
          <div className="btn-primary w-full text-center py-3 rounded-xl">
            Open
          </div>
        </div>
      </Link>

      {/* Manage Templates Card */}
      <Link href="/templates" className="glass-surface transition-all duration-300 cursor-pointer group rounded-2xl transform hover:-translate-y-1 hover:shadow-lg"
        style={{ 
          borderColor: "var(--color-border)",
          boxShadow: "var(--shadow-sm)"
        } as React.CSSProperties}>
        <div className="p-6 sm:p-8">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div 
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shadow-sm"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <svg className="w-5 h-5 transition-colors duration-300 group-hover:text-[var(--color-text-secondary)]" 
              style={{ color: "var(--color-text-muted)" }}
              fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <h3 className="text-lg sm:text-xl font-bold mb-2" style={{ color: "var(--color-text)" }}>Manage Templates</h3>
          <p className="text-sm sm:text-base mb-4 sm:mb-6" style={{ color: "var(--color-text-secondary)" }}>Create and edit workout templates</p>
          <div className="btn-primary w-full text-center py-3 rounded-xl">
            Open
          </div>
        </div>
      </Link>
    </div>
  );
}