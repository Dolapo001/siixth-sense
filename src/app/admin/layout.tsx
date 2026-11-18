import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { SixthSenseLogo } from "@/components/brand/logo";
import { buttonStyles } from "@/components/ui/button";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Sixth Sense Admin" },
  robots: { index: false, follow: false },
};

/** Admin is kept apart from the player-facing shell. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-3">
            <SixthSenseLogo size={22} />
            <span className="eyebrow">Admin</span>
          </div>
          <Link href="/world" className={buttonStyles({ variant: "ghost", size: "sm" })}>
            <ArrowLeft aria-hidden />
            Back to Sixth Sense
          </Link>
        </div>
      </header>
      <main id="content" className="flex flex-1 flex-col">
        {children}
      </main>
    </>
  );
}
