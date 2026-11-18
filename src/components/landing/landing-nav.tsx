"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogIn, Menu } from "lucide-react";
import { SixthSenseLogo } from "@/components/brand/logo";
import { buttonStyles } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useSession } from "@/features/authentication/hooks";
import { cn } from "@/lib/utilities/cn";
import { XLink } from "./socials";

/**
 * In-page sections. The landing nav only moves around this page; entering
 * the app is left to the explicit calls to action (hero, final CTA, footer).
 */
export const landingSections = [
  { id: "explore", label: "World" },
  { id: "how-it-works", label: "Analyze" },
  { id: "discoveries", label: "Discover" },
  { id: "community", label: "Community" },
  { id: "leaderboard", label: "Leaderboard" },
  { id: "proof", label: "Proof" },
] as const;

/** True once the page has scrolled past the top sentinel. No scroll listener needed. */
function useScrolled() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const sentinel = document.getElementById("top-sentinel");
    if (!sentinel) return;
    const observer = new IntersectionObserver(([entry]) => setScrolled(!entry.isIntersecting));
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);
  return scrolled;
}

/** The section currently in the middle band of the viewport. */
function useActiveSection() {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    for (const { id } of landingSections) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);
  return active;
}

export function LandingNav() {
  const active = useActiveSection();
  // Sign in is for signed-out visitors only (shown while the session loads, too).
  // Signed-in viewers see no account button here.
  const session = useSession();
  const showSignIn = !session.data;
  const scrolled = useScrolled();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header
      className={cn(
        "sid-rise fixed inset-x-0 top-0 z-40 border-b transition-[background-color,border-color,backdrop-filter] duration-300",
        scrolled ? "glass-nav" : "border-transparent bg-transparent",
      )}
      style={{ animationDelay: "0.3s" }}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-5 md:px-8">
        <Link href="/" aria-label="Sixth Sense home" className="rounded-md">
          <SixthSenseLogo size={26} />
        </Link>

        <nav aria-label="Sections" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {landingSections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  aria-current={active === section.id ? "true" : undefined}
                  className={cn(
                    "relative rounded-md px-3 py-2 text-small transition-colors duration-200",
                    active === section.id ? "text-fg" : "text-fg/70 hover:text-fg",
                  )}
                >
                  {section.label}
                  <span
                    aria-hidden
                    className={cn(
                      "absolute inset-x-3 -bottom-0.5 h-px bg-accent transition-opacity duration-200",
                      active === section.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <XLink />
          {showSignIn && (
            <Link
              href="/auth/login"
              className={buttonStyles({ variant: "secondary", size: "sm", className: "glass-subtle" })}
            >
              <LogIn aria-hidden />
              Sign in
            </Link>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-haspopup="dialog"
          className="flex size-10 items-center justify-center rounded-md text-fg md:hidden"
        >
          <Menu aria-hidden className="size-5" />
          <span className="sr-only">Open menu</span>
        </button>
      </div>

      <Dialog open={menuOpen} onOpenChange={setMenuOpen} variant="drawer" title="Menu">
        <nav aria-label="Sections" className="flex flex-col gap-6">
          <ul className="flex flex-col">
            {landingSections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-between border-b border-border py-4 text-heading"
                >
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
          <XLink className="self-start border border-border" />
          <div className="flex flex-col gap-2">
            {showSignIn && (
              <Link href="/auth/login" className={buttonStyles({ size: "lg" })} onClick={() => setMenuOpen(false)}>
                <LogIn aria-hidden />
                Sign in
              </Link>
            )}
          </div>
        </nav>
      </Dialog>
    </header>
  );
}
