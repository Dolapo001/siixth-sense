import { cn } from "@/lib/utilities/cn";
import { Reveal } from "./reveal";

type SectionHeadingProps = {
  id: string;
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
};

export function SectionHeading({ id, eyebrow, title, description, align = "left", className }: SectionHeadingProps) {
  return (
    <Reveal
      className={cn(
        "flex max-w-2xl flex-col gap-4",
        align === "center" && "mx-auto items-center text-center",
        className,
      )}
    >
      {eyebrow && <p className="eyebrow text-accent">{eyebrow}</p>}
      <h2 id={id} className="text-[2rem] leading-[1.1] font-semibold tracking-[-0.02em] text-balance md:text-[2.75rem]">
        {title}
      </h2>
      {description && <p className="text-body text-pretty text-muted md:text-[1.0625rem]">{description}</p>}
    </Reveal>
  );
}

/** Small "Illustration" tag for demo panels, so nothing reads as live data. */
export function IllustrationTag({ className, children = "Illustration" }: { className?: string; children?: string }) {
  return (
    <span className={cn("meta rounded-sm bg-midnight/90 px-1.5 py-0.5 text-fg/85", className)}>
      {children}
    </span>
  );
}
