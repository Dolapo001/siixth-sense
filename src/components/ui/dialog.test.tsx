import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { Dialog } from "./dialog";

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open details</button>
      <Dialog open={open} onOpenChange={setOpen} title="Location" description="Selected location details">
        <p>Body</p>
      </Dialog>
    </>
  );
}

describe("Dialog", () => {
  it("opens with an accessible name and description", async () => {
    render(<Harness />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Open details" }));
    const dialog = screen.getByRole("dialog", { name: "Location" });
    expect(dialog).toHaveAccessibleDescription("Selected location details");
  });

  it("closes from the close button and returns focus to the trigger", async () => {
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Open details" });
    await userEvent.click(trigger);
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("closes on a backdrop click", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "Open details" }));
    await userEvent.click(screen.getByRole("dialog"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("stays open when clicking inside the content", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "Open details" }));
    await userEvent.click(screen.getByText("Body"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
