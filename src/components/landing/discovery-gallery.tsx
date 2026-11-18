import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import { VerificationBadge } from "@/components/shared/verification-badge";
import { exampleDiscoveries, type ExampleDiscovery } from "@/features/landing/fixtures";
import { categoryConfig } from "@/features/world/categories";
import { cn } from "@/lib/utilities/cn";
import { Reveal } from "./reveal";
import { SceneImage } from "./scene-image";
import { IllustrationTag } from "./section-heading";

function DiscoveryCard({ discovery, featured = false }: { discovery: ExampleDiscovery; featured?: boolean }) {
  const Icon = categoryConfig[discovery.category].icon;
  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface transition-[transform,border-color] duration-250 hover:-translate-y-1 hover:border-muted/60 motion-reduce:hover:translate-y-0 has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-accent",
        featured && "md:min-h-[26rem]",
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden",
          featured ? "aspect-[16/10] md:aspect-auto md:flex-1" : "aspect-[16/10]",
        )}
      >
        <SceneImage
          image={discovery.image}
          className="absolute inset-0 h-full w-full transition-transform duration-700 ease-out group-hover:scale-[1.06] motion-reduce:group-hover:scale-100"
          style={{ objectPosition: discovery.focus }}
          sizes={featured ? "(min-width: 1024px) 60vw, 100vw" : "(min-width: 1024px) 30vw, 80vw"}
        />
        <div aria-hidden className="absolute inset-0 bg-linear-to-t from-midnight/70 via-transparent to-transparent" />
        <span className="glass-subtle absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-meta">
          <Icon aria-hidden className="size-3.5 text-accent" />
          {discovery.categoryLabel}
        </span>
        <IllustrationTag className="absolute right-3 bottom-3">Example</IllustrationTag>
      </div>
      <div className={cn("flex flex-col gap-2.5 p-5", !featured && "flex-1", featured && "md:p-7")}>
        <h3 className={cn("font-semibold", featured ? "text-[1.5rem] leading-tight" : "text-body")}>
          <Link
            href={`/discoveries?category=${discovery.category}`}
            className="after:absolute after:inset-0 focus-visible:outline-none group-hover:text-accent group-focus-within:text-accent"
          >
            {discovery.title}
          </Link>
        </h3>
        <p className="text-small text-muted">{discovery.description}</p>
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-2 pt-2">
          {discovery.verification && <VerificationBadge status={discovery.verification} />}
          <span className="inline-flex items-center gap-1 text-meta text-muted">
            <MapPin aria-hidden className="size-3" />
            {discovery.location ?? "Location unknown"}
          </span>
          <ArrowUpRight
            aria-hidden
            className="ml-auto size-4 text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent"
          />
        </div>
      </div>
    </article>
  );
}

/**
 * Editorial grid: the featured discovery takes a 2×2 block, two cards stack
 * beside it and three run along the bottom. On phones, a horizontal swipe row.
 */
export function DiscoveryGallery() {
  return (
    // Revealed as one block: per-card reveals would leave off-screen cards in the phone swipe row blank.
    <Reveal>
      <ul className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 lg:grid-cols-3">
        {exampleDiscoveries.map((discovery, i) => (
          <li
            key={discovery.id}
            className={cn("w-[82%] shrink-0 snap-start md:w-auto", i === 0 && "md:col-span-2 lg:row-span-2")}
          >
            <DiscoveryCard discovery={discovery} featured={i === 0} />
          </li>
        ))}
      </ul>
    </Reveal>
  );
}
