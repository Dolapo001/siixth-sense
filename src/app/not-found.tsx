import Link from "next/link";
import { SixthSenseLogo } from "@/components/brand/logo";
import { buttonStyles } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="content" className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-24 text-center">
      <SixthSenseLogo size={28} />
      <p className="meta text-muted">404 · NO MATCH</p>
      <h1 className="text-title font-semibold">Nothing found at this location</h1>
      <p className="max-w-md text-body text-muted">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/world" className={buttonStyles()}>
          Explore the World
        </Link>
        <Link href="/" className={buttonStyles({ variant: "secondary" })}>
          Home
        </Link>
      </div>
    </main>
  );
}
