import Link from "next/link";
import { ImageOff } from "lucide-react";
import { LocationPrecisionBadge } from "@/components/shared/location-precision";
import { VerificationBadge } from "@/components/shared/verification-badge";
import { categoryConfig } from "@/features/world/categories";
import { formatCoordinate } from "@/features/world/coordinates";
import type { LocationDetail, Region } from "@/features/world/types";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <h3 className="eyebrow">{title}</h3>
      {children}
    </section>
  );
}

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** Body of the location panel. Pure presentation; data comes from useLocation. */
export function LocationDetails({ location, region }: { location: LocationDetail; region: Region | null }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <p className="text-small text-muted">{location.areas?.length ? location.areas.join(" · ") : region ? region.name : "Area unknown"}</p>
        <div className="flex flex-wrap gap-2">
          <VerificationBadge status={location.verification} />
          <LocationPrecisionBadge precision={location.precision} />
        </div>
        <p className="meta text-muted">
          {location.coordinate ? formatCoordinate(location.coordinate) : "No coordinate"}
          {location.precision === "approximate" && location.radius ? ` · ±${location.radius} units` : ""}
        </p>
        {location.nameKnown === false && (
          <p className="text-meta text-muted">In-game name not confirmed yet. This name may change.</p>
        )}
        <p className="text-small">{location.description}</p>
        {location.realWorldCounterpart && (
          <p className="text-small text-muted">
            <span className="text-fg">Modelled on:</span> {location.realWorldCounterpart}
          </p>
        )}
        {location.tags && location.tags.length > 0 && (
          <ul aria-label="Kinds" className="flex flex-wrap gap-1.5">
            {location.tags.map((tag) => (
              <li key={tag} className="meta rounded-sm border border-border px-1.5 py-0.5 text-muted">
                {tag}
              </li>
            ))}
          </ul>
        )}
      </div>

      <Section title="Community activity">
        <dl className="grid grid-cols-3 gap-2">
          {[
            ["Discoveries", location.activity.discoveries],
            ["Contributors", location.activity.contributors],
            [
              "Last activity",
              location.activity.lastActivityAt ? dateFormat.format(new Date(location.activity.lastActivityAt)) : "None",
            ],
          ].map(([label, value]) => (
            <div key={label} className="rounded-md border border-border px-3 py-2">
              <dt className="text-meta text-muted">{label}</dt>
              <dd className="text-small font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title="Discoveries">
        {location.discoveries.length === 0 ? (
          <p className="text-small text-muted">No discoveries recorded here yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
            {location.discoveries.map((discovery) => {
              const Icon = categoryConfig[discovery.category].icon;
              return (
                <li key={discovery.id}>
                  <Link
                    href={`/discoveries/${discovery.id}`}
                    className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-surface-elevated"
                  >
                    <Icon aria-hidden className="size-4 shrink-0 text-muted" />
                    <span className="min-w-0 flex-1 truncate text-small">{discovery.title}</span>
                    <VerificationBadge status={discovery.verification} />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {location.relatedEntities.length > 0 && (
        <Section title="Related entities">
          <ul className="flex flex-wrap gap-2">
            {location.relatedEntities.map((entity) => {
              const Icon = categoryConfig[entity.category].icon;
              return (
                <li key={entity.id} className="inline-flex items-center gap-1.5 rounded-sm border border-border px-2 py-1 text-meta">
                  <Icon aria-hidden className="size-3.5 text-muted" />
                  {entity.name}
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      <Section title="Screenshots">
        {location.screenshots.length === 0 ? (
          <div className="flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-4 text-small text-muted">
            <ImageOff aria-hidden className="size-4" />
            No screenshots yet
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-2">
            {location.screenshots.map((shot) => (
              // eslint-disable-next-line @next/next/no-img-element -- remote host unknown until the API exists
              <li key={shot.id}><img src={shot.url} alt={shot.alt} loading="lazy" decoding="async" className="aspect-video w-full rounded-md object-cover" /></li>
            ))}
          </ul>
        )}
      </Section>
      {location.source && (
        <Section title="Source">
          <p className="text-small text-muted">
            <a
              href={location.source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-fg underline decoration-fg/40 underline-offset-2 hover:text-accent"
            >
              {location.source.name}
            </a>{" "}
            ·{" "}
            <a
              href={location.source.licenseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-fg"
            >
              {location.source.license}
            </a>
          </p>
          <p className="text-meta text-muted">{location.source.note}</p>
        </Section>
      )}
    </div>
  );
}
