"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { CONTRACT_ADDRESS, X_HANDLE, X_URL } from "@/features/landing/socials";
import { announce } from "@/lib/announce";
import { cn } from "@/lib/utilities/cn";

/** The X (formerly Twitter) mark. lucide-react ships no brand icons. */
export function XIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

/** Icon link to the project's X account. */
export function XLink({ className }: { className?: string }) {
  return (
    <a
      href={X_URL}
      target="_blank"
      rel="noreferrer noopener"
      className={cn(
        "inline-flex size-10 items-center justify-center rounded-md text-fg/70 transition-colors hover:text-fg",
        className,
      )}
    >
      <XIcon className="size-4" />
      <span className="sr-only">Sixth Sense on X ({X_HANDLE})</span>
    </a>
  );
}

/** Contract address bar with a copy button. Renders nothing until CONTRACT_ADDRESS is set. */
export function ContractAddress({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const [copied, setCopied] = useState(false);
  if (!CONTRACT_ADDRESS) return null;

  return (
    <div
      className={cn(
        "glass-subtle flex w-full max-w-xl items-center gap-3 rounded-lg border border-border py-1.5 pr-1.5 pl-4",
        className,
      )}
      style={style}
    >
      <span className="meta font-semibold tracking-wide text-accent">CA</span>
      <span className="meta min-w-0 flex-1 truncate text-fg/90" title={CONTRACT_ADDRESS}>
        {CONTRACT_ADDRESS}
      </span>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard?.writeText(CONTRACT_ADDRESS);
            setCopied(true);
            announce("Contract address copied");
            setTimeout(() => setCopied(false), 1500);
          } catch {
            // Clipboard blocked (permissions, insecure context): the address stays visible to copy by hand.
          }
        }}
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-border text-muted transition-colors hover:text-fg"
      >
        {copied ? <Check aria-hidden className="size-4 text-accent" /> : <Copy aria-hidden className="size-4" />}
        <span className="sr-only">{copied ? "Contract address copied" : "Copy contract address"}</span>
      </button>
    </div>
  );
}
