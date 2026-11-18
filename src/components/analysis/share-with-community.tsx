"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleCheck, Users } from "lucide-react";
import { ActionError, SignInPrompt } from "@/components/community/action-bits";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { useSession } from "@/features/authentication/hooks";
import { actionErrorMessage } from "@/features/community/hooks";
import { shareSchema } from "@/features/community/schemas";
import { useDiscoverySource } from "@/features/discoveries/hooks";
import type { AnalysisJob } from "@/features/image-analysis/types";
import { categoryConfig } from "@/features/world/categories";
import { useWorldOverview } from "@/features/world/hooks";
import { discoveryCategories, type WorldMarker } from "@/features/world/types";
import { announce } from "@/lib/announce";
import { cn } from "@/lib/utilities/cn";
import type { z } from "zod";

type ShareInput = z.infer<typeof shareSchema>;

/** Named places on the World map, A–Z: what a player can pick when the analysis didn't place it. */
function useMapPlaces(): WorldMarker[] {
  const world = useWorldOverview();
  const markers = world.data?.markers;
  return useMemo(
    () =>
      (markers ?? [])
        // Discoveries are pinned at places and reuse the place's id (so their marker opens it);
        // they aren't places themselves, and listing them would offer the same id twice.
        .filter((m) => m.layer !== "discoveries" && m.nameKnown !== false && m.coordinate)
        .sort((a, b) => a.title.localeCompare(b.title)),
    [markers],
  );
}

const placeLabel = (place: WorldMarker) =>
  place.areas?.length ? `${place.title} — ${place.areas.slice(0, 2).join(", ")}` : place.title;

/** Below this, a detection or location is treated as a guess worth a second opinion. */
const UNSURE_BELOW = 0.5;

/** Why the result is uncertain, in plain words, or null when it's reasonably confident. */
export function uncertaintyOf(job: Pick<AnalysisJob, "detections" | "locationMatches">): string | null {
  if (job.detections.length === 0) return "Nothing in this screenshot was identified.";
  if (job.detections.some((d) => d.confidence !== undefined && d.confidence < UNSURE_BELOW)) {
    return "Some identifications are low-confidence guesses.";
  }
  if (job.locationMatches.length === 0) return "The location couldn't be placed.";
  if (job.locationMatches.every((m) => m.precision === "region")) return "Only the likely area was found, not the exact place.";
  return null;
}

/**
 * The way forward when the scanner isn't sure (or the player knows better):
 * share the screenshot as a discovery for the community to identify and verify.
 */
export function ShareWithCommunity({ job }: { job: AnalysisJob }) {
  const [open, setOpen] = useState(false);
  const [sharedId, setSharedId] = useState<string | null>(null);
  const session = useSession();
  const source = useDiscoverySource();
  const places = useMapPlaces();
  const unsure = uncertaintyOf(job);

  return (
    <section
      aria-labelledby="share-heading"
      className={cn(
        "flex flex-col gap-3 rounded-lg border p-4",
        unsure ? "border-signal/40 bg-signal/5" : "border-border bg-surface",
      )}
    >
      <h2 id="share-heading" className="flex items-center gap-2 text-body font-semibold">
        <Users aria-hidden className={cn("size-4", unsure ? "text-signal" : "text-accent")} />
        {unsure ? "Not sure? Ask the community" : "Share it with the community"}
      </h2>
      <p className="text-small text-muted">
        {unsure ? `${unsure} ` : ""}
        Share the screenshot as a discovery and players can identify it, add evidence and verify it.
      </p>

      {sharedId ? (
        <p role="status" className="flex flex-wrap items-center gap-2 text-small">
          <CircleCheck aria-hidden className="size-4 text-accent" />
          Shared. It&apos;s awaiting verification.
          <Link href={`/discoveries/${sharedId}`} className="text-accent underline underline-offset-2">
            View your discovery
          </Link>
        </p>
      ) : source.isSuccess && !source.data ? (
        <p className="text-small text-muted">Sharing needs the Sixth Sense backend, which isn&apos;t connected yet.</p>
      ) : !session.isPending && !session.data ? (
        <SignInPrompt action="share this screenshot with the community" />
      ) : (
        <Button
          variant={unsure ? "warning" : "secondary"}
          className="self-start"
          disabled={!source.data}
          onClick={() => setOpen(true)}
        >
          Share with the community
        </Button>
      )}

      {source.data && (
        <ShareDialog
          open={open}
          onOpenChange={setOpen}
          job={job}
          places={places}
          onShare={async (input) => {
            const match = job.locationMatches.find((m) => m.locationId === input.locationId);
            const place = places.find((p) => p.locationId === input.locationId);
            const location = match
              ? { id: match.locationId, name: match.name, areas: [] }
              : place
                ? { id: place.locationId, name: place.title, areas: place.areas ?? [] }
                : null;
            const { id } = await source.data!.submitDiscovery({
              analysisJobId: job.id,
              title: input.title,
              category: input.category,
              note: input.note || undefined,
              location,
            });
            setSharedId(id);
            announce("Shared with the community");
          }}
        />
      )}
    </section>
  );
}

function ShareDialog({
  open,
  onOpenChange,
  job,
  places,
  onShare,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: AnalysisJob;
  places: WorldMarker[];
  onShare: (input: ShareInput) => Promise<void>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [placeQuery, setPlaceQuery] = useState("");
  const top = job.detections[0];
  const {
    register,
    handleSubmit,
    control: formControl,
    formState: { errors, isSubmitting },
  } = useForm<ShareInput>({
    resolver: zodResolver(shareSchema),
    // Start from the scanner's best guess; the player can change everything.
    defaultValues: {
      title: top?.label ?? "",
      category: top?.category,
      note: "",
      locationId: job.locationMatches[0]?.locationId ?? "",
    },
  });

  const selected = useWatch({ control: formControl, name: "locationId" });
  const suggested = new Set(job.locationMatches.map((m) => m.locationId));
  const wanted = placeQuery.trim().toLowerCase();
  const listed = places.filter(
    (p) =>
      !suggested.has(p.locationId) &&
      // Keep the current choice listed, or the select would silently change it.
      (p.locationId === selected || !wanted || placeLabel(p).toLowerCase().includes(wanted)),
  );

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      variant="responsive"
      title="Share with the community"
      description="Your screenshot becomes a discovery, awaiting verification. Players can then identify it, add evidence and confirm or dispute it."
    >
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={handleSubmit(async (input) => {
          setError(null);
          try {
            await onShare(input);
            onOpenChange(false);
          } catch (e) {
            setError(actionErrorMessage(e));
          }
        })}
      >
        <Field label="Title" required error={errors.title?.message}>
          {(control) => <Input {...control} {...register("title")} />}
        </Field>
        <Field label="Category" required error={errors.category?.message}>
          {(control) => (
            <Select {...control} {...register("category")}>
              <option value="" disabled>
                Select…
              </option>
              {discoveryCategories.map((category) => (
                <option key={category} value={category}>
                  {categoryConfig[category].label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        {places.length > 0 && (
          <Field
            label="Find a place"
            hint={wanted ? `${listed.length} of ${places.length - suggested.size} map places match.` : "Filters the list below by name or area."}
          >
            {(control) => (
              <Input
                {...control}
                type="search"
                value={placeQuery}
                onChange={(event) => setPlaceQuery(event.target.value)}
                placeholder="e.g. Seven Seas or Ocean Beach"
              />
            )}
          </Field>
        )}
        <Field
          label="Where is it?"
          hint={
            places.length > 0
              ? "Pick a suggestion from the analysis or any place on the World map, or say you're not sure."
              : "Pick a candidate from the analysis, or say you're not sure."
          }
        >
          {(control) => (
            <Select {...control} {...register("locationId")}>
              <option value="">Not sure</option>
              {job.locationMatches.length > 0 && (
                <optgroup label="Suggested by the analysis">
                  {job.locationMatches.map((match) => (
                    <option key={match.locationId} value={match.locationId}>
                      {match.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {listed.length > 0 && (
                <optgroup label="Places on the World map">
                  {listed.map((place) => (
                    <option key={place.locationId} value={place.locationId}>
                      {placeLabel(place)}
                    </option>
                  ))}
                </optgroup>
              )}
            </Select>
          )}
        </Field>
        <Field
          label="What do you think it is?"
          hint="Optional. Anything that helps others identify it."
          error={errors.note?.message}
        >
          {(control) => <Textarea {...control} {...register("note")} />}
        </Field>
        <ActionError message={error} />
        <Button type="submit" loading={isSubmitting} className="self-start">
          Share
        </Button>
      </form>
    </Dialog>
  );
}
