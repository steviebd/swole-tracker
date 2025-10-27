export type HighlightTab = "prs" | "milestones" | "streaks";

export interface HighlightBadge {
  id: string;
  label: string;
  value: string;
  tone: "gold" | "silver" | "bronze" | "info";
  helper?: string;
}

export interface HighlightCard {
  id: string;
  title: string;
  subtitle: string;
  detail?: string;
  meta?: string;
  icon?: string;
  date?: string;
  tone?: "success" | "info" | "warning" | "danger";
}

export interface HighlightMotivator {
  emoji: string;
  title: string;
  message: string;
  tone: "success" | "info" | "warning" | "danger";
}

export interface ProgressHighlightsPayload {
  tab: HighlightTab;
  summary: {
    total: number;
    timeRangeLabel: string;
  };
  motivator?: HighlightMotivator;
  badges: HighlightBadge[];
  cards: HighlightCard[];
}
