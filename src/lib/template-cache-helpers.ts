"use client";

import { getQueryKey } from "@trpc/react-query";
import { type QueryClient, type QueryKey } from "@tanstack/react-query";

import { api, type RouterOutputs } from "~/trpc/react";

const templatesQueryRoot = getQueryKey(api.templates.getAll);

type TemplateRecord = RouterOutputs["templates"]["getAll"][number];

export type TemplateCacheSnapshot = Array<{
  queryKey: QueryKey;
  data: TemplateRecord[] | undefined;
}>;

function normalizeSearchTerm(term: string | undefined): string | null {
  if (!term) return null;
  const trimmed = term.trim();
  return trimmed.length > 0 ? trimmed.toLowerCase() : null;
}

function matchesSearch(template: TemplateRecord, search: string | null): boolean {
  if (!search) return true;
  return template.name.toLowerCase().includes(search);
}

function toTimestamp(value: Date | string | null | undefined): number {
  if (!value) return 0;
  if (value instanceof Date) {
    return value.getTime();
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function sortTemplates(
  templates: TemplateRecord[],
  sort: TemplateFiltersSort | undefined,
): TemplateRecord[] {
  const order = (sort ?? "recent") as TemplateFiltersSort;
  const copy = [...templates];

  switch (order) {
    case "name":
      copy.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "lastUsed":
      copy.sort(
        (a, b) => toTimestamp(b.lastUsed ?? null) - toTimestamp(a.lastUsed ?? null),
      );
      break;
    case "mostUsed":
      copy.sort(
        (a, b) =>
          (b.totalSessions ?? 0) - (a.totalSessions ?? 0) ||
          toTimestamp(b.createdAt) - toTimestamp(a.createdAt),
      );
      break;
    default:
      copy.sort(
        (a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt),
      );
  }

  return copy;
}

type TemplateFiltersSort = "recent" | "lastUsed" | "mostUsed" | "name";

function extractInputFromQueryKey(
  queryKey: QueryKey,
): { search?: string; sort?: TemplateFiltersSort } | undefined {
  for (let index = 1; index < queryKey.length; index += 1) {
    const segment = queryKey[index];
    if (segment && typeof segment === "object" && "input" in segment) {
      return (segment as { input?: { search?: string; sort?: TemplateFiltersSort } }).input;
    }
  }
  return undefined;
}

export function snapshotTemplateCaches(
  queryClient: QueryClient,
): TemplateCacheSnapshot {
  const entries = queryClient.getQueriesData<TemplateRecord[]>({
    queryKey: templatesQueryRoot,
  });

  return entries.map(([key, data]) => ({
    queryKey: key as QueryKey,
    data,
  }));
}

export function restoreTemplateCaches(
  queryClient: QueryClient,
  snapshot: TemplateCacheSnapshot,
): void {
  for (const { queryKey, data } of snapshot) {
    queryClient.setQueryData(queryKey, data);
  }
}

export function removeTemplateFromCaches(
  queryClient: QueryClient,
  templateId: number,
): void {
  const entries = queryClient.getQueriesData<TemplateRecord[]>({
    queryKey: templatesQueryRoot,
  });

  for (const [key] of entries) {
    const queryKey = key as QueryKey;
    queryClient.setQueryData<TemplateRecord[] | undefined>(
      queryKey,
      (existing) =>
        existing ? existing.filter((template) => template.id !== templateId) : existing,
    );
  }
}

export function upsertTemplateInCaches(
  queryClient: QueryClient,
  template: TemplateRecord,
): void {
  const entries = queryClient.getQueriesData<TemplateRecord[]>({
    queryKey: templatesQueryRoot,
  });

  for (const [key, data] of entries) {
    if (!data) {
      continue;
    }

    const queryKey = key as QueryKey;
    const input = extractInputFromQueryKey(queryKey);
    const searchTerm = normalizeSearchTerm(input?.search);

    if (!matchesSearch(template, searchTerm)) {
      continue;
    }

    queryClient.setQueryData<TemplateRecord[] | undefined>(
      queryKey,
      (existing) => {
        if (!existing) {
          return existing;
        }
        const filtered = existing.filter((item) => item.id !== template.id);
        const next = [...filtered, template];
        return sortTemplates(next, input?.sort);
      },
    );
  }
}
