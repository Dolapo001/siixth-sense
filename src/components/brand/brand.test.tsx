import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BrandLoader } from "./brand-motion";
import { brandColors } from "./colors";
import { setCaps, starburstPath, starburstRays, wordmark } from "./geometry";
import { SixthSenseLogo, SixthSenseSymbol } from "./logo";

describe("brand colours", () => {
  it("match the @theme tokens in globals.css", () => {
    const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");
    for (const [token, hex] of Object.entries(brandColors)) {
      expect(css, `--color-${token}`).toMatch(new RegExp(`--color-${token}:\\s*${hex};`, "i"));
    }
  });
});

describe("starburst geometry", () => {
  const coordinates = (d: string) => (d.match(/-?\d*\.?\d+/g) ?? []).map(Number);

  it("has eight rays and stays inside its grid", () => {
    expect(starburstRays()).toHaveLength(8);
    for (const variant of ["regular", "small"] as const) {
      for (const n of coordinates(starburstPath(variant))) {
        expect(n).toBeGreaterThanOrEqual(0);
        expect(n).toBeLessThanOrEqual(48);
      }
    }
  });

  it("drops the central aperture in the small optical size", () => {
    expect(starburstPath("regular").match(/M/g)).toHaveLength(2);
    expect(starburstPath("small").match(/M/g)).toHaveLength(1);
  });
});

describe("lettering", () => {
  it("sets SIXTH SENSE within the cap height", () => {
    expect(wordmark.width).toBeGreaterThan(150);
    expect(wordmark.height).toBe(20);
  });

  it("refuses letters that haven't been drawn", () => {
    expect(() => setCaps("SCENEQ", { tracking: 4, wordSpace: 10 })).toThrow(/No glyph/);
  });
});

describe("SixthSenseLogo", () => {
  it("reads as Sixth Sense to screen readers", () => {
    render(<SixthSenseLogo />);
    expect(screen.getByText("Sixth Sense")).toHaveClass("sr-only");
  });

  it("includes the tagline in the stacked lockup's name", () => {
    render(<SixthSenseLogo layout="stacked" tagline />);
    expect(screen.getByText("Sixth Sense. See beyond the scene.")).toHaveClass("sr-only");
  });

  it("names the symbol when shown alone", () => {
    render(<SixthSenseLogo symbolOnly />);
    expect(screen.getByRole("img", { name: "Sixth Sense" })).toBeInTheDocument();
  });

  it("hides a decorative symbol from assistive tech", () => {
    const { container } = render(<SixthSenseSymbol />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("uses the small optical size at 24px and below", () => {
    const { container } = render(<SixthSenseSymbol size={16} />);
    expect(container.querySelector("path")).toHaveAttribute("d", starburstPath("small"));
  });
});

describe("BrandLoader", () => {
  it("announces its label when given one", () => {
    render(<BrandLoader label="Loading discoveries" />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading discoveries");
  });
});
