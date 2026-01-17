import { b as reactExports, s as jsxRuntimeExports } from "./worker-entry-_S0z7k3x.js";
import { S as Slot } from "./index-BDRuzYuQ.js";
import { j as useReducedMotion, t as triggerHapticFeedback, e as cva, m as motion, k as buttonPressVariants } from "./_app._index-CJwPGQVf-BFDyR4JM.js";
import { b as cn } from "./router-CfQjAsX4-BdfYCT0U.js";
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 ease-out disabled:pointer-events-none disabled:opacity-60 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-interactive-primary text-primary-foreground shadow-xs hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-xs",
        destructive: "bg-destructive text-destructive-foreground shadow-xs hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-xs dark:bg-destructive/80",
        outline: "border border-interactive-primary bg-surface-base text-interactive-primary shadow-none hover:-translate-y-0.5 active:translate-y-0",
        secondary: "bg-interactive-secondary text-secondary-foreground shadow-xs hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-xs",
        ghost: "bg-transparent text-interactive-primary hover:scale-105 active:scale-95",
        link: "bg-transparent text-interactive-primary underline-offset-4 hover:underline hover:scale-105 active:scale-95 px-0 py-0 h-auto"
      },
      size: {
        default: "h-11 px-4 py-2 has-[>svg]:px-3 touch-target",
        sm: "h-10 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5 touch-target",
        lg: "h-12 rounded-md px-6 has-[>svg]:px-4 touch-target-large",
        xl: "h-14 rounded-lg px-8 has-[>svg]:px-6 touch-target-xl text-base font-semibold",
        icon: "size-11 touch-target"
      },
      interactive: {
        true: "cursor-pointer select-none",
        false: "cursor-default"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      interactive: true
    }
  }
);
const STATE_LAYER_BY_VARIANT = {
  default: "primary",
  destructive: "error",
  outline: "surface",
  secondary: "secondary",
  ghost: "surface",
  link: "primary"
};
const Button = reactExports.forwardRef(
  ({
    className,
    variant,
    size,
    interactive,
    asChild = false,
    haptic = false,
    ripple = false,
    onPointerDown,
    children,
    style,
    disabled,
    ...props
  }, ref) => {
    const prefersReducedMotion = useReducedMotion();
    const stateLayerVariant = STATE_LAYER_BY_VARIANT[variant ?? "default"] ?? "surface";
    const resolvedInteractive = interactive ?? !disabled;
    const [ripplePosition, setRipplePosition] = reactExports.useState(null);
    const handlePointerDown = reactExports.useCallback(
      (event) => {
        if (haptic && !prefersReducedMotion) {
          triggerHapticFeedback("light");
        }
        if (ripple && !prefersReducedMotion && !asChild) {
          const rect = event.currentTarget.getBoundingClientRect();
          setRipplePosition({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
          });
          setTimeout(() => setRipplePosition(null), 400);
        }
        onPointerDown?.(event);
      },
      [haptic, ripple, prefersReducedMotion, asChild, onPointerDown]
    );
    const resolvedClassName = buttonVariants({
      variant,
      size,
      interactive: resolvedInteractive
    });
    if (asChild) {
      return /* @__PURE__ */ jsxRuntimeExports.jsx(
        Slot,
        {
          ref,
          "data-slot": "button",
          "data-state-layer": stateLayerVariant,
          "data-disabled": disabled ? "true" : void 0,
          "aria-disabled": disabled,
          className: cn(resolvedClassName, className),
          onPointerDown: !disabled ? handlePointerDown : void 0,
          style,
          ...props,
          children
        }
      );
    }
    const motionProps = !prefersReducedMotion ? {
      variants: buttonPressVariants,
      initial: "initial",
      whileHover: "hover",
      whileTap: "tap"
    } : {};
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      motion.button,
      {
        ref,
        "data-slot": "button",
        "data-state-layer": stateLayerVariant,
        "data-disabled": disabled ? "true" : void 0,
        disabled,
        className: cn(resolvedClassName, className),
        onPointerDown: !disabled ? handlePointerDown : void 0,
        ...style && {
          style: Object.fromEntries(
            Object.entries(style).filter(([_, v]) => v !== void 0)
          )
        },
        ...motionProps,
        ...props,
        children: [
          children,
          ripple && ripplePosition && !prefersReducedMotion && /* @__PURE__ */ jsxRuntimeExports.jsx(
            motion.span,
            {
              className: "pointer-events-none absolute rounded-full",
              style: {
                left: ripplePosition.x - 10,
                top: ripplePosition.y - 10,
                width: 20,
                height: 20,
                backgroundColor: "color-mix(in srgb, var(--state-layer-color, currentColor) 24%, transparent 76%)"
              },
              initial: { scale: 0, opacity: 1 },
              animate: { scale: 4, opacity: 0 },
              transition: { duration: 0.4, ease: "easeOut" }
            }
          )
        ]
      }
    );
  }
);
Button.displayName = "Button";
export {
  Button as B
};
