import {
  Bell,
  Code,
  Compass,
  Gift,
  Map as MapIcon,
  ScanSearch,
  Settings,
  Trophy,
  User,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

/** Primary product areas, in order of importance. */
export const primaryNav: NavItem[] = [
  { label: "World", href: "/world", icon: MapIcon },
  { label: "Analyze", href: "/analyze", icon: ScanSearch },
  { label: "Discover", href: "/discoveries", icon: Compass },
  { label: "Community", href: "/community", icon: Users },
  { label: "Leaderboard", href: "/leaderboard", icon: Trophy },
  { label: "Profile", href: "/profile", icon: User },
];

/** Secondary areas, kept out of the main group so it doesn't get crowded. */
export const secondaryNav: NavItem[] = [
  { label: "Rewards", href: "/rewards", icon: Gift },
  { label: "Web3 Identity", href: "/web3", icon: Wallet },
  { label: "Developers", href: "/developers", icon: Code },
];

export const utilityNav: NavItem[] = [
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Settings", href: "/settings", icon: Settings },
];

/** Mobile bottom bar: the four most-used areas. Everything else lives under "More". */
export const mobileBarNav: NavItem[] = [primaryNav[0], primaryNav[2], primaryNav[1], primaryNav[3]];

export const mobileMoreNav: NavItem[] = [
  primaryNav[4],
  primaryNav[5],
  ...secondaryNav,
  ...utilityNav,
];

/** A nav item is active on its own page and any page below it. */
export function isActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}
