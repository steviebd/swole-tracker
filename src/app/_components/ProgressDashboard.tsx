"use client";

import { useEffect, useState } from "react";

import { PageShell } from "~/components/layout/page-shell";
import { buttonVariants } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { ProgressHeroBar } from "./ProgressHeroBar";
import { ProgressHighlightsSection } from "./ProgressHighlightsSection";
import { StrengthProgressSection } from "./StrengthProgressSection";
import { ConsistencySection } from "./ConsistencySection";
import { WellnessHistorySection } from "./WellnessHistorySection";
import { WhoopIntegrationSection } from "./WhoopIntegrationSection";
import {
  ProgressRangeProvider,
  useProgressRange,
} from "~/contexts/progress-range-context";
import type { ProgressTimeRange } from "~/lib/time-range";

const PROGRESS_SECTIONS = [
  { id: "highlights", label: "Highlights" },
  { id: "volume", label: "Strength" },
  { id: "consistency", label: "Consistency" },
  { id: "wellness", label: "Wellness" },
  { id: "whoop", label: "Whoop" },
] as const;

const RANGE_DEFAULTS = {
  overview: "month",
  strength: "year",
  consistency: "month",
  readiness: "week",
  wellness: "month",
  whoop: "week",
} as const;

export function ProgressDashboard() {
  return (
    <ProgressRangeProvider defaults={RANGE_DEFAULTS}>
      <ProgressDashboardInner />
    </ProgressRangeProvider>
  );
}

function ProgressDashboardInner() {
  const [focusedExercise, setFocusedExercise] = useState<{
    name: string | null;
    templateExerciseId: number | null;
  }>({
    name: null,
    templateExerciseId: null,
  });
  const { range: overviewRange, setRange: setOverviewRange } =
    useProgressRange("overview");
  const [activeSection, setActiveSection] = useState<string>(
    PROGRESS_SECTIONS[0]!.id,
  );

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible.length > 0) {
          setActiveSection(visible[0]!.target.id);
          return;
        }

        const closest = entries
          .slice()
          .sort(
            (a, b) =>
              Math.abs(a.boundingClientRect.top) -
              Math.abs(b.boundingClientRect.top),
          );

        if (closest[0]) {
          setActiveSection(closest[0]!.target.id);
        }
      },
      {
        rootMargin: "-40% 0px -45% 0px",
        threshold: [0.2, 0.4, 0.6, 0.8],
      },
    );

    const elements = PROGRESS_SECTIONS.map(({ id }) =>
      document.getElementById(id),
    ).filter((el): el is HTMLElement => Boolean(el));

    elements.forEach((el) => observer.observe(el));

    return () => {
      elements.forEach((el) => observer.unobserve(el));
      observer.disconnect();
    };
  }, []);

  const timeRangeSelector = (
    <div className="bg-muted/40 flex items-center gap-2 rounded-full p-1">
      {(["week", "month", "year"] as ProgressTimeRange[]).map((range) => (
        <button
          key={range}
          type="button"
          onClick={() => setOverviewRange(range)}
          aria-pressed={overviewRange === range}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-semibold tracking-wide uppercase transition-colors",
            overviewRange === range
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-primary/10",
          )}
        >
          {range}
        </button>
      ))}
    </div>
  );

  return (
    <PageShell
      title="Progress Dashboard"
      description="Readiness, PRs, and habits that keep your training on track."
      backHref="/"
      backLabel="Dashboard"
      actions={timeRangeSelector}
      contentClassName="space-y-10"
    >
      <ProgressHeroBar selectedExercise={focusedExercise} />

      <nav
        className="border-border/60 bg-card/80 sticky top-4 z-20 flex flex-wrap gap-2 rounded-2xl border p-2 shadow-sm backdrop-blur"
        aria-label="Progress sections"
      >
        {PROGRESS_SECTIONS.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            aria-current={activeSection === section.id ? "true" : undefined}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "rounded-full border text-xs tracking-wide uppercase transition",
              activeSection === section.id
                ? "border-primary/60 text-primary"
                : "border-border/50 text-muted-foreground hover:border-primary/40 hover:text-primary",
            )}
          >
            {section.label}
          </a>
        ))}
      </nav>

      <section id="highlights" data-progress-section>
        <ProgressHighlightsSection />
      </section>

      <section id="volume" data-progress-section>
        <StrengthProgressSection
          selectedExercise={focusedExercise}
          onExerciseChange={(selection) =>
            setFocusedExercise({
              name: selection.name,
              templateExerciseId: selection.templateExerciseId ?? null,
            })
          }
        />
      </section>

      <section id="consistency" data-progress-section>
        <ConsistencySection />
      </section>

      <section id="wellness" data-progress-section>
        <WellnessHistorySection />
      </section>

      <section id="whoop" data-progress-section>
        <WhoopIntegrationSection />
      </section>
    </PageShell>
  );
}
