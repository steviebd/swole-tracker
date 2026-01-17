"use client";

import { Button } from "~/components/ui/button";

interface ClientPreferencesTriggerProps {
  inline?: boolean;
  label?: string;
}

export default function ClientPreferencesTrigger({
  inline,
  label = "Open preferences",
}: ClientPreferencesTriggerProps) {
  if (inline) {
    return (
      <Button variant="outline" size="sm" asChild>
        <button type="button">{label}</button>
      </Button>
    );
  }

  return (
    <Button variant="outline" asChild>
      <button type="button">{label}</button>
    </Button>
  );
}
