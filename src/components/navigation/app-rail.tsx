"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SixthSenseSymbol, SixthSenseWordmark } from "@/components/brand/logo";
import { UnreadBadge, UnreadLabel } from "@/features/notifications/unread-badge";
import { cn } from "@/lib/utilities/cn";
import { isActive, primaryNav, secondaryNav, utilityNav, type NavItem } from "./nav-items";

/** Fades in when the rail expands (hover or keyboard focus inside it). */
const revealOnExpand =
  "whitespace-nowrap opacity-0 transition-opacity duration-200 group-hover/rail:opacity-100 group-focus-within/rail:opacity-100";

function RailLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <li>
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "relative flex h-11 w-full items-center gap-3 rounded-md px-3 transition-colors",
          active ? "bg-accent/10 text-accent" : "text-muted hover:bg-surface-elevated hover:text-fg",
        )}
      >
        {active && (
          <span aria-hidden className="ss-fade-in absolute top-2 bottom-2 -left-2.5 w-0.5 rounded-full bg-accent" />
        )}
        <span className="relative shrink-0">
          <Icon aria-hidden className="size-5" />
          {item.showsUnread && <UnreadBadge />}
        </span>
        {/* Always in the accessibility tree, so it names the link even while hidden. */}
        <span className={cn("text-small font-medium", revealOnExpand)}>{item.label}</span>
        {item.showsUnread && <UnreadLabel />}
      </Link>
    </li>
  );
}

/** Rail contents with no active item. Used as the Suspense fallback while the URL is resolved. */
export function AppRailLinks({ pathname }: { pathname: string | null }) {
  return (
    <>
      <ul className="flex flex-col gap-1 px-2.5">
        {primaryNav.map((item) => (
          <RailLink key={item.href} item={item} active={isActive(pathname, item.href)} />
        ))}
      </ul>
      <div aria-hidden className="mx-4 my-3 h-px bg-border" />
      <ul className="flex flex-col gap-1 px-2.5">
        {secondaryNav.map((item) => (
          <RailLink key={item.href} item={item} active={isActive(pathname, item.href)} />
        ))}
      </ul>
      <ul className="mt-auto flex flex-col gap-1 px-2.5">
        {utilityNav.map((item) => (
          <RailLink key={item.href} item={item} active={isActive(pathname, item.href)} />
        ))}
      </ul>
    </>
  );
}

export function ActiveAppRailLinks() {
  return <AppRailLinks pathname={usePathname()} />;
}

/**
 * Desktop and tablet navigation: a compact icon rail that expands on hover
 * or keyboard focus to show each destination's name. The platform layout's
 * <main> follows it as a peer, so the page moves over rather than being covered.
 */
export function AppRail({ children }: { children: React.ReactNode }) {
  return (
    <nav
      aria-label="Main"
      className={cn(
        "group/rail peer/rail fixed inset-y-0 left-0 z-40 hidden w-16 flex-col overflow-x-hidden border-r border-border bg-midnight py-4 md:flex",
        "transition-[width] duration-200 ease-out hover:w-56 hover:delay-100 focus-within:w-56",
      )}
    >
      <Link href="/" className="mb-6 flex items-center gap-3 rounded-md px-[18px]" aria-label="Sixth Sense home">
        <SixthSenseSymbol size={28} />
        <SixthSenseWordmark height={12} className={revealOnExpand} />
      </Link>
      {children}
    </nav>
  );
}
