import { Circle, CircleCheck } from "lucide-react";
import type { VerificationProgress as Progress } from "@/features/discoveries/types";

const points = new Intl.NumberFormat("en", { maximumFractionDigits: 1 });
const percent = new Intl.NumberFormat("en", { style: "percent", maximumFractionDigits: 0 });

function Requirement({ met, children }: { met: boolean; children: React.ReactNode }) {
  const Icon = met ? CircleCheck : Circle;
  return (
    <li className="flex items-start gap-2">
      <Icon aria-hidden className={`mt-0.5 size-3.5 shrink-0 ${met ? "text-accent" : "text-muted"}`} />
      <span>
        {children}
        <span className="sr-only">{met ? " (met)" : " (not met yet)"}</span>
      </span>
    </li>
  );
}

/**
 * How close an open discovery is to being verified. The server sets the
 * weights and thresholds and decides the outcome; this only shows them.
 */
export function VerificationProgress({ progress }: { progress: Progress }) {
  const { confirmWeight, disputeWeight, required, minAgreement, trustedVotes, trustedRequired } = progress;
  const total = confirmWeight + disputeWeight;
  const agreement = total > 0 ? confirmWeight / total : 1;
  const filled = required > 0 ? Math.min(confirmWeight / required, 1) : 1;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2 text-small">
        <span>Confirmations</span>
        <span className="text-muted">
          {points.format(confirmWeight)} of {points.format(required)}
        </span>
      </div>
      <div
        role="meter"
        aria-label="Confirmations toward verification"
        aria-valuemin={0}
        aria-valuemax={required}
        aria-valuenow={Math.min(confirmWeight, required)}
        aria-valuetext={`${points.format(confirmWeight)} of ${points.format(required)}`}
        className="h-1.5 overflow-hidden rounded-full bg-border"
      >
        <div className="h-full rounded-full bg-accent" style={{ width: `${filled * 100}%` }} />
      </div>
      <ul className="flex flex-col gap-1 text-meta text-muted">
        {trustedRequired > 0 && (
          <Requirement met={trustedVotes >= trustedRequired}>
            {trustedRequired === 1
              ? "At least one Verified Contributor confirms"
              : `At least ${trustedRequired} Verified Contributors confirm`}
          </Requirement>
        )}
        {disputeWeight > 0 && (
          <Requirement met={agreement >= minAgreement}>
            {percent.format(agreement)} agree, {percent.format(minAgreement)} needed
          </Requirement>
        )}
      </ul>
      {trustedRequired > 0 && (
        <p className="text-meta text-muted">Verified Contributors&apos; votes count more than newer players&apos;.</p>
      )}
    </div>
  );
}
