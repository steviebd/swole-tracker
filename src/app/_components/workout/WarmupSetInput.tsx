"use client";

import React from "react";
import { motion } from "framer-motion";
import { Trash2, GripVertical, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "~/lib/utils";

export interface WarmupSetData {
  setNumber: number;
  weight: number;
  reps: number;
  percentageOfTop?: number;
}

interface WarmupSetInputProps {
  data: WarmupSetData;
  weightUnit: "kg" | "lbs";
  onUpdate: (updates: Partial<WarmupSetData>) => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isDragging?: boolean;
}

export function WarmupSetInput({
  data,
  weightUnit,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  isDragging,
}: WarmupSetInputProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        "glass-card glass-hairline relative flex items-center gap-2 rounded-lg p-2 transition-colors",
        "bg-secondary/5", // Lighter than working sets
        isDragging && "cursor-grabbing opacity-50",
      )}
      role="group"
      aria-label={`Warm-up set ${data.setNumber}`}
    >
      {/* Drag Handle */}
      <div
        className="hover:bg-muted cursor-grab touch-none rounded p-1 active:cursor-grabbing"
        data-drag-handle="true"
        aria-label="Drag to reorder"
      >
        <GripVertical className="text-muted-foreground size-4" />
      </div>

      {/* Set Number Badge */}
      <div
        className="bg-secondary/30 text-secondary-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
        aria-label={`Warm-up set number ${data.setNumber}`}
      >
        W{data.setNumber}
      </div>

      {/* Weight Input */}
      <div className="flex min-w-0 flex-1 items-center gap-1">
        <input
          type="number"
          inputMode="decimal"
          step="0.5"
          value={data.weight || ""}
          onChange={(e) =>
            onUpdate({ weight: parseFloat(e.target.value) || 0 })
          }
          placeholder="0"
          className={cn(
            "w-16 rounded-md border px-2 py-1 text-center text-sm",
            "bg-input text-foreground border-border",
            "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
            "hover:border-border/80 transition-colors",
          )}
          aria-label={`Warm-up set ${data.setNumber} weight`}
        />
        <span className="text-muted-foreground shrink-0 text-xs">
          {weightUnit}
        </span>
      </div>

      {/* Multiplication Symbol */}
      <span className="text-muted-foreground text-xs">×</span>

      {/* Reps Input */}
      <div className="flex items-center gap-1">
        <input
          type="number"
          inputMode="numeric"
          value={data.reps || ""}
          onChange={(e) => onUpdate({ reps: parseInt(e.target.value) || 0 })}
          placeholder="0"
          className={cn(
            "w-12 rounded-md border px-2 py-1 text-center text-sm",
            "bg-input text-foreground border-border",
            "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
            "hover:border-border/80 transition-colors",
          )}
          aria-label={`Warm-up set ${data.setNumber} reps`}
        />
      </div>

      {/* Percentage Badge (if available) */}
      {data.percentageOfTop !== undefined && (
        <div
          className="bg-muted text-muted-foreground shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
          title={`${Math.round(data.percentageOfTop * 100)}% of working weight`}
        >
          {Math.round(data.percentageOfTop * 100)}%
        </div>
      )}

      {/* Move Up/Down Arrows */}
      <div className="flex shrink-0 flex-col gap-0.5">
        {onMoveUp && (
          <button
            onClick={onMoveUp}
            className={cn(
              "text-muted-foreground hover:bg-muted hover:text-foreground rounded p-0.5 transition-colors",
              "touch-target-sm",
            )}
            aria-label={`Move warm-up set ${data.setNumber} up`}
            title="Move up"
          >
            <ChevronUp className="size-3" />
          </button>
        )}
        {onMoveDown && (
          <button
            onClick={onMoveDown}
            className={cn(
              "text-muted-foreground hover:bg-muted hover:text-foreground rounded p-0.5 transition-colors",
              "touch-target-sm",
            )}
            aria-label={`Move warm-up set ${data.setNumber} down`}
            title="Move down"
          >
            <ChevronDown className="size-3" />
          </button>
        )}
      </div>

      {/* Delete Button */}
      <button
        onClick={onDelete}
        className={cn(
          "text-destructive hover:bg-destructive/10 rounded p-1 transition-colors",
          "touch-target-sm",
        )}
        aria-label={`Delete warm-up set ${data.setNumber}`}
        title="Delete set"
      >
        <Trash2 className="size-4" />
      </button>
    </motion.div>
  );
}
