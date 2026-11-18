"use client";

import { Badge } from "@/components/ui/badge";
import { useWeb3Source } from "./hooks";

/** The network the Web3 source reports. Nothing while it loads or when no source is connected. */
export function NetworkBadge() {
  const source = useWeb3Source();
  if (!source.data) return null;
  const { kind, network } = source.data;
  return (
    <Badge tone={network.cluster === "devnet" ? "signal" : "neutral"} className="self-start">
      {kind === "sample" ? `Sample data · ${network.name}` : network.name}
    </Badge>
  );
}
