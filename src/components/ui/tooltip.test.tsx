import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Tooltip } from "./tooltip";

describe("Tooltip", () => {
  it("names an icon-only trigger when used as a label", () => {
    render(
      <Tooltip content="World" asLabel>
        {(props) => <button {...props}>🗺</button>}
      </Tooltip>,
    );
    expect(screen.getByRole("button", { name: "World" })).toBeInTheDocument();
  });

  it("describes the trigger by default", () => {
    render(<Tooltip content="Opens the map">{(props) => <button {...props}>World</button>}</Tooltip>);
    expect(screen.getByRole("button", { name: "World" })).toHaveAccessibleDescription("Opens the map");
  });

  it("shows on focus and hides on Escape", async () => {
    render(
      <Tooltip content="World" asLabel>
        {(props) => <button {...props}>🗺</button>}
      </Tooltip>,
    );
    const tooltip = screen.getByRole("tooltip", { hidden: true });
    await userEvent.tab();
    expect(tooltip).toHaveClass("opacity-100");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(tooltip).toHaveClass("opacity-0");
  });
});
