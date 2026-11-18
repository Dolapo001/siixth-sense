"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utilities/cn";
import { announce } from "@/lib/announce";

export function shortAddress(address: string) {
  return address.length > 12 ? `${address.slice(0, 4)}…${address.slice(-4)}` : address;
}

/** Address or signature in monospace, with a copy button. Full value in the title and for screen readers. */
export function CopyableValue({ value, label, short = true }: { value: string; label: string; short?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <span className="inline-flex max-w-full items-center gap-1.5">
      <span className={cn("meta text-fg", !short && "break-all")} title={value}>
        {short ? shortAddress(value) : value}
      </span>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard?.writeText(value);
            setCopied(true);
            announce(`${label} copied`);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            // Clipboard blocked (permissions, insecure context): the value stays visible to copy by hand.
          }
        }}
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-sm text-muted hover:text-fg"
      >
        {copied ? <Check aria-hidden className="size-3.5 text-accent" /> : <Copy aria-hidden className="size-3.5" />}
        <span className="sr-only">{copied ? `${label} copied` : `Copy ${label}`}</span>
      </button>
    </span>
  );
}

export function ExplorerLink({ href, children = "View in explorer" }: { href: string; children?: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex items-center gap-1 text-small text-accent hover:underline"
    >
      {children}
      <ExternalLink aria-hidden className="size-3.5" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

/** Repeated wherever wallets come up. */
export function SeedPhraseWarning() {
  return (
    <p className="flex items-start gap-2 rounded-md border border-signal/40 bg-signal/5 p-3 text-small">
      <ShieldAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-signal" />
      <span>
        Sixth Sense will <strong>never</strong> ask for your recovery phrase or private key. Anyone who does is trying to
        take your wallet.
      </span>
    </p>
  );
}
