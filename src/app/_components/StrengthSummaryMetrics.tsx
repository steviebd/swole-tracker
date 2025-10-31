"use client";

interface StrengthSummaryMetricsProps {
  summaryCards: Array<{
    id: string;
    label: string;
    value: string;
    helper: string;
  }>;
}

export function StrengthSummaryMetrics({
  summaryCards,
}: StrengthSummaryMetricsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {summaryCards.map((card) => (
        <div
          key={card.id}
          className="border-border/70 bg-card/80 rounded-2xl border p-4 shadow-sm"
        >
          <p className="text-muted-foreground text-xs tracking-[0.25em] uppercase">
            {card.label}
          </p>
          <p className="text-foreground mt-2 text-2xl font-semibold">
            {card.value}
          </p>
          <p className="text-muted-foreground text-xs">{card.helper}</p>
        </div>
      ))}
    </div>
  );
}
