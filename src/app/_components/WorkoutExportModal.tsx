"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useAction } from "convex/react";
import { 
  X, 
  Download, 
  Share2, 
  FileText, 
  Copy, 
  ExternalLink,
  Calendar,
  TrendingUp,
  BarChart3,
  CheckCircle
} from "lucide-react";
import { api } from "~/convex/_generated/api";
import { Button } from "~/components/ui/button";
import { GlassSurface } from "~/components/ui/glass-surface";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Badge } from "~/components/ui/badge";
import { toast } from "sonner";
import { cn } from "~/lib/utils";
import type { Id } from "~/convex/_generated/dataModel";

interface WorkoutExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  workoutId: Id<"workoutSessions">;
  workoutName?: string;
}

export default function WorkoutExportModal({
  isOpen,
  onClose,
  workoutId,
  workoutName = "Workout"
}: WorkoutExportModalProps) {
  const [exportFormat, setExportFormat] = useState<"csv" | "json">("csv");
  const [shareType, setShareType] = useState<"link" | "text" | "image">("text");
  const [isExporting, setIsExporting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);

  // Fetch workout data for preview
  // TODO: Re-enable when workoutExport API is restored
  const workoutSummary: any = null; // useQuery(api.workoutExport.getWorkoutForExport, {
  //   workoutId,
  //   format: "summary"
  // });

  // Actions
  // TODO: Re-enable when workoutExport API is restored
  const exportWorkout: any = null; // useAction(api.workoutExport.exportWorkoutData);
  const createShareable: any = null; // useAction(api.workoutExport.createShareableWorkout);

  const handleExport = async () => {
    if (!workoutSummary) return;
    
    setIsExporting(true);
    try {
      const result = await exportWorkout({
        workoutIds: [workoutId],
        format: exportFormat,
        includePersonalRecords: true
      });

      if (exportFormat === "csv") {
        // Create and download CSV file
        const blob = new Blob([result.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.filename || 'workout-export.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success("CSV file downloaded successfully!");
      } else {
        // Create and download JSON file
        const blob = new Blob([JSON.stringify(result.data, null, 2)], { 
          type: 'application/json' 
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `workout-${workoutSummary.date}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success("JSON file downloaded successfully!");
      }
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export workout data");
    } finally {
      setIsExporting(false);
    }
  };

  const handleShare = async () => {
    if (!workoutSummary) return;

    setIsSharing(true);
    try {
      const result = await createShareable({
        workoutId,
        shareType
      });

      if (shareType === "text" && result.shareText) {
        // Copy to clipboard and show share options
        await navigator.clipboard.writeText(result.shareText);
        setCopiedToClipboard(true);
        setTimeout(() => setCopiedToClipboard(false), 2000);
        toast.success("Workout summary copied to clipboard!");

        // Try native sharing if available
        if (navigator.share) {
          await navigator.share({
            title: `${workoutName} - Workout Summary`,
            text: result.shareText,
          });
        }
      } else if (shareType === "link" && result.shareUrl) {
        await navigator.clipboard.writeText(result.shareUrl);
        toast.success("Share link copied to clipboard!");
      }
    } catch (error) {
      console.error("Sharing failed:", error);
      toast.error("Failed to share workout");
    } finally {
      setIsSharing(false);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(Math.round(num));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-2xl max-h-[90vh] mx-4"
      >
        <GlassSurface className="p-6 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Share2 className="w-6 h-6 text-primary" />
                Share & Export
              </h2>
              <p className="text-muted-foreground mt-1">
                Share your workout or export your data
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Workout Summary */}
          {workoutSummary && (
            <div className="mb-6">
              <GlassSurface className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground">{workoutSummary.templateName}</h3>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(workoutSummary.date)}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-xl font-bold text-foreground">
                        {formatNumber(workoutSummary.totalVolume)}kg
                      </div>
                      <div className="text-xs text-muted-foreground">Total Volume</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-foreground">
                        {workoutSummary.totalSets}
                      </div>
                      <div className="text-xs text-muted-foreground">Sets</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-foreground">
                        {workoutSummary.exercises.length}
                      </div>
                      <div className="text-xs text-muted-foreground">Exercises</div>
                    </div>
                  </div>
                </div>
              </GlassSurface>
            </div>
          )}

          {/* Tabs for Share and Export */}
          <Tabs defaultValue="share" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="share" className="flex items-center gap-2">
                <Share2 className="w-4 h-4" />
                Share
              </TabsTrigger>
              <TabsTrigger value="export" className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export
              </TabsTrigger>
            </TabsList>

            <TabsContent value="share" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-3">Share Format</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant={shareType === "text" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setShareType("text")}
                      className="flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      Text
                    </Button>
                    <Button
                      variant={shareType === "link" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setShareType("link")}
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Link
                    </Button>
                    <Button
                      variant={shareType === "image" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setShareType("image")}
                      disabled
                      className="flex items-center gap-2 opacity-50"
                    >
                      <BarChart3 className="w-4 h-4" />
                      Image
                    </Button>
                  </div>
                </div>

                <Button
                  onClick={handleShare}
                  disabled={isSharing || !workoutSummary}
                  className="w-full"
                >
                  {isSharing ? (
                    "Sharing..."
                  ) : copiedToClipboard ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4" />
                      Share Workout
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="export" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-3">Export Format</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={exportFormat === "csv" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setExportFormat("csv")}
                      className="flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      CSV (Spreadsheet)
                    </Button>
                    <Button
                      variant={exportFormat === "json" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setExportFormat("json")}
                      className="flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      JSON (Data)
                    </Button>
                  </div>
                </div>

                <div className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg">
                  {exportFormat === "csv" ? 
                    "CSV format is perfect for importing into Excel, Google Sheets, or other analysis tools." :
                    "JSON format provides structured data that can be used by developers or imported into other fitness apps."
                  }
                </div>

                <Button
                  onClick={handleExport}
                  disabled={isExporting || !workoutSummary}
                  className="w-full"
                >
                  {isExporting ? (
                    "Exporting..."
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Export as {exportFormat.toUpperCase()}
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground text-center">
              Your workout data is exported securely and remains private to you.
            </p>
          </div>
        </GlassSurface>
      </motion.div>
    </div>
  );
}