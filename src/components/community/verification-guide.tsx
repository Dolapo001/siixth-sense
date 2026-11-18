import { VerificationBadge } from "@/components/shared/verification-badge";
import type { VerificationStatus } from "@/types/intelligence";

const meanings: { status: VerificationStatus; meaning: string }[] = [
  { status: "ai_suggested", meaning: "Sixth Sense's analysis suggested this. No person has checked it yet." },
  {
    status: "awaiting_verification",
    meaning: "Community review has started. Reviewers are confirming or disputing it.",
  },
  { status: "verified", meaning: "Community reviewers confirmed it. This is the strongest status." },
  { status: "disputed", meaning: "Reviewers disagree. Check the suggestions and evidence before relying on it." },
  { status: "rejected", meaning: "Reviewers found it incorrect. It's kept for the record but closed to votes." },
];

/** Plain-language explanation of each verification status. */
export function VerificationGuide() {
  return (
    <dl className="flex flex-col gap-3">
      {meanings.map(({ status, meaning }) => (
        <div key={status} className="flex flex-col gap-1.5">
          <dt>
            <VerificationBadge status={status} />
          </dt>
          <dd className="text-small text-muted">{meaning}</dd>
        </div>
      ))}
    </dl>
  );
}
