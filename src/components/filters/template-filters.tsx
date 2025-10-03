"use client";

import { Search, SlidersHorizontal } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { cn } from "~/lib/utils";

export interface TemplateFiltersState {
  search: string;
  sort: "recent" | "lastUsed" | "mostUsed" | "name";
  tag: string | null;
}

interface TemplateFiltersProps {
  value: TemplateFiltersState;
  onChange: (value: TemplateFiltersState) => void;
  className?: string;
  tags?: string[];
}

const sortLabels: Record<TemplateFiltersState["sort"], string> = {
  recent: "Recently created",
  lastUsed: "Last used",
  mostUsed: "Most used",
  name: "Name A-Z",
};

export function TemplateFilters({ value, onChange, className, tags }: TemplateFiltersProps) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="flex w-full items-center gap-2 sm:max-w-sm">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={value.search}
            onChange={(event) =>
              onChange({ ...value, search: event.target.value })
            }
            placeholder="Search templates"
            aria-label="Search templates"
            className="pl-9"
          />
        </div>
        {value.search && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Clear search"
            onClick={() => onChange({ ...value, search: "" })}
          >
            ×
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Select
          value={value.sort}
          onValueChange={(newSort: TemplateFiltersState["sort"]) =>
            onChange({ ...value, sort: newSort })
          }
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(sortLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {tags && tags.length > 0 ? (
          <Select
            value={value.tag ?? "all"}
            onValueChange={(tagValue) =>
              onChange({ ...value, tag: tagValue === "all" ? null : tagValue })
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Focus" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All focuses</SelectItem>
              {tags.map((tag) => (
                <SelectItem key={tag} value={tag}>
                  {tag}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Button
            variant="outline"
            size="icon"
            className="sm:hidden"
            aria-label="Additional filters"
            disabled
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
