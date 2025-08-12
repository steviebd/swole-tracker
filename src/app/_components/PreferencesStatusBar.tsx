"use client";


export function PreferencesStatusBar() {
  return (
    <div 
      className="w-full py-2 px-6 transition-colors duration-300"
      style={{
        backgroundColor: 'var(--color-bg-surface)'
      }}
    >
      <div className="container mx-auto flex items-center justify-between">
        <span 
          className="text-sm font-medium transition-colors duration-300"
          style={{
            color: 'var(--color-text)'
          }}
        >
          Preferences
        </span>
        
        <div 
          className="flex items-center gap-2 px-3 py-1 rounded-full"
          style={{
            backgroundColor: 'var(--color-primary)'
          }}
        >
          <div 
            className="w-2 h-2 rounded-full animate-pulse"
            style={{
              backgroundColor: 'color-mix(in oklab, var(--color-primary) 40%, white 60%)'
            }}
          ></div>
          <span 
            className="text-xs font-medium"
            style={{
              color: '#0b0b0b'
            }}
          >
            Syncing...
          </span>
        </div>
      </div>
    </div>
  );
}