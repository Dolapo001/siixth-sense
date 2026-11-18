import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ConfidenceLabel, getConfidenceLevel } from "./confidence-label";
import { LocationPrecisionBadge } from "./location-precision";
import { VerificationBadge } from "./verification-badge";

describe("VerificationBadge", () => {
  it.each([
    ["ai_suggested", "AI suggested"],
    ["awaiting_verification", "Awaiting verification"],
    ["verified", "Community verified"],
    ["disputed", "Disputed"],
    ["rejected", "Rejected"],
  ] as const)("shows %s as readable text, not colour alone", (status, label) => {
    render(<VerificationBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("never labels an AI suggestion as verified", () => {
    render(<VerificationBadge status="ai_suggested" />);
    expect(screen.queryByText(/verified/i)).not.toBeInTheDocument();
  });
});

describe("ConfidenceLabel", () => {
  it.each([
    [0.95, "high"],
    [0.8, "high"],
    [0.79, "moderate"],
    [0.5, "moderate"],
    [0.49, "low"],
    [0, "low"],
  ] as const)("maps score %s to %s", (score, level) => {
    expect(getConfidenceLevel(score)).toBe(level);
  });

  it("shows the label and percentage for a score", () => {
    render(<ConfidenceLabel score={0.872} />);
    expect(screen.getByText("High confidence")).toBeInTheDocument();
    expect(screen.getByText("87%")).toBeInTheDocument();
  });

  it("prefers a backend-provided level over the derived one", () => {
    render(<ConfidenceLabel score={0.95} level="low" />);
    expect(screen.getByText("Low confidence")).toBeInTheDocument();
  });

  it("renders nothing without a score or level", () => {
    const { container } = render(<ConfidenceLabel />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("LocationPrecisionBadge", () => {
  it.each([
    ["confirmed", "Confirmed coordinate"],
    ["approximate", "Approximate coordinate"],
    ["region", "Region only"],
    ["unknown", "Location unknown"],
  ] as const)("labels %s precision", (precision, label) => {
    render(<LocationPrecisionBadge precision={precision} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});
