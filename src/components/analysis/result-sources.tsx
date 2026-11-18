import { BookCheck, Bot, Users } from "lucide-react";

const sources = [
  {
    icon: Bot,
    title: "AI suggestion",
    body: "Sixth Sense's best guess from the screenshot. Nobody has checked it.",
  },
  {
    icon: Users,
    title: "Community verified",
    body: "Players reviewed the evidence and confirmed it.",
  },
  {
    icon: BookCheck,
    title: "Official source",
    body: "From the game's published information. None is linked to results yet.",
  },
];

/** How much to trust what the results say, by where each claim comes from. */
export function ResultSources() {
  return (
    <details className="group rounded-md border border-border bg-surface">
      <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-2 px-4 py-2 text-small font-medium [&::-webkit-details-marker]:hidden">
        How to read these results
        <span aria-hidden className="text-muted transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>
      <ul className="flex flex-col gap-3 border-t border-border px-4 py-3">
        {sources.map(({ icon: Icon, title, body }) => (
          <li key={title} className="flex gap-3">
            <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted" />
            <p className="text-small">
              <span className="font-medium">{title}.</span> <span className="text-muted">{body}</span>
            </p>
          </li>
        ))}
      </ul>
    </details>
  );
}
