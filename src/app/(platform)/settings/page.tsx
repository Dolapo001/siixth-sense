import type { Metadata } from "next";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { AccountPanel } from "@/features/authentication/wallet-sign-in";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <PageContainer>
      <PageHeader eyebrow="Account" title="Settings" description="Your account and how you sign in." />
      <section aria-labelledby="account-heading" className="flex max-w-xl flex-col gap-4 rounded-lg border border-border bg-surface p-5">
        <h2 id="account-heading" className="text-heading font-semibold">
          Account
        </h2>
        <AccountPanel />
      </section>
    </PageContainer>
  );
}
