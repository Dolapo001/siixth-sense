import Link from "next/link";
import { ArrowRight, ChevronDown, MapPin } from "lucide-react";
import { BrandReveal } from "@/components/brand/brand-motion";
import { buttonStyles } from "@/components/ui/button";
import { demoDetections, landingImages } from "@/features/landing/fixtures";
import { X_HANDLE, X_URL } from "@/features/landing/socials";
import { HeroPreview } from "./hero-preview";
import { SceneImage } from "./scene-image";
import { ContractAddress, XIcon } from "./socials";

/*
 * Cinematic hero. The starburst reveals first, then the headline (the
 * official tagline) and the rest follow. The entrance runs on CSS (classes
 * sid-rise / sid-fade / ss-* with staggered delays), so copy and buttons
 * appear without waiting for JavaScript. Reduced motion skips it via the
 * global rule in globals.css.
 */

const at = (seconds: number) => ({ animationDelay: `${seconds}s` });

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative isolate flex min-h-[92svh] flex-col overflow-hidden">
      {/* Environment, with a near-imperceptible push. */}
      <div aria-hidden className="sid-fade absolute inset-0 -z-10">
        <SceneImage image={landingImages.hero} eager className="sid-drift h-full w-full object-[60%_center]" />
      </div>
      <div aria-hidden className="absolute inset-0 -z-10 bg-midnight/20" />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-linear-to-r from-midnight/95 via-midnight/70 to-transparent max-lg:bg-midnight/75 lg:via-midnight/45"
      />
      <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-48 bg-linear-to-b from-transparent to-midnight" />

      <div className="mx-auto grid w-full max-w-7xl flex-1 items-center gap-12 px-5 pt-28 pb-20 md:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-14 lg:pt-32">
        <div className="flex min-w-0 flex-col gap-6">
          <div className="flex items-center gap-3">
            <BrandReveal size={30} delay={0.2} />
            <p className="sid-rise eyebrow text-accent" style={at(0.4)}>
              Visual intelligence network
            </p>
          </div>
          <h1
            id="hero-title"
            className="text-[2.75rem] leading-[0.98] font-bold tracking-[-0.035em] uppercase sm:text-[3.5rem] lg:text-[4.5rem]"
          >
            <span className="sid-rise block" style={at(0.5)}>
              See beyond
            </span>
            <span className="sid-rise block" style={at(0.62)}>
              the <span className="text-accent">scene.</span>
            </span>
          </h1>
          <p className="sid-rise max-w-xl text-body text-pretty text-fg/75 md:text-[1.0625rem]" style={at(0.8)}>
            Turn gameplay screenshots into intelligence. Identify what you see, uncover discoveries and explore the
            world through a community-powered visual network.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link href="/world" className={buttonStyles({ size: "lg", className: "sid-rise group" })} style={at(1.0)}>
              <MapPin aria-hidden />
              Explore the World
            </Link>
            <Link
              href="/analyze"
              className={buttonStyles({ variant: "secondary", size: "lg", className: "sid-rise glass-subtle group" })}
              style={at(1.08)}
            >
              Analyze a Screenshot
              <ArrowRight aria-hidden className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          <p className="sid-rise meta tracking-[0.2em] text-fg/80" style={at(1.15)}>
            ANALYZE · IDENTIFY · DISCOVER
          </p>
          <div className="sid-rise flex flex-col gap-3" style={at(1.25)}>
            <ContractAddress />
            <a
              href={X_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 self-start rounded-md text-small text-fg/75 transition-colors hover:text-fg"
            >
              <XIcon className="size-4" />
              Follow {X_HANDLE}
            </a>
          </div>
        </div>

        <HeroPreview image={landingImages.boulevard} detections={demoDetections} />
      </div>

      <a
        href="#how-it-works"
        className="sid-rise group absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1 rounded-md px-2 py-1 text-meta text-muted hover:text-fg md:flex"
        style={at(1.6)}
      >
        Scroll to explore
        <ChevronDown aria-hidden className="size-4 transition-transform group-hover:translate-y-0.5" />
      </a>
    </section>
  );
}
