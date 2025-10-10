import * as React from "react";
import { cn } from "~/lib/utils";

/**
 * Glass surface component with backdrop blur effects and gradient highlights
 * 
 * Features:
 * - Reusable glass container with consistent styling
 * - Backdrop blur effects for modern glass architecture
 * - Subtle transparency with high contrast text support
 * - Flexible element type support (div, section, header, etc.)
 * - Consistent surface language across components
 */

export interface GlassSurfaceProps extends React.HTMLAttributes<HTMLElement> {
  /** React children to render inside the glass surface */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Element type to render as - defaults to 'div' */
  as?: React.ElementType;
}

const GlassSurface = React.forwardRef<HTMLElement, GlassSurfaceProps>(
  ({ children, className, as: Component = 'div', ...props }, ref) => {
    const overlayGradient = `
      radial-gradient(600px 300px at 10% -10%, var(--color-glass-highlight) 0%, transparent 55%),
      radial-gradient(420px 220px at 90% 0%, var(--color-glass-accent) 0%, transparent 60%)
    `;

    return (
      <Component
        ref={ref}
        className={cn(
          // Base glass surface styling from design tokens
          'glass-surface',
          // Enhanced backdrop blur for glass effect
          'backdrop-blur-sm',
          // Subtle gradient overlay for depth
          'relative overflow-hidden',
          // Border and shadow from design system
          'border border-glass-border',
          'shadow-sm',
          // Rounded corners consistent with card system
          'rounded-lg',
          // Ensure proper z-index layering for glass architecture
          'relative',
          // Establish stronger base fill for contrast-sensitive contexts
          'bg-[color:var(--glass-surface-fill,transparent)]',
          className
        )}
        {...props}
      >
        {/* Subtle gradient highlight overlay responsive to motion + contrast tokens */}
        <div
          className="glass-surface-overlay pointer-events-none absolute inset-0"
          style={{
            background: overlayGradient,
          }}
          aria-hidden="true"
        />

        {/* Content wrapper to ensure proper layering */}
        <div className="relative z-10">
          {children}
        </div>
      </Component>
    );
  }
);

GlassSurface.displayName = "GlassSurface";

export { GlassSurface };
