"use client";

import Link from "next/link";

export function QuickActionCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Start Workout Card */}
      <Link href="/workout/start" className="glass-surface transition-all duration-300 cursor-pointer group rounded-2xl transform hover:-translate-y-1 hover:shadow-lg"
        style={{ 
          borderColor: "var(--color-border)",
          boxShadow: "var(--shadow-sm)"
        } as React.CSSProperties}>
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div 
              className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm"
              style={{ backgroundColor: "var(--color-info)" }}
            >
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <svg className="w-5 h-5 transition-colors duration-300 group-hover:text-[var(--color-text-secondary)]" 
              style={{ color: "var(--color-text-muted)" }}
              fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <h3 className="text-xl font-bold mb-2" style={{ color: "var(--color-text)" }}>Start Workout</h3>
          <p className="text-base mb-6" style={{ color: "var(--color-text-secondary)" }}>Begin a new workout session</p>
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
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div 
              className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm"
              style={{ backgroundColor: "var(--color-success)" }}
            >
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <svg className="w-5 h-5 transition-colors duration-300 group-hover:text-[var(--color-text-secondary)]" 
              style={{ color: "var(--color-text-muted)" }}
              fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <h3 className="text-xl font-bold mb-2" style={{ color: "var(--color-text)" }}>View Progress</h3>
          <p className="text-base mb-6" style={{ color: "var(--color-text-secondary)" }}>Track your strength gains and consistency</p>
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
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div 
              className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <svg className="w-5 h-5 transition-colors duration-300 group-hover:text-[var(--color-text-secondary)]" 
              style={{ color: "var(--color-text-muted)" }}
              fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <h3 className="text-xl font-bold mb-2" style={{ color: "var(--color-text)" }}>Manage Templates</h3>
          <p className="text-base mb-6" style={{ color: "var(--color-text-secondary)" }}>Create and edit workout templates</p>
          <div className="btn-primary w-full text-center py-3 rounded-xl">
            Open
          </div>
        </div>
      </Link>
    </div>
  );
}