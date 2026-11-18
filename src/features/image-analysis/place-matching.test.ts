import { describe, expect, it } from "vitest";
import type { WorldMarker } from "@/features/world/types";
import { placesFromAnalysis } from "./place-matching";

const place = (locationId: string, title: string, extra: Partial<WorldMarker> = {}): WorldMarker => ({
  id: `m-${locationId}`,
  locationId,
  title,
  category: "location",
  precision: "approximate",
  coordinate: { x: 1, y: 1 },
  regionId: null,
  verification: "ai_suggested",
  ...extra,
});

const markers = [
  place("L39", "Seven Seas Seafood", { areas: ["Shore Dr", "Ocean Beach"] }),
  place("L40", "Boardwalk"),
  place("L41", "Bar"),
  place("L42", "Unnamed hotel", { nameKnown: false }),
  place("L43", "Ocean View Hotel", { coordinate: null }),
];

describe("placesFromAnalysis", () => {
  it("finds a place from a sign, whatever its case and punctuation, and says so", () => {
    expect(placesFromAnalysis(markers, { visibleText: ["SEVEN SEAS SEAFOOD", "NO PARKING ANY TIME"] })).toEqual([
      { locationId: "L39", name: "Seven Seas Seafood", precision: "approximate", basis: 'Sign reads "SEVEN SEAS SEAFOOD"' },
    ]);
    expect(placesFromAnalysis(markers, { visibleText: ["Seven-Seas Seafood · open daily"] })[0]?.locationId).toBe("L39");
  });

  it("needs a one-word name to be the whole sign", () => {
    expect(placesFromAnalysis(markers, { visibleText: ["BOARDWALK"] }).map((m) => m.locationId)).toEqual(["L40"]);
    expect(placesFromAnalysis(markers, { visibleText: ["SPORTS BAR"] })).toEqual([]);
  });

  it("never guesses: no exact name, no match", () => {
    expect(placesFromAnalysis(markers, { visibleText: ["SEVEN SEAS"] })).toEqual([]);
    expect(placesFromAnalysis(markers, {})).toEqual([]);
  });

  it("skips places without a known name or a map position", () => {
    expect(placesFromAnalysis(markers, { visibleText: ["UNNAMED HOTEL", "OCEAN VIEW HOTEL"] })).toEqual([]);
  });

  it("puts sign readings before the place the analysis named", () => {
    const matches = placesFromAnalysis(markers, { candidateLocation: "boardwalk", visibleText: ["Seven Seas Seafood"] });
    expect(matches.map((m) => [m.locationId, m.basis])).toEqual([
      ["L39", 'Sign reads "Seven Seas Seafood"'],
      ["L40", "Named by the analysis"],
    ]);
  });
});
