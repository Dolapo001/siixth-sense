"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertTriangle, LogIn } from "lucide-react";

/** Shown instead of an action when nobody is signed in. Never a dead button. Signing in returns here. */
export function SignInPrompt({ action }: { action: string }) {
  const pathname = usePathname();
  const href = pathname ? `/auth/login?next=${encodeURIComponent(pathname)}` : "/auth/login";
  return (
    <p className="flex items-center gap-2 text-small text-muted">
      <LogIn aria-hidden className="size-4 shrink-0" />
      <span>
        <Link href={href} className="text-accent underline underline-offset-2 hover:decoration-2">
          Sign in
        </Link>{" "}
        to {action}.
      </span>
    </p>
  );
}

/** A failed action's message, announced to screen readers. */
export function ActionError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="flex items-center gap-1.5 text-small text-signal">
      <AlertTriangle aria-hidden className="size-4 shrink-0" />
      {message}
    </p>
  );
}
