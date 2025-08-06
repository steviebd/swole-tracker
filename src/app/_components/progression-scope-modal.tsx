"use client";

interface ProgressionScopeModalProps {
  isOpen: boolean;
  onClose: () => void;
  progressionType: "weight" | "reps";
  increment: string; // e.g., "+2.5kg" or "+1 rep"
  onApplyToAll: () => void;
  onApplyToHighest: () => void;
}

export function ProgressionScopeModal({
  isOpen,
  onClose,
  progressionType,
  increment,
  onApplyToAll,
  onApplyToHighest,
}: ProgressionScopeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop">
      <div className="card glass-surface p-6 max-w-md w-full mx-4">
        <h3 className="text-xl font-semibold mb-4">
          Apply Progression
        </h3>
        
        <p className="text-secondary mb-6">
          You chose to add <span className="font-medium text-green-700 dark:text-green-400">{increment}</span>.
          <br />
          How would you like to apply this progression?
        </p>

        <div className="space-y-3">
          <button
            onClick={() => {
              onApplyToAll();
              onClose();
            }}
            className="w-full p-3 text-left rounded-lg btn-success transition-colors"
          >
            <div className="font-medium">Apply to ALL sets</div>
            <div className="text-sm opacity-90">
              Every set gets {increment}
            </div>
          </button>

          <button
            onClick={() => {
              onApplyToHighest();
              onClose();
            }}
            className="w-full p-3 text-left rounded-lg btn-primary transition-colors"
          >
            <div className="font-medium">Apply to HIGHEST set only</div>
            <div className="text-sm opacity-90">
              Only the heaviest set gets {increment}
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
