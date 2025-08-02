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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-600">
        <h3 className="text-xl font-semibold mb-4 text-white">
          Progression Suggestion
        </h3>
        
        <p className="text-gray-300 mb-4">
          <span className="font-medium">{exerciseName}</span>
        </p>
        
        <p className="text-sm text-gray-400 mb-6">
          Last best: {previousBest.weight}{previousBest.unit} × {previousBest.reps} reps × {previousBest.sets} sets
        </p>

        <div className="space-y-3">
          <button
            onClick={() => handleSelection("weight")}
            className="w-full p-3 text-left rounded-lg bg-green-600 hover:bg-green-700 transition-colors"
          >
            <div className="font-medium">Add +{weightIncrement}{previousBest.unit}</div>
            <div className="text-sm text-green-200">
              {(previousBest.weight ?? 0) + weightIncrement}{previousBest.unit} × {previousBest.reps} reps
            </div>
          </button>

          <button
            onClick={() => handleSelection("reps")}
            className="w-full p-3 text-left rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <div className="font-medium">Add +1 rep</div>
            <div className="text-sm text-blue-200">
              {previousBest.weight}{previousBest.unit} × {(previousBest.reps ?? 0) + 1} reps
            </div>
          </button>

          <button
            onClick={() => handleSelection("none")}
            className="w-full p-3 text-left rounded-lg bg-gray-600 hover:bg-gray-700 transition-colors"
          >
            <div className="font-medium">Keep as is</div>
            <div className="text-sm text-gray-300">
              {previousBest.weight}{previousBest.unit} × {previousBest.reps} reps
            </div>
          </button>
        </div>
        
        <button
          onClick={onClose}
          className="mt-4 w-full p-2 text-gray-400 hover:text-gray-200 text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
