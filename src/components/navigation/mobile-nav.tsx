"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Menu } from "lucide-react";
import { SixthSenseLogo } from "@/components/brand/logo";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utilities/cn";
import { isActive, mobileBarNav, mobileMoreNav } from "./nav-items";

/** Mobile top bar: brand and notifications. */
export function MobileTopBar() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-midnight/95 px-4 backdrop-blur md:hidden">
      <Link href="/" aria-label="Sixth Sense home" className="rounded-md">
        <SixthSenseLogo size={24} />
      </Link>
      <Link
        href="/notifications"
        aria-label="Notifications"
        className="flex size-10 items-center justify-center rounded-md text-muted hover:text-fg"
      >
        <Bell aria-hidden className="size-5" />
      </Link>
    </header>
  );
}

/** Mobile bottom bar plus a "More" sheet for everything else. */
export function MobileNavLinks({ pathname }: { pathname: string | null }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = mobileMoreNav.some((item) => isActive(pathname, item.href));

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-midnight/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="grid h-16 grid-cols-5">
        {mobileBarNav.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium",
                  active ? "text-accent" : "text-muted",
                )}
              >
                <Icon aria-hidden className="size-5" />
                {item.label}
              </Link>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-haspopup="dialog"
            className={cn(
              "flex h-full w-full flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium",
              moreActive ? "text-accent" : "text-muted",
            )}
          >
            <Menu aria-hidden className="size-5" />
            More
          </button>
        </li>
      </ul>

      <Dialog open={moreOpen} onOpenChange={setMoreOpen} variant="sheet" title="More">
        <ul className="grid grid-cols-3 gap-2">
          {mobileMoreNav.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-md border px-2 py-4 text-center text-meta",
                    active ? "border-accent/40 bg-accent/10 text-accent" : "border-border text-fg",
                  )}
                >
                  <Icon aria-hidden className="size-5" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </Dialog>
    </nav>
  );
}

export function ActiveMobileNavLinks() {
  return <MobileNavLinks pathname={usePathname()} />;
}
