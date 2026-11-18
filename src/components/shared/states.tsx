import Link from "next/link";
import { CloudOff, Inbox, Lock, RotateCw, TriangleAlert, type LucideIcon } from "lucide-react";
import { Button, buttonStyles } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utilities/cn";

/*
 * Shared page states. Every important page uses these so loading, empty,
 * error, unavailable and permission-denied look and read the same everywhere.
 */

type StateAction = { label: string; href: string } | { label: string; onClick: () => void };

type StatePanelProps = {
  icon: LucideIcon;
  title: string;
  /** 1 when the state is the whole page (nothing else renders an h1). */
  headingLevel?: 1 | 2;
  description: string;
  action?: StateAction;
  tone?: "neutral" | "signal";
  role?: "status" | "alert";
  className?: string;
  children?: React.ReactNode;
};

function StatePanel({
  icon: Icon,
  title,
  headingLevel = 2,
  description,
  action,
  tone = "neutral",
  role,
  className,
  children,
}: StatePanelProps) {
  return (
    <div
      role={role}
      className={cn(
        "mx-auto flex w-full max-w-md flex-col items-center gap-4 px-6 py-16 text-center",
        className,
      )}
    >
      <span
        className={cn(
          "flex size-12 items-center justify-center rounded-lg border",
          tone === "signal" ? "border-signal/40 text-signal" : "border-border text-muted",
        )}
      >
        <Icon aria-hidden className="size-5" />
      </span>
      <div className="flex flex-col gap-1.5">
        {headingLevel === 1 ? (
          <h1 className="text-heading font-semibold">{title}</h1>
        ) : (
          <h2 className="text-heading font-semibold">{title}</h2>
        )}
        <p className="text-small text-muted">{description}</p>
      </div>
      {children}
      {action &&
        ("href" in action ? (
          <Link href={action.href} className={buttonStyles({ variant: "secondary" })}>
            {action.label}
          </Link>
        ) : (
          <Button variant="secondary" onClick={action.onClick}>
            {action.label}
          </Button>
        ))}
    </div>
  );
}

/** Generic skeleton for a page body. Announces loading once to screen readers. */
export function LoadingState({
  label = "Loading",
  pageTitle,
  className,
}: {
  label?: string;
  /** Screen-reader page heading, for pages whose real heading only appears once loaded. */
  pageTitle?: string;
  className?: string;
}) {
  return (
    <div role="status" className={cn("flex w-full flex-col gap-4", className)}>
      {pageTitle && <h1 className="sr-only">{pageTitle}</h1>}
      <span className="sr-only">{label}…</span>
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
      <div className="grid gap-4 pt-4 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    </div>
  );
}

/** Nothing to show yet. Explain why and offer a next step. */
export function EmptyState(props: {
  title: string;
  description: string;
  action?: StateAction;
  headingLevel?: 1 | 2;
  className?: string;
}) {
  return <StatePanel icon={Inbox} {...props} />;
}

/** A request failed. Offer a retry when one could help. */
export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this. Check your connection and try again.",
  onRetry,
  headingLevel,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  headingLevel?: 1 | 2;
  className?: string;
}) {
  return (
    <StatePanel
      icon={TriangleAlert}
      tone="signal"
      role="alert"
      title={title}
      description={description}
      headingLevel={headingLevel}
      className={className}
    >
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          <RotateCw aria-hidden />
          Try again
        </Button>
      )}
    </StatePanel>
  );
}

/**
 * The feature depends on a backend capability that isn't available.
 * Distinct from Empty: there may be data, we just can't reach it yet.
 */
export function UnavailableState({
  title = "Not available yet",
  description,
  action,
  headingLevel,
  className,
}: {
  title?: string;
  description: string;
  action?: StateAction;
  headingLevel?: 1 | 2;
  className?: string;
}) {
  return (
    <StatePanel
      icon={CloudOff}
      title={title}
      description={description}
      action={action}
      headingLevel={headingLevel}
      className={className}
    />
  );
}

/** The user can't do this. Say why and what they can do about it. */
export function PermissionDeniedState({
  title = "You don't have access",
  description,
  action,
  headingLevel,
  className,
}: {
  title?: string;
  description: string;
  action?: StateAction;
  headingLevel?: 1 | 2;
  className?: string;
}) {
  return <StatePanel
      icon={Lock}
      title={title}
      description={description}
      action={action}
      headingLevel={headingLevel}
      className={className}
    />;
}
