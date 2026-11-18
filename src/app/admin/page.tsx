import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { PermissionDeniedState } from "@/components/shared/states";

// Placeholder. Admin areas are built in Phase 4.12, only for what the backend supports.
export default function AdminPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Admin"
        description="Submission management, moderation, verification and audit tools for Sixth Sense staff."
      />
      <PermissionDeniedState
        description="Admin requires a staff account. Sign-in and roles aren't set up yet."
        action={{ label: "Back to Sixth Sense", href: "/world" }}
      />
    </PageContainer>
  );
}
