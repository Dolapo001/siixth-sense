"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw, Upload, X } from "lucide-react";
import { SignalMark } from "@/components/brand/brand-motion";
import { AnalysisProgress } from "@/components/analysis/analysis-progress";
import { DetectionList } from "@/components/analysis/detection-list";
import { LocationMatches } from "@/components/analysis/location-matches";
import { ResultSources } from "@/components/analysis/result-sources";
import { ShareWithCommunity } from "@/components/analysis/share-with-community";
import { ScreenshotStage } from "@/components/analysis/screenshot-stage";
import { UploadDropzone } from "@/components/analysis/upload-dropzone";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { EmptyState, ErrorState, LoadingState, UnavailableState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AnalysisDataSource } from "./data/source";
import { useAnalysisSource, useScreenshotAnalysis } from "./hooks";
import { displayStatus } from "./state";
import { NOT_GTA } from "./types";

export function AnalyzeExperience() {
  const source = useAnalysisSource();

  if (source.isPending) {
    return (
      <PageContainer>
        <Header sample={false} />
        <LoadingState label="Loading" />
      </PageContainer>
    );
  }
  if (source.isError) {
    return (
      <PageContainer>
        <Header sample={false} />
        <ErrorState onRetry={() => source.refetch()} />
      </PageContainer>
    );
  }
  if (!source.data) {
    return (
      <PageContainer>
        <Header sample={false} />
        <UnavailableState description="Screenshot analysis needs the Sixth Sense analysis service, which isn't connected yet." />
      </PageContainer>
    );
  }
  return <Workspace source={source.data} />;
}

function Header({ sample }: { sample: boolean }) {
  return (
    <PageHeader
      eyebrow="Visual intelligence"
      title="Analyze a screenshot"
      description="Upload a gameplay screenshot. Sixth Sense suggests what's in it and where it might be. Suggestions stay unverified until the community confirms them."
      actions={
        sample ? (
          <Badge tone="signal" className="self-start">
            Sample data · nothing is uploaded
          </Badge>
        ) : undefined
      }
    />
  );
}

/**
 * Each phase swaps the controls, so the button the user just pressed often
 * disappears and focus falls back to <body>. When that happens, move focus to
 * the phase's main control (marked data-focus-target), or the file input.
 */
function useRestoreFocus(phaseKey: string) {
  const ref = useRef<HTMLDivElement>(null);
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    if (document.activeElement && document.activeElement !== document.body) return;
    ref.current?.querySelector<HTMLElement>('[data-focus-target], input[type="file"]')?.focus();
  }, [phaseKey]);
  return ref;
}

function Workspace({ source }: { source: AnalysisDataSource }) {
  const { state, select, upload, cancel, reset, jobFetchFailed, retryJobFetch } = useScreenshotAnalysis(source);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const status = displayStatus(state);
  const job = state.phase === "submitted" ? state.job : null;
  const detections = job?.status === "completed" ? job.detections : [];

  const startOver = () => {
    setSelectedId(null);
    reset();
  };

  const containerRef = useRestoreFocus(`${state.phase}:${status}`);

  if (state.phase === "idle") {
    return (
      <PageContainer ref={containerRef}>
        <Header sample={source.kind === "sample"} />
        <UploadDropzone constraints={source.constraints} onFile={select} error={state.error} />
      </PageContainer>
    );
  }

  return (
    <PageContainer ref={containerRef}>
      <Header sample={source.kind === "sample"} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <ScreenshotStage
          src={state.previewUrl}
          alt={`Your screenshot: ${state.file.name}`}
          scanning={status === "queued" || status === "processing"}
          detections={detections}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />

        <aside aria-label="Analysis" className="flex flex-col gap-6">
          <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="meta truncate text-muted" title={state.file.name}>
                {state.file.name}
              </p>
            </div>
            <AnalysisProgress
              status={status}
              uploadProgress={state.phase === "uploading" ? state.progress : undefined}
            />

            {state.phase === "submitted" && <p className="meta text-muted">Submitted · job {state.jobId}</p>}

            <div className="flex flex-wrap gap-2">
              {state.phase === "selected" && (
                <>
                  <Button onClick={upload} data-focus-target>
                    <Upload aria-hidden />
                    Analyze screenshot
                  </Button>
                  <Button variant="ghost" onClick={startOver}>
                    Choose another
                  </Button>
                </>
              )}
              {state.phase === "uploading" && (
                <Button variant="secondary" onClick={cancel} data-focus-target>
                  <X aria-hidden />
                  Cancel upload
                </Button>
              )}
              {(status === "completed" || status === "failed") && (
                <Button variant="secondary" onClick={startOver} data-focus-target>
                  <RotateCcw aria-hidden />
                  Analyze another screenshot
                </Button>
              )}
            </div>
          </section>

          {state.phase === "upload-failed" && (
            <ErrorState title="Upload failed" description={state.error} onRetry={upload} className="py-6" />
          )}

          {jobFetchFailed && (
            <ErrorState
              title="Lost contact with the analysis service"
              description="Your screenshot was submitted, but we couldn't get its status. Try again to reconnect."
              onRetry={retryJobFetch}
              className="py-6"
            />
          )}

          {job?.status === "failed" && (
            <ErrorState
              title={job.error?.code === NOT_GTA ? "Not a GTA VI screenshot" : "Analysis failed"}
              description={job.error?.message ?? "The analysis service couldn't process this screenshot."}
              className="py-6"
            />
          )}

          {job?.status === "completed" && (
            <>
              <section className="flex flex-col gap-3" aria-labelledby="detections-heading">
                <h2 id="detections-heading" className="eyebrow flex items-center gap-2">
                  {/* The recognition signal: lights once when the service reports something identified. */}
                  {detections.length > 0 && <SignalMark size={14} />}
                  Detected · {detections.length}
                </h2>
                {detections.length === 0 ? (
                  <EmptyState
                    title="Nothing identified"
                    description="The service didn't recognise anything in this screenshot."
                    className="py-6"
                  />
                ) : (
                  <DetectionList detections={detections} selectedId={selectedId} onSelect={setSelectedId} />
                )}
              </section>
              <section className="flex flex-col gap-3" aria-labelledby="locations-heading">
                <h2 id="locations-heading" className="eyebrow">
                  Possible locations
                </h2>
                <LocationMatches matches={job.locationMatches} />
              </section>
              <ShareWithCommunity job={job} />
              <ResultSources />
            </>
          )}
        </aside>
      </div>
    </PageContainer>
  );
}
