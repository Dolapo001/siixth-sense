import type { Metadata } from "next";
import { Web3Identity } from "@/features/web3/identity-view";

export const metadata: Metadata = { title: "Web3 Identity" };

export default function Web3Page() {
  return <Web3Identity />;
}
