import { redirect } from "next/navigation";

// Wallet sign-in has no redirect-based provider to come back from; send stray links to sign-in.
export default function CallbackPage() {
  redirect("/auth/login");
}
