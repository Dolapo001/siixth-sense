import { UnavailableState } from "@/components/shared/states";
import { PageContainer, PageHeader } from "./page-header";

type FeaturePlaceholderProps = {
  eyebrow?: string;
  title: string;
  description: string;
  /** Why the page can't show anything yet. */
  unavailable: string;
  action?: { label: string; href: string };
};

/**
 * Phase 3 placeholder for a platform page. Shows the page's purpose and an
 * honest "not available" state; replaced by the real module in Phase 4.
 */
export function FeaturePlaceholder({ eyebrow, title, description, unavailable, action }: FeaturePlaceholderProps) {
  return (
    <PageContainer>
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      <UnavailableState description={unavailable} action={action} />
    </PageContainer>
  );
}
