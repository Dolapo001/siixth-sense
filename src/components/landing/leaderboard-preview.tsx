"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { BadgeCheck, Scale, Sparkles } from "lucide-react";
import { Avatar } from "@/components/profiles/avatar";
import { exampleRankings } from "@/features/landing/fixtures";
import { leaderboardDimensions, type LeaderboardDimension } from "@/features/profiles/types";
import { transition } from "@/lib/motion";
import { cn } from "@/lib/utilities/cn";
import { IllustrationTag } from "./section-heading";

const rules = [
  {
    icon: BadgeCheck,
    title: "Verified discoveries",
    body: "A discovery only counts once community reviewers confirm it. Suggestions alone earn nothing.",
  },
  {
    icon: Scale,
    title: "Verification activity",
    body: "Checking other people's finds counts too, whether you confirm or dispute them.",
  },
  {
    icon: Sparkles,
    title: "Reputation",
    body: "Built over time from contributions that hold up. Calculated by Sixth Sense, not bought.",
  },
];

/**
 * Example leaderboard. Switching the ranking re-sorts the same example
 * contributors, so the difference between the three measures is visible.
 */
export function LeaderboardPreview() {
  const [dimension, setDimension] = useState<LeaderboardDimension>("verified");
  const reduce = useReducedMotion();
  const ranked = [...exampleRankings].sort((a, b) => b[dimension] - a[dimension]);
  const label = leaderboardDimensions.find((d) => d.value === dimension)!.label;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-10">
      <ul className="flex flex-col gap-3">
        {rules.map(({ icon: Icon, title, body }) => (
          <li key={title} className="flex gap-4 rounded-lg border border-border bg-surface p-5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-md border border-border text-accent">
              <Icon aria-hidden className="size-5" />
            </span>
            <div className="flex flex-col gap-1">
              <h3 className="text-body font-semibold">{title}</h3>
              <p className="text-small text-muted">{body}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="group" aria-label="Rank example contributors by" className="flex gap-1 rounded-md border border-border p-1">
            {leaderboardDimensions.map((d) => (
              <button
                key={d.value}
                type="button"
                aria-pressed={d.value === dimension}
                onClick={() => setDimension(d.value)}
                className={cn(
                  "rounded-sm px-3 py-1.5 text-small transition-colors pointer-coarse:py-2.5",
                  d.value === dimension ? "bg-surface-elevated text-fg" : "text-muted hover:text-fg",
                )}
              >
                {d.short}
              </button>
            ))}
          </div>
          <IllustrationTag>Example rankings</IllustrationTag>
        </div>

        <table className="w-full border-collapse text-left">
          <caption className="sr-only">Example contributors ranked by {label.toLowerCase()}</caption>
          <thead>
            <tr className="border-b border-border text-meta text-muted">
              <th scope="col" className="w-12 py-2 pr-3 font-normal">
                Rank
              </th>
              <th scope="col" className="py-2 pr-3 font-normal">
                Contributor
              </th>
              <th scope="col" className="py-2 text-right font-normal text-fg">
                {label}
              </th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((entry, index) => (
              <motion.tr
                key={entry.handle}
                layout={reduce ? false : "position"}
                transition={transition.slow}
                className="border-b border-border last:border-b-0"
              >
                <td className="py-3 pr-3">
                  <span className={cn("meta", index < 3 ? "text-fg" : "text-muted")}>#{index + 1}</span>
                </td>
                <td className="py-3 pr-3">
                  <span className="flex items-center gap-3">
                    <Avatar name={entry.handle.replace("example_", "")} size="sm" />
                    <span className="truncate text-small font-medium">{entry.handle}</span>
                  </span>
                </td>
                <td className="meta py-3 text-right text-small font-semibold text-fg">
                  {entry[dimension].toLocaleString("en-US")}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
