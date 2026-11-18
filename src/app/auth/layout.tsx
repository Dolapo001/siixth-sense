import Link from "next/link";
import type { Metadata } from "next";
import { SixthSenseLogo } from "@/components/brand/logo";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="content" className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-12">
      <Link href="/" aria-label="Sixth Sense home" className="rounded-md">
        <SixthSenseLogo size={32} />
      </Link>
      <div className="w-full max-w-md rounded-lg border border-border bg-surface">{children}</div>
    </main>
  );
}
