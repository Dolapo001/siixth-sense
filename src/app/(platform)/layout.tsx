import { Suspense } from "react";
import type { Metadata } from "next";
import { noIndex } from "@/lib/seo";
import { ActiveAppRailLinks, AppRail, AppRailLinks } from "@/components/navigation/app-rail";
import { ActiveMobileNavLinks, MobileNavLinks, MobileTopBar } from "@/components/navigation/mobile-nav";

// Default for the platform: not indexed. Public pages opt in through publicPage() in src/lib/seo.ts.
export const metadata: Metadata = { robots: noIndex };

/*
 * Platform shell: icon rail on md+, top bar and bottom bar on mobile.
 * Active-link highlighting reads the URL, so it sits inside Suspense with an
 * unhighlighted fallback. That keeps every page prerenderable.
 */
export default function PlatformLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <AppRail>
        <Suspense fallback={<AppRailLinks pathname={null} />}>
          <ActiveAppRailLinks />
        </Suspense>
      </AppRail>
      <MobileTopBar />
      {/* The expanded rail pushes the page over instead of covering it (AppRail is the peer). */}
      <main
        id="content"
        className="flex flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] transition-[padding] duration-200 ease-out md:pb-0 md:pl-16 md:peer-hover/rail:pl-56 md:peer-hover/rail:delay-100 md:peer-focus-within/rail:pl-56"
      >
        {children}
      </main>
      <Suspense fallback={<MobileNavLinks pathname={null} />}>
        <ActiveMobileNavLinks />
      </Suspense>
    </>
  );
}
