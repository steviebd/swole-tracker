import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "default" | "secondary" | "outline" | "ghost";
}

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  const content = (
    <div className={cn("flex flex-col items-center gap-4 rounded-2xl border border-border/60 bg-card/80 px-6 py-12 text-center shadow-sm", className)}>
      {icon && <div className="text-5xl" aria-hidden>{icon}</div>}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action?.href ? (
        <Button variant={action.variant ?? "default"} asChild>
          <Link href={action.href}>{action.label}</Link>
        </Button>
      ) : action ? (
        <Button variant={action.variant ?? "default"} onClick={action.onClick}>
          {action.label}
        </Button>
      ) : null}
    </div>
  );

  return content;
}
