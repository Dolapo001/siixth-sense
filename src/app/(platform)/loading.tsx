import { BrandLoader } from "@/components/brand/brand-motion";
import { PageContainer } from "@/components/layout/page-header";
import { LoadingState } from "@/components/shared/states";

export default function PlatformLoading() {
  return (
    <PageContainer>
      {/* LoadingState announces the wait; the mark is visual only. */}
      <BrandLoader size={28} className="mb-6" />
      <LoadingState />
    </PageContainer>
  );
}
