"use client";

import React from "react";

function cx(...args: Array<string | false | null | undefined>) {
  return args.filter(Boolean).join(" ");
}

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glass?: boolean /* apply glass-surface */;
  hairline?: boolean /* apply glass-hairline */;
  as?: keyof React.JSX.IntrinsicElements;
}

/**
 * Token-driven Card surface. Uses .card plus optional glass variants.
 */
export function Card({
  className,
  children,
  glass = false,
  hairline = false,
  as = "div",
  ...rest
}: CardProps) {
  const Comp = as as any;
  return (
    <Comp
      className={cx(
        "card",
        glass ? "glass-surface" : "",
        hairline ? "glass-hairline" : "",
        className,
      )}
      {...rest}
    >
      {children}
    </Comp>
  );
}
