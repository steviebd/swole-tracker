"use client";

import { useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

interface VirtualizedSelectProps<T> {
  items: T[];
  selectedId: string;
  onSelect: (id: string) => void;
  getItemId: (item: T) => string;
  getItemLabel: (item: T) => string;
  getItemSubtitle?: (item: T) => string;
  placeholder?: string;
  searchPlaceholder?: string;
  maxHeight?: number;
}

export function VirtualizedSelect<T>({
  items,
  selectedId,
  onSelect,
  getItemId,
  getItemLabel,
  getItemSubtitle,
  placeholder = "Choose an option…",
  searchPlaceholder = "Search...",
  maxHeight = 200,
}: VirtualizedSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredItems = useMemo(() => {
    if (!searchTerm) return items;
    return items.filter((item) =>
      getItemLabel(item).toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [items, searchTerm, getItemLabel]);

  const selectedItem = items.find((item) => getItemId(item) === selectedId);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="border-border/60 bg-background/80 text-foreground focus:border-primary w-full rounded-xl border px-3 py-2 text-left text-sm font-medium outline-none"
      >
        {selectedItem ? (
          <>
            {getItemLabel(selectedItem)}
            {getItemSubtitle?.(selectedItem)}
          </>
        ) : (
          placeholder
        )}
      </button>

      {isOpen && (
        <div className="border-border/60 bg-background/95 absolute top-full z-50 mt-1 w-full overflow-hidden rounded-xl border shadow-lg">
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border-border/60 w-full border-b px-3 py-2 text-sm outline-none"
          />
          <VirtualizedList
            items={filteredItems}
            onSelect={(id) => {
              onSelect(id);
              setIsOpen(false);
              setSearchTerm("");
            }}
            getItemId={getItemId}
            getItemLabel={getItemLabel}
            {...(getItemSubtitle && { getItemSubtitle })}
            maxHeight={maxHeight}
          />
        </div>
      )}
    </div>
  );
}

interface VirtualizedListProps<T> {
  items: T[];
  onSelect: (id: string) => void;
  getItemId: (item: T) => string;
  getItemLabel: (item: T) => string;
  getItemSubtitle?: (item: T) => string;
  maxHeight: number;
}

function VirtualizedList<T>({
  items,
  onSelect,
  getItemId,
  getItemLabel,
  getItemSubtitle,
  maxHeight,
}: VirtualizedListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 5,
  });

  return (
    <div
      ref={parentRef}
      className="overflow-auto"
      style={{ height: maxHeight }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const item = items[virtualItem.index]!;
          return (
            <div
              key={virtualItem.key}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <button
                type="button"
                onClick={() => onSelect(getItemId(item))}
                className="hover:bg-muted/50 w-full px-3 py-2 text-left text-sm"
              >
                {getItemLabel(item)}
                {getItemSubtitle?.(item)}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
