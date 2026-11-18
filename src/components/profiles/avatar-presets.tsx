import { useId } from "react";
import { starburstPath } from "@/components/brand/geometry";

/*
 * Original avatar illustrations for player profiles, inspired by the feel of
 * Leonida (sunsets, palms, flamingos, the Keys, neon nights). Drawn for Sixth
 * Sense: no Rockstar characters, logos or artwork. Like the landing artwork,
 * these illustrations keep their own palette here rather than brand tokens.
 */

export const avatarPresets = [
  { id: "sunset", label: "Vice sunset" },
  { id: "palm", label: "Palm at dusk" },
  { id: "flamingo", label: "Flamingo" },
  { id: "cruiser", label: "Night cruiser" },
  { id: "neon", label: "Neon sign" },
  { id: "lighthouse", label: "Keys lighthouse" },
  { id: "gator", label: "Grassrivers gator" },
  { id: "starburst", label: "Sixth Sense signal" },
] as const;

export type AvatarPresetId = (typeof avatarPresets)[number]["id"];

export const isAvatarPresetId = (id: unknown): id is AvatarPresetId =>
  avatarPresets.some((preset) => preset.id === id);

function Sky({ id, stops }: { id: string; stops: string[] }) {
  return (
    <>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          {stops.map((color, i) => (
            <stop key={color + i} offset={i / (stops.length - 1)} stopColor={color} />
          ))}
        </linearGradient>
      </defs>
      <rect width="64" height="64" fill={`url(#${id})`} />
    </>
  );
}

function Art({ preset, uid }: { preset: AvatarPresetId; uid: string }) {
  const sky = `${uid}-sky`;
  switch (preset) {
    case "sunset":
      return (
        <>
          <Sky id={sky} stops={["#2a1b4a", "#c2457a", "#f29b52"]} />
          <circle cx="32" cy="38" r="14" fill="#ffd27a" />
          {/* Retro sun slices */}
          {[36, 40, 44, 48].map((y, i) => (
            <rect key={y} x="16" y={y} width="32" height={1 + i * 0.6} fill="#c2457a" />
          ))}
          <rect y="46" width="64" height="18" fill="#1b2a52" />
          {[50, 55, 60].map((y) => (
            <rect key={y} x={14 + (y - 50)} y={y} width={36 - (y - 50) * 2} height="1.2" fill="#f29b52" opacity=".7" />
          ))}
        </>
      );
    case "palm":
      return (
        <>
          <Sky id={sky} stops={["#1b2350", "#7a3b78", "#f2795a"]} />
          <circle cx="44" cy="40" r="9" fill="#ffc46b" opacity=".9" />
          <rect y="50" width="64" height="14" fill="#141a33" />
          <path d="M27 62c1-12 2-22 6-31" stroke="#0e1226" strokeWidth="3.2" fill="none" strokeLinecap="round" />
          <g fill="#0e1226">
            <path d="M33 31c-6-6-14-6-20-2 7-1 13 1 20 4z" />
            <path d="M33 31c-2-8-8-12-15-12 6 3 10 7 14 13z" />
            <path d="M33 31c3-8 9-11 16-10-6 2-10 6-14 11z" />
            <path d="M33 31c7-3 14-1 18 4-6-2-12-2-17-2z" />
          </g>
        </>
      );
    case "flamingo":
      return (
        <>
          <Sky id={sky} stops={["#0f4c5c", "#1f7a7a", "#55d6d0"]} />
          <rect y="50" width="64" height="14" fill="#0f3f4c" />
          <g fill="#ff7aa8">
            <ellipse cx="34" cy="36" rx="10" ry="6" />
            <path d="M27 34c-6-3-4-14 2-16 4-1 7 2 6 5-1 2-3 2-4 1 1-2-1-3-2-2-3 2-2 8 1 10z" />
          </g>
          <path d="M28 19.5l-4.5 2.5 4.5 1z" fill="#1b1b1b" />
          <g stroke="#ff7aa8" strokeWidth="1.6" strokeLinecap="round">
            <path d="M34 42v14" />
            <path d="M36 42l4 6-4 2" fill="none" />
          </g>
        </>
      );
    case "cruiser":
      return (
        <>
          <Sky id={sky} stops={["#0b1018", "#21184a", "#5b2a6e"]} />
          <rect y="44" width="64" height="20" fill="#0d1320" />
          <path d="M0 52h64" stroke="#55d6d0" strokeWidth="1" strokeDasharray="5 4" opacity=".7" />
          <path
            d="M8 44c2-4 6-6 12-7l6-5c2-1 4-2 7-2h8c3 0 5 1 7 3l3 4c4 0 7 1 8 3v4H8z"
            fill="#f29b52"
          />
          <path d="M27 33h7v4h-11zM36 33h5c1 0 2 0 3 1l2 3h-10z" fill="#1b2350" />
          <circle cx="18" cy="45" r="4" fill="#0b1018" stroke="#3a4560" strokeWidth="1.2" />
          <circle cx="46" cy="45" r="4" fill="#0b1018" stroke="#3a4560" strokeWidth="1.2" />
          <path d="M58 41h4" stroke="#ffe08a" strokeWidth="2" strokeLinecap="round" />
        </>
      );
    case "neon":
      return (
        <>
          <rect width="64" height="64" fill="#140f24" />
          <g fill="none" strokeLinecap="round" strokeLinejoin="round">
            {/* Cocktail glass in neon tube, with a soft second stroke as glow */}
            <path d="M20 20h24L32 34zM32 34v12M24 46h16" stroke="#ff4fa3" strokeWidth="6" opacity=".25" />
            <path d="M20 20h24L32 34zM32 34v12M24 46h16" stroke="#ff7ac0" strokeWidth="2.2" />
            <path d="M38 14l-6 10" stroke="#55d6d0" strokeWidth="5" opacity=".25" />
            <path d="M38 14l-6 10" stroke="#7fe8e2" strokeWidth="2" />
            <circle cx="40" cy="14" r="2" fill="#7fe8e2" />
          </g>
        </>
      );
    case "lighthouse":
      return (
        <>
          <Sky id={sky} stops={["#123a6b", "#3d7ab8", "#9fd3e8"]} />
          <path d="M44 22L64 14v14z" fill="#ffe9a8" opacity=".45" />
          <rect y="50" width="64" height="14" fill="#145a7a" />
          <path d="M26 50l3-28h6l3 28z" fill="#f2f4f5" />
          {[28, 36, 44].map((y) => (
            <path key={y} d={`M${29.3 - (y - 22) * 0.1} ${y}h${5.4 + (y - 22) * 0.2}v3h-${5.4 + (y - 22) * 0.2}z`} fill="#d64545" />
          ))}
          <rect x="28.5" y="17" width="7" height="5" fill="#ffe08a" />
          <path d="M27 17l5-4 5 4z" fill="#2a2f3a" />
          <path d="M20 50c6-2 18-2 24 0" stroke="#e8d9a8" strokeWidth="2" fill="none" />
        </>
      );
    case "gator":
      return (
        <>
          <Sky id={sky} stops={["#1e3524", "#2f5a3a", "#4d7a4a"]} />
          <rect y="36" width="64" height="28" fill="#1f4a3a" />
          <path d="M0 40h64" stroke="#7fb08a" strokeWidth=".8" opacity=".5" />
          <path d="M8 40c4-5 12-7 20-6 6 1 10 3 16 3s10-1 12 1c-4 2-10 3-16 3H8z" fill="#3e5b2e" />
          <g fill="#f2d04a">
            <circle cx="24" cy="35" r="2.6" />
            <circle cx="32" cy="34.5" r="2.6" />
          </g>
          <g fill="#101a10">
            <rect x="23.4" y="33.4" width="1.2" height="3.2" rx=".6" />
            <rect x="31.4" y="32.9" width="1.2" height="3.2" rx=".6" />
          </g>
          <path d="M6 46c8 2 16 2 24 0M34 52c8 2 16 2 24 0" stroke="#7fb08a" strokeWidth=".8" fill="none" opacity=".5" />
        </>
      );
    case "starburst":
      return (
        <>
          <rect width="64" height="64" fill="#0b1018" />
          <circle cx="32" cy="32" r="24" fill="#55d6d0" opacity=".08" />
          <path transform="translate(8 8)" fill="#55d6d0" fillRule="evenodd" d={starburstPath("regular")} />
        </>
      );
  }
}

/** A preset avatar, clipped to a circle. Decorative: the player's name is always shown beside it. */
export function AvatarArt({ preset, className }: { preset: AvatarPresetId; className?: string }) {
  const uid = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={className}>
      <defs>
        <clipPath id={`${uid}-clip`}>
          <circle cx="32" cy="32" r="32" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${uid}-clip)`}>
        <Art preset={preset} uid={uid} />
      </g>
    </svg>
  );
}
