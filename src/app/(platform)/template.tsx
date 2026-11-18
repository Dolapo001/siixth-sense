/**
 * Subtle entrance on each platform navigation. CSS rather than Motion, so
 * pages that don't animate anything else don't load the animation library.
 * Reduced motion collapses it via the global rule in globals.css.
 */
export default function PlatformTemplate({ children }: { children: React.ReactNode }) {
  return <div className="ss-page-in flex flex-1 flex-col">{children}</div>;
}
