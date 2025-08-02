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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-600">
        <h3 className="text-xl font-semibold mb-4 text-white">
          Apply Progression
        </h3>
        
        <p className="text-gray-300 mb-6">
          You chose to add <span className="font-medium text-green-400">{increment}</span>.
          <br />
          How would you like to apply this progression?
        </p>

        <div className="space-y-3">
          <button
            onClick={() => {
              onApplyToAll();
              onClose();
            }}
            className="w-full p-3 text-left rounded-lg bg-green-600 hover:bg-green-700 transition-colors"
          >
            <div className="font-medium">Apply to ALL sets</div>
            <div className="text-sm text-green-200">
              Every set gets {increment}
            </div>
          </button>

          <button
            onClick={() => {
              onApplyToHighest();
              onClose();
            }}
            className="w-full p-3 text-left rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <div className="font-medium">Apply to HIGHEST set only</div>
            <div className="text-sm text-blue-200">
              Only the heaviest set gets {increment}
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
