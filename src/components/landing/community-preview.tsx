"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { Check, MessageSquare, ScanSearch, Users } from "lucide-react";
import { Avatar } from "@/components/profiles/avatar";
import { VerificationBadge } from "@/components/shared/verification-badge";
import { landingImages } from "@/features/landing/fixtures";
import type { VerificationStatus } from "@/types/intelligence";
import { cn } from "@/lib/utilities/cn";
import { ScannerCorners } from "./scanner-demo";
import { SceneImage } from "./scene-image";
import { IllustrationTag } from "./section-heading";

const steps: { status: VerificationStatus; label: string; icon: typeof Check; note: string }[] = [
  {
    status: "ai_suggested",
    label: "AI suggested",
    icon: ScanSearch,
    note: "Sixth Sense suggests what it sees. Nobody has checked yet.",
  },
  {
    status: "awaiting_verification",
    label: "Community review",
    icon: Users,
    note: "Players add evidence, confirm or dispute.",
  },
  { status: "verified", label: "Verified", icon: Check, note: "Reviewers agree. Only now is it verified." },
];

const comments = [
  { name: "Example Contributor", body: "Same flock shows up at dusk, from the boardwalk side too." },
  { name: "Example Reviewer", body: "Compared with two other screenshots. The markings match." },
];

/**
 * An example discovery moving through review. Each stage is shown in turn,
 * so an AI suggestion never appears verified before reviewers act.
 */
export function CommunityPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -120px 0px" });
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!inView || reduce) return;
    const timers = [setTimeout(() => setStep(1), 1400), setTimeout(() => setStep(2), 2900)];
    return () => timers.forEach(clearTimeout);
  }, [inView, reduce]);

  // Reduced motion: show the whole journey at once instead of animating it.
  const current = reduce ? 2 : step;

  return (
    <div ref={ref} className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="relative aspect-[16/10]">
          <SceneImage
            image={landingImages.marsh}
            className="absolute inset-0 h-full w-full"
            sizes="(min-width: 1024px) 45vw, 100vw"
          />
          <ScannerCorners />
          {/* Frames the nearer flamingo in marsh-dusk.svg (drawn at 520,740, scale 2.1). */}
          <span
            aria-hidden
            className="absolute rounded-[3px] border border-accent/80"
            style={{ left: "27.5%", top: "53.5%", width: "10.5%", height: "34%" }}
          />
          <IllustrationTag className="absolute right-2 bottom-2">Example</IllustrationTag>
        </div>
        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-center gap-3">
            <Avatar name="Example Contributor" size="sm" />
            <div className="flex flex-col">
              <span className="text-small font-medium">Example Contributor</span>
              <span className="text-meta text-muted">Shared a wildlife discovery</span>
            </div>
          </div>
          <div className="glass-subtle flex items-center justify-between gap-3 rounded-md px-3 py-2.5">
            <span className="flex flex-col">
              <span className="font-mono text-[0.6875rem] tracking-wide text-muted uppercase">AI suggestion</span>
              <span className="text-small font-medium">Flamingo, wading</span>
            </span>
            <span className="font-mono text-meta text-muted">83% confidence</span>
          </div>
          <ul className="flex flex-col gap-3" aria-label="Example discussion">
            {comments.map((comment, i) => (
              <motion.li
                key={comment.name}
                initial={{ opacity: 0, y: 6 }}
                animate={current >= 1 ? { opacity: 1, y: 0 } : undefined}
                transition={{ duration: 0.4, delay: reduce ? 0 : i * 0.25 }}
                className="flex gap-2.5 text-small"
              >
                <MessageSquare aria-hidden className="mt-0.5 size-3.5 shrink-0 text-muted" />
                <span>
                  <span className="font-medium">{comment.name}</span> <span className="text-muted">{comment.body}</span>
                </span>
              </motion.li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex flex-col justify-center gap-6">
        <div className="flex items-center gap-3">
          <span className="text-small text-muted">Status</span>
          <VerificationBadge status={steps[current].status} />
        </div>
        <ol className="flex flex-col" aria-label="How a discovery is verified">
          {steps.map((s, i) => {
            const done = i < current;
            const isCurrent = i === current;
            const Icon = s.icon;
            return (
              <li
                key={s.status}
                className="relative flex gap-4 pb-7 last:pb-0"
                aria-current={isCurrent ? "step" : undefined}
              >
                {i < steps.length - 1 && (
                  <span aria-hidden className="absolute top-9 bottom-1 left-[17px] w-px bg-border">
                    <motion.span
                      className="block w-px origin-top bg-accent"
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: done ? 1 : 0 }}
                      transition={{ duration: 0.6 }}
                      style={{ height: "100%" }}
                    />
                  </span>
                )}
                <span
                  className={cn(
                    "relative flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors duration-500",
                    isCurrent
                      ? "border-accent bg-accent text-midnight"
                      : done
                        ? "border-accent/60 text-accent"
                        : "border-border text-muted",
                  )}
                >
                  <Icon aria-hidden className="size-4" />
                </span>
                <div className="flex flex-col gap-1 pt-1.5">
                  <p
                    className={cn(
                      "font-mono text-small tracking-wide uppercase",
                      i <= current ? "text-fg" : "text-muted",
                    )}
                  >
                    {s.label}
                    <span className="sr-only">{done ? " (done)" : isCurrent ? " (current)" : ""}</span>
                  </p>
                  <p className="text-small text-muted">{s.note}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
