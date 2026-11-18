import { LandingFooter } from "@/components/landing/closing-sections";
import { LandingNav } from "@/components/landing/landing-nav";
import { MotionPreferences } from "@/components/shared/motion-preferences";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="sid-landing flex flex-1 flex-col">
      {/* Marks the top of the page; the nav turns to glass once it scrolls out of view. */}
      <div id="top-sentinel" aria-hidden className="absolute top-0 h-6 w-px" />
      <LandingNav />
      <main id="content" className="flex flex-1 flex-col">
        <MotionPreferences>{children}</MotionPreferences>
      </main>
      <LandingFooter />
    </div>
  );
}
