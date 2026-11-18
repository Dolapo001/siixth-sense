"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utilities/cn";

const tabs = [
  { href: "/web3", label: "Identity" },
  { href: "/web3/proof", label: "Proof of Discovery" },
];

export function Web3Tabs({ pathname }: { pathname: string | null }) {
  return (
    <nav aria-label="Web3 sections" className="flex gap-1 border-b border-border">
      {tabs.map((tab) => {
        const current = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={current ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-small font-medium",
              current ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function ActiveWeb3Tabs() {
  return <Web3Tabs pathname={usePathname()} />;
}
