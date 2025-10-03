import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "src/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 gap-1 [&>svg]:size-3 [&>svg]:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-all duration-150 ease-out overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-interactive-primary text-primary-foreground",
        secondary:
          "border-transparent bg-interactive-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-status-danger text-white focus-visible:ring-destructive/40",
        outline:
          "border-interactive-primary bg-surface-base text-interactive-primary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const STATE_LAYER_BY_BADGE_VARIANT: Record<
  NonNullable<VariantProps<typeof badgeVariants>["variant"]>,
  "primary" | "secondary" | "surface" | "error"
> = {
  default: "primary",
  secondary: "secondary",
  destructive: "error",
  outline: "surface",
};

function Badge({
  className,
  variant,
  asChild = false,
  style,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"
  const stateLayer = STATE_LAYER_BY_BADGE_VARIANT[variant ?? "default"] ?? "surface"

  return (
    <Comp
      data-slot="badge"
      data-state-layer={stateLayer}
      className={cn(badgeVariants({ variant }), className)}
      style={style}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
