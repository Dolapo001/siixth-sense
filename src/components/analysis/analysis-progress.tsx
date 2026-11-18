import { Check, Loader2 } from "lucide-react";
import type { DisplayStatus } from "@/features/image-analysis/state";
import { cn } from "@/lib/utilities/cn";

const steps = [
  { key: "upload", label: "Upload" },
  { key: "queued", label: "Queued" },
  { key: "processing", label: "Analysing" },
  { key: "results", label: "Results" },
] as const;

/** Index of the current step for each status; -1 before anything starts. */
const currentStep: Record<DisplayStatus, number> = {
  idle: -1,
  selected: 0,
  uploading: 0,
  "upload-failed": 0,
  uploaded: 1,
  queued: 1,
  processing: 2,
  completed: 4,
  failed: 3,
};

/** What a screen reader hears when the status changes. */
export const statusAnnouncement: Record<DisplayStatus, string> = {
  idle: "",
  selected: "Screenshot ready to analyse.",
  uploading: "Uploading screenshot.",
  "upload-failed": "Upload failed.",
  uploaded: "Screenshot submitted. Waiting for the analysis service.",
  queued: "Queued for analysis.",
  processing: "Analysing screenshot.",
  completed: "Analysis complete.",
  failed: "Analysis failed.",
};

export function AnalysisProgress({ status, uploadProgress }: { status: DisplayStatus; uploadProgress?: number }) {
  const current = currentStep[status];
  const failedAt = status === "failed" ? 3 : status === "upload-failed" ? 0 : -1;

  return (
    <div className="flex flex-col gap-3">
      <ol className="grid grid-cols-4 gap-2">
        {steps.map((step, index) => {
          const done = index < current && failedAt !== index;
          const active =
            index === current && (status === "uploading" || status === "queued" || status === "processing");
          const failed = index === failedAt;
          return (
            <li key={step.key} className="flex flex-col gap-1.5" aria-current={index === current ? "step" : undefined}>
              <span
                aria-hidden
                className={cn(
                  "h-1 rounded-full",
                  failed ? "bg-signal" : done ? "bg-accent" : active ? "bg-accent/50" : "bg-border",
                )}
              />
              <span
                className={cn(
                  "flex items-center gap-1 text-meta",
                  failed ? "text-signal" : done || active ? "text-fg" : "text-muted",
                )}
              >
                {done && <Check aria-hidden className="size-3" />}
                {active && <Loader2 aria-hidden className="size-3 motion-safe:animate-spin" />}
                {step.label}
                <span className="sr-only">
                  {failed ? " (failed)" : done ? " (done)" : active ? " (in progress)" : ""}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
      {status === "uploading" && uploadProgress !== undefined && (
        <div className="flex items-center gap-3">
          <progress
            value={Math.round(uploadProgress * 100)}
            max={100}
            aria-label="Upload progress"
            className="h-1.5 flex-1 appearance-none overflow-hidden rounded-full [&::-moz-progress-bar]:bg-accent [&::-webkit-progress-bar]:bg-border [&::-webkit-progress-value]:bg-accent"
          />
          <span className="meta w-10 text-right text-muted">{Math.round(uploadProgress * 100)}%</span>
        </div>
      )}
      <p className="sr-only" role="status" aria-live="polite">
        {statusAnnouncement[status]}
      </p>
    </div>
  );
}
