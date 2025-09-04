"use client";

import { useState } from "react";
import { type ConflictResolution } from "~/lib/offline-storage";

type ConflictData = {
  id: string;
  type: 'workout' | 'template' | 'exercise';
  localData: any;
  remoteData: any;
  localTimestamp: number;
  remoteTimestamp: number;
};

type ConflictResolutionModalProps = {
  conflicts: ConflictData[];
  isOpen: boolean;
  onResolve: (resolutions: Record<string, ConflictResolution>) => void;
  onClose: () => void;
};

export function ConflictResolutionModal({ 
  conflicts, 
  isOpen, 
  onResolve, 
  onClose 
}: ConflictResolutionModalProps) {
  const [resolutions, setResolutions] = useState<Record<string, ConflictResolution>>({});
  const [isResolving, setIsResolving] = useState(false);

  if (!isOpen || conflicts.length === 0) {
    return null;
  }

  const handleResolutionChange = (conflictId: string, resolution: ConflictResolution) => {
    setResolutions(prev => ({
      ...prev,
      [conflictId]: resolution,
    }));
  };

  const handleResolveAll = async () => {
    setIsResolving(true);
    try {
      // Fill in any missing resolutions with 'remote' as default
      const completeResolutions = { ...resolutions };
      conflicts.forEach(conflict => {
        if (!completeResolutions[conflict.id]) {
          completeResolutions[conflict.id] = 'remote';
        }
      });
      
      onResolve(completeResolutions);
    } catch (error) {
      console.error('Failed to resolve conflicts:', error);
    } finally {
      setIsResolving(false);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getDataPreview = (data: unknown, type: string): string => {
    const safeData = data as { 
      exercises?: Array<{ sets?: unknown[] }>; 
      name?: string; 
      sets?: number; 
    };
    
    switch (type) {
      case 'workout':
        return `${safeData.exercises?.length || 0} exercises, ${
          safeData.exercises?.reduce((total: number, ex) => 
            total + (ex.sets?.length || 0), 0) ?? 0
        } sets`;
      case 'template':
        return `"${safeData.name || 'Unnamed'}" - ${safeData.exercises?.length || 0} exercises`;
      case 'exercise':
        return `"${safeData.name || 'Unnamed'}" - ${safeData.sets || 0} sets`;
      default:
        return 'Data preview unavailable';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-surface-primary rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-default">
          <h2 className="text-xl font-semibold text-content-primary">
            Data Sync Conflicts
          </h2>
          <p className="mt-1 text-sm text-content-secondary">
            We found conflicts between your local data and server data. 
            Please choose which version to keep for each item.
          </p>
        </div>

        <div className="px-6 py-4 max-h-96 overflow-y-auto">
          <div className="space-y-6">
            {conflicts.map((conflict) => (
              <div key={conflict.id} className="border border-default rounded-lg p-4">
                <div className="mb-4">
                  <h3 className="font-medium text-content-primary capitalize">
                    {conflict.type} Conflict
                  </h3>
                  <p className="text-sm text-content-secondary">
                    Both versions were modified recently. Choose which one to keep.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Local version */}
                  <div className="border border-interactive-primary rounded-lg p-3 bg-surface-secondary">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-interactive-primary">Your Version (Local)</h4>
                      <input
                        type="radio"
                        name={`conflict-${conflict.id}`}
                        value="local"
                        checked={resolutions[conflict.id] === 'local'}
                        onChange={() => handleResolutionChange(conflict.id, 'local')}
                        className="text-interactive-primary"
                      />
                    </div>
                    <p className="text-sm text-content-primary mb-2">
                      {getDataPreview(conflict.localData, conflict.type)}
                    </p>
                    <p className="text-xs text-interactive-primary">
                      Modified: {formatTimestamp(conflict.localTimestamp)}
                    </p>
                  </div>

                  {/* Remote version */}
                  <div className="border border-status-success rounded-lg p-3 bg-surface-secondary">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-status-success">Server Version (Remote)</h4>
                      <input
                        type="radio"
                        name={`conflict-${conflict.id}`}
                        value="remote"
                        checked={resolutions[conflict.id] === 'remote' || !resolutions[conflict.id]}
                        onChange={() => handleResolutionChange(conflict.id, 'remote')}
                        className="text-status-success"
                      />
                    </div>
                    <p className="text-sm text-content-primary mb-2">
                      {getDataPreview(conflict.remoteData, conflict.type)}
                    </p>
                    <p className="text-xs text-status-success">
                      Modified: {formatTimestamp(conflict.remoteTimestamp)}
                    </p>
                  </div>
                </div>

                {/* Merge option for compatible data types */}
                {(conflict.type === 'template' || conflict.type === 'workout') && (
                  <div className="border border-interactive-accent rounded-lg p-3 bg-surface-secondary">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-interactive-accent">Merge Both Versions</h4>
                        <p className="text-xs text-interactive-accent">
                          Combine data from both versions (experimental)
                        </p>
                      </div>
                      <input
                        type="radio"
                        name={`conflict-${conflict.id}`}
                        value="merge"
                        checked={resolutions[conflict.id] === 'merge'}
                        onChange={() => handleResolutionChange(conflict.id, 'merge')}
                        className="text-interactive-accent"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-default bg-surface-secondary">
          <div className="flex justify-between items-center">
            <div className="text-sm text-content-secondary">
              {conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''} to resolve
            </div>
            <div className="space-x-3">
              <button
                onClick={onClose}
                disabled={isResolving}
                className="px-4 py-2 text-sm text-content-primary bg-surface-primary border border-default rounded-md hover:bg-surface-secondary disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleResolveAll}
                disabled={isResolving}
                className="px-4 py-2 text-sm text-white bg-interactive-primary rounded-md hover:bg-interactive-primary/90 disabled:opacity-50"
              >
                {isResolving ? 'Resolving...' : 'Resolve All Conflicts'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}