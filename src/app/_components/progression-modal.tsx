"use client";

import { useState } from "react";

interface ProgressionModalProps {
  isOpen: boolean;
  onClose: () => void;
  exerciseName: string;
  previousBest: {
    weight?: number;
    reps?: number;
    sets: number;
    unit: "kg" | "lbs";
  };
  onApplyProgression: (type: "weight" | "reps" | "none") => void;
}

export function ProgressionModal({
  isOpen,
  onClose,
  exerciseName,
  previousBest,
  onApplyProgression,
}: ProgressionModalProps) {
  if (!isOpen) return null;

  const weightIncrement = previousBest.unit === "kg" ? 2.5 : 5;
  
  const handleSelection = (type: "weight" | "reps" | "none") => {
    onApplyProgression(type);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop">
      <div className="card glass-surface p-6 max-w-md w-full mx-4">
        <h3 className="text-xl font-semibold mb-4">
          Progression Suggestion
        </h3>
        
        <p className="mb-4">
          <span className="font-medium">{exerciseName}</span>
        </p>
        
        <p className="text-sm text-secondary mb-6">
          Last best: {previousBest.weight}{previousBest.unit} × {previousBest.reps} reps × {previousBest.sets} sets
        </p>

        <div className="space-y-3">
          <button
            onClick={() => handleSelection("weight")}
            className="w-full p-3 text-left rounded-lg btn-success transition-colors"
          >
            <div className="font-medium">Add +{weightIncrement}{previousBest.unit}</div>
            <div className="text-sm opacity-90">
              {(previousBest.weight ?? 0) + weightIncrement}{previousBest.unit} × {previousBest.reps} reps
            </div>
          </button>

          <button
            onClick={() => handleSelection("reps")}
            className="w-full p-3 text-left rounded-lg btn-primary transition-colors"
          >
            <div className="font-medium">Add +1 rep</div>
            <div className="text-sm opacity-90">
              {previousBest.weight}{previousBest.unit} × {(previousBest.reps ?? 0) + 1} reps
            </div>
          </button>

          <button
            onClick={() => handleSelection("none")}
            className="w-full p-3 text-left rounded-lg btn-secondary transition-colors"
          >
            <div className="font-medium">Keep as is</div>
            <div className="text-sm text-secondary">
              {previousBest.weight}{previousBest.unit} × {previousBest.reps} reps
            </div>
          </button>
        </div>
        
        <button
          onClick={onClose}
          className="mt-4 w-full rounded-lg btn-secondary px-4 py-2 text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
