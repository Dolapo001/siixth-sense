import { BadgeCheck, CircleX, Clock, ScanSearch, TriangleAlert, type LucideIcon } from "lucide-react";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import type { VerificationStatus } from "@/types/intelligence";

const config: Record<VerificationStatus, { label: string; icon: LucideIcon; tone: BadgeTone; className?: string }> = {
  ai_suggested: { label: "AI suggested", icon: ScanSearch, tone: "tentative" },
  awaiting_verification: { label: "Awaiting verification", icon: Clock, tone: "neutral" },
  verified: { label: "Community verified", icon: BadgeCheck, tone: "accent" },
  disputed: { label: "Disputed", icon: TriangleAlert, tone: "signal" },
  rejected: { label: "Rejected", icon: CircleX, tone: "neutral", className: "line-through decoration-muted/60" },
};

export function verificationLabel(status: VerificationStatus) {
  return config[status].label;
}

export function VerificationBadge({ status, className }: { status: VerificationStatus; className?: string }) {
  const { label, icon: Icon, tone, className: statusClass } = config[status];
  return (
    <Badge tone={tone} className={className} data-status={status}>
      <Icon aria-hidden />
      <span className={statusClass}>{label}</span>
    </Badge>
  );
}
