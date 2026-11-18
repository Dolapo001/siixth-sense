import { Suspense } from "react";
import { MotionPreferences } from "@/components/shared/motion-preferences";
import { WorldExplorer, WorldExplorerLoading } from "@/features/world/world-explorer";

/*
 * The explorer lives in the layout so the map instance survives navigation
 * between /world and /world/[locationId]. The selected location is read from
 * the URL, which needs a Suspense boundary under cacheComponents.
 */
export default function WorldLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={<WorldExplorerLoading />}>
        <MotionPreferences>
          <WorldExplorer />
        </MotionPreferences>
      </Suspense>
      {children}
    </>
  );
}
