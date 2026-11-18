import type { WorldMarker } from "@/features/world/types";
import type { Detection, LocationMatch } from "./types";

const MAX_MATCHES = 3;

/** Lowercase words only, so "SEVEN SEAS SEAFOOD" and "Seven Seas Seafood" compare equal. */
const normalize = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

/**
 * Whether a piece of text names this place. Exact (normalised) text, or, for
 * names of two or more words, the name as whole words inside longer text such
 * as "SEVEN SEAS SEAFOOD · OPEN DAILY" or "Seven Seas Seafood restaurant". A
 * one-word name has to be the whole text, so a "BOARDWALK" sign can match a
 * place called Boardwalk but "Bar" can't match every sign that contains it.
 */
function names(text: string, name: string) {
  if (text === name) return true;
  return name.includes(" ") && ` ${text} `.includes(` ${name} `);
}

/** Text quoted in evidence, e.g. the SEVEN SEAS SEAFOOD in "Round sign reading 'SEVEN SEAS SEAFOOD'". */
const QUOTED = /['"‘“]([^'"‘’“”]{3,80})['"’”]/g;
const quotedIn = (text: string) => [...text.matchAll(QUOTED)].map((m) => m[1]!);

type Clue = { text: string; normalized: string; basis: string };

/**
 * Named World map places the analysis points to, strongest evidence first:
 * signs it read on screen (listed by the analysis or quoted in its evidence),
 * places it detected, then the place it named. Exact names only, never a fuzzy
 * guess, so no name means no match. Each match says why it was suggested.
 */
export function placesFromAnalysis(
  markers: readonly WorldMarker[],
  analysis: {
    candidateLocation?: string | null;
    visibleText?: readonly string[];
    detections?: readonly Pick<Detection, "category" | "label" | "evidence">[];
  },
): LocationMatch[] {
  const clue = (text: string, basis: string): Clue => ({ text: text.trim(), normalized: normalize(text), basis });
  const signs = [
    ...(analysis.visibleText ?? []),
    ...(analysis.detections ?? []).flatMap((d) => d.evidence.flatMap(quotedIn)),
  ];
  const clues: Clue[] = [
    ...signs.map((text) => clue(text, `Sign reads "${text.trim()}"`)),
    // Only detections of places: a vehicle or character label naming a place would be a coincidence.
    ...(analysis.detections ?? [])
      .filter((d) => d.category === "location" || d.category === "landmark")
      .map((d) => clue(d.label, `Detected "${d.label.trim()}"`)),
    ...(analysis.candidateLocation ? [clue(analysis.candidateLocation, "Named by the analysis")] : []),
  ].filter((c) => c.normalized);

  // Discovery markers sit at places and reuse their ids, but their titles are player-written, not place names.
  const places = markers.filter(
    (m) => m.layer !== "discoveries" && m.nameKnown !== false && m.coordinate && normalize(m.title).length >= 4,
  );
  const found: { match: LocationMatch; strength: number }[] = [];
  for (const place of places) {
    const name = normalize(place.title);
    const strength = clues.findIndex((c) => names(c.normalized, name));
    if (strength === -1 || found.some((f) => f.match.locationId === place.locationId)) continue;
    found.push({
      match: { locationId: place.locationId, name: place.title, precision: place.precision, basis: clues[strength]!.basis },
      strength,
    });
  }
  return found
    .sort((a, b) => a.strength - b.strength)
    .slice(0, MAX_MATCHES)
    .map((f) => f.match);
}
