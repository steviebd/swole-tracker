import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Card, CardContent } from "~/components/ui/card";

interface MasterExercise {
  id: number;
  name: string;
  normalizedName: string;
  tags?: string | null;
  muscleGroup?: string | null;
  createdAt: Date;
  linkedCount: number;
}

interface MergeExerciseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedForMerge: MasterExercise[];
  onConfirmMerge: () => void;
  isMerging: boolean;
}

export function MergeExerciseDialog({
  open,
  onOpenChange,
  selectedForMerge,
  onConfirmMerge,
  isMerging,
}: MergeExerciseDialogProps) {
  if (selectedForMerge.length !== 2) return null;

  const [source, target] = selectedForMerge;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Merge</DialogTitle>
          <DialogDescription>
            This will merge "{source?.name}" into "{target?.name}". All linked
            template exercises will be moved to the target exercise, and the
            source exercise will be deleted. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-muted rounded-md p-3">
            <div className="text-sm">
              <div className="font-medium">
                Source exercise: {source?.name}
              </div>
              <div className="text-muted-foreground">
                {source?.linkedCount} linked template
                {source?.linkedCount !== 1 ? "s" : ""}
              </div>
            </div>
            <div className="mt-2 text-sm">
              <div className="font-medium">
                Target exercise: {target?.name}
              </div>
              <div className="text-muted-foreground">
                {target?.linkedCount} linked template
                {target?.linkedCount !== 1 ? "s" : ""}
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirmMerge}
            disabled={isMerging}
          >
            {isMerging ? "Merging..." : "Confirm Merge"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}