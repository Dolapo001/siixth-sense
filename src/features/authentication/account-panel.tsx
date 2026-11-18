"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { announce } from "@/lib/announce";
import { useSession } from "./hooks";

// Deliberately free of wallet code: Settings shouldn't download the Solana wallet adapter.

/** Signed-in wallet and a sign-out button, for Settings. */
export function AccountPanel() {
  const session = useSession();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [pending, setPending] = useState(false);

  if (session.isPending) return null;
  if (!session.data) {
    return (
      <p className="text-small text-muted">
        You&apos;re not signed in.{" "}
        <Link href="/auth/login?next=/settings" className="text-accent underline underline-offset-2">
          Sign in with your wallet
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-small">
        Signed in with wallet{" "}
        <span className="meta text-fg" title={session.data.user.username}>
          {session.data.user.displayName}
        </span>
      </p>
      <Button
        variant="secondary"
        className="self-start"
        loading={pending}
        onClick={async () => {
          setPending(true);
          await fetch("/api/auth/logout", { method: "POST" });
          await queryClient.invalidateQueries();
          announce("Signed out");
          setPending(false);
          router.push("/");
        }}
      >
        <LogOut aria-hidden />
        Sign out
      </Button>
    </div>
  );
}
