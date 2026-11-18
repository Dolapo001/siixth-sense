"use client";

import { useId, useState } from "react";
import { AlertTriangle, ImageUp } from "lucide-react";
import { describeTypes, formatBytes, type UploadConstraints } from "@/features/image-analysis/validation";
import { cn } from "@/lib/utilities/cn";

type UploadDropzoneProps = {
  constraints: UploadConstraints;
  onFile: (file: File) => void;
  error?: string | null;
  className?: string;
};

/** Drag-and-drop area with a keyboard-accessible file picker. Images only. */
export function UploadDropzone({ constraints, onFile, error, className }: UploadDropzoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputId = useId();
  const hintId = useId();
  const errorId = useId();

  return (
    <div
      onDragEnter={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        const file = event.dataTransfer.files[0];
        if (file) onFile(file);
      }}
      className={cn(
        "relative flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed px-6 py-16 text-center transition-colors",
        dragging ? "border-accent bg-accent/5" : error ? "border-signal/60" : "border-border hover:border-muted",
        className,
      )}
    >
      {/* Viewfinder corners frame the drop target. */}
      {[
        "top-3 left-3 border-t-2 border-l-2",
        "top-3 right-3 border-t-2 border-r-2",
        "bottom-3 left-3 border-b-2 border-l-2",
        "right-3 bottom-3 border-r-2 border-b-2",
      ].map((corner) => (
        <span
          key={corner}
          aria-hidden
          className={cn("absolute size-5", corner, dragging ? "border-accent" : "border-muted/50")}
        />
      ))}
      <span className="flex size-12 items-center justify-center rounded-lg border border-border text-accent">
        <ImageUp aria-hidden className="size-6" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-heading font-semibold">Drop a gameplay screenshot here</p>
        <p id={hintId} className="text-small text-muted">
          {describeTypes(constraints.acceptedTypes)}, up to {formatBytes(constraints.maxBytes)}
        </p>
      </div>
      <input
        id={inputId}
        type="file"
        accept={constraints.acceptedTypes.join(",")}
        aria-describedby={[hintId, error ? errorId : null].filter(Boolean).join(" ")}
        aria-invalid={error ? true : undefined}
        className="peer sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          // Allow choosing the same file again after an error.
          event.target.value = "";
        }}
      />
      <label
        htmlFor={inputId}
        className="inline-flex h-10 cursor-pointer items-center rounded-md bg-accent px-4 text-small font-medium text-midnight transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent hover:bg-fg"
      >
        Choose a screenshot
      </label>
      {error && (
        <p id={errorId} role="alert" className="flex items-center gap-1.5 text-small text-signal">
          <AlertTriangle aria-hidden className="size-4" />
          {error}
        </p>
      )}
    </div>
  );
}
