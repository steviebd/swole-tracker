"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  User,
  Server,
  GitMerge,
  Check,
  X
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Label } from "~/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { cn } from "~/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface ConflictData {
  id: string;
  localData: any;
  serverData: any;
  conflictType: 'workout_update' | 'set_update' | 'exercise_add';
  timestamp: number;
  field?: string;
}

interface ConflictResolutionModalProps {
  isOpen: boolean;
  conflicts: ConflictData[];
  onResolve: (conflictId: string, resolution: 'local' | 'server' | 'merge') => void;
  onResolveAll: (resolution: 'local' | 'server' | 'merge') => void;
  onClose: () => void;
}

export function ConflictResolutionModal({
  isOpen,
  conflicts,
  onResolve,
  onResolveAll,
  onClose
}: ConflictResolutionModalProps) {
  const [currentConflictIndex, setCurrentConflictIndex] = useState(0);
  const [selectedResolution, setSelectedResolution] = useState<'local' | 'server' | 'merge'>('local');
  const [resolutions, setResolutions] = useState<Record<string, 'local' | 'server' | 'merge'>>({});
  const [isResolving, setIsResolving] = useState(false);

  if (!conflicts.length) return null;

  const currentConflict = conflicts[currentConflictIndex];
  const hasNext = currentConflictIndex < conflicts.length - 1;
  const hasPrevious = currentConflictIndex > 0;

  const handleResolveConflict = async (resolution: 'local' | 'server' | 'merge') => {
    if (!currentConflict) return;
    
    setIsResolving(true);
    try {
      await onResolve(currentConflict.id, resolution);
      setResolutions(prev => ({ ...prev, [currentConflict.id]: resolution }));
      
      if (hasNext) {
        setCurrentConflictIndex(prev => prev + 1);
        setSelectedResolution('local');
      } else {
        onClose();
      }
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
    } finally {
      setIsResolving(false);
    }
  };

  const handleResolveAll = async () => {
    setIsResolving(true);
    try {
      await onResolveAll(selectedResolution);
      onClose();
    } catch (error) {
      console.error('Failed to resolve all conflicts:', error);
    } finally {
      setIsResolving(false);
    }
  };

  const formatConflictType = (type: string) => {
    switch (type) {
      case 'workout_update':
        return 'Workout Update';
      case 'set_update':
        return 'Set Update';
      case 'exercise_add':
        return 'Exercise Addition';
      default:
        return 'Data Conflict';
    }
  };

  const getConflictDescription = (conflict: ConflictData) => {
    switch (conflict.conflictType) {
      case 'workout_update':
        return 'Your local workout changes conflict with server updates.';
      case 'set_update':
        return `Changes to ${conflict.field || 'set data'} conflict with server version.`;
      case 'exercise_add':
        return 'Exercise was added both locally and on server.';
      default:
        return 'Data changes conflict between local and server versions.';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <DialogTitle>Resolve Sync Conflicts</DialogTitle>
            </div>
            <Badge variant="outline">
              {currentConflictIndex + 1} of {conflicts.length}
            </Badge>
          </div>
          <DialogDescription>
            {currentConflict ? getConflictDescription(currentConflict) : 'No conflict data available'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Conflict metadata */}
          {currentConflict && (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="space-y-1">
                <div className="font-medium text-sm">{formatConflictType(currentConflict.conflictType)}</div>
                <div className="text-xs text-muted-foreground">
                  Occurred {formatDistanceToNow(currentConflict.timestamp, { addSuffix: true })}
                </div>
              </div>
              <Badge variant="secondary">{currentConflict.conflictType}</Badge>
            </div>
          )}

          {/* Resolution options */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Choose Resolution:</Label>
            <RadioGroup 
              value={selectedResolution} 
              onValueChange={(value: string) => setSelectedResolution(value as 'local' | 'server' | 'merge')}
            >
              <div className="space-y-3">
                <Label className="flex items-center space-x-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="local" id="local" />
                  <div className="flex items-center gap-2 flex-1">
                    <User className="w-4 h-4 text-blue-500" />
                    <div>
                      <div className="font-medium">Keep Your Version</div>
                      <div className="text-xs text-muted-foreground">Use your local changes and discard server version</div>
                    </div>
                  </div>
                </Label>

                <Label className="flex items-center space-x-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="server" id="server" />
                  <div className="flex items-center gap-2 flex-1">
                    <Server className="w-4 h-4 text-green-500" />
                    <div>
                      <div className="font-medium">Use Server Version</div>
                      <div className="text-xs text-muted-foreground">Accept server changes and discard your local changes</div>
                    </div>
                  </div>
                </Label>

                <Label className="flex items-center space-x-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="merge" id="merge" />
                  <div className="flex items-center gap-2 flex-1">
                    <GitMerge className="w-4 h-4 text-purple-500" />
                    <div>
                      <div className="font-medium">Smart Merge</div>
                      <div className="text-xs text-muted-foreground">Attempt to combine both versions intelligently</div>
                    </div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Quick resolution for all conflicts */}
          {conflicts.length > 1 && (
            <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                <span className="font-medium text-sm text-orange-700 dark:text-orange-300">
                  Multiple Conflicts Detected
                </span>
              </div>
              <p className="text-xs text-orange-600 dark:text-orange-400 mb-3">
                You can resolve all {conflicts.length} conflicts at once using the same strategy.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResolveAll}
                disabled={isResolving}
                className="border-orange-200 text-orange-700 hover:bg-orange-100"
              >
                Resolve All with {selectedResolution === 'local' ? 'Your Version' : selectedResolution === 'server' ? 'Server Version' : 'Smart Merge'}
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <div className="flex items-center gap-2 mr-auto">
            {hasPrevious && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentConflictIndex(prev => prev - 1)}
                disabled={isResolving}
              >
                Previous
              </Button>
            )}
            {hasNext && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentConflictIndex(prev => prev + 1)}
                disabled={isResolving}
              >
                Next
              </Button>
            )}
          </div>
          
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isResolving}
          >
            Cancel
          </Button>
          <Button
            onClick={() => handleResolveConflict(selectedResolution)}
            disabled={isResolving}
          >
            {isResolving && (
              <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
            <Check className="w-4 h-4 mr-2" />
            Resolve This Conflict
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}