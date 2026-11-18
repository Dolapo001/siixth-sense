import { useState } from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { actionErrorMessage } from "@/features/community/hooks";
import { ActionRefusedError } from "@/features/discoveries/data/source";
import { CommentForm } from "./comment-form";
import { AddEvidenceDialog, ReportDialog } from "./community-dialogs";

/** Mirrors how the discovery page wires a mutation's error into the form. */
function CommentHarness({ onSubmit }: { onSubmit: (body: string) => Promise<unknown> }) {
  const [error, setError] = useState<string | null>(null);
  return (
    <CommentForm
      pending={false}
      error={error}
      onSubmit={async (body) => {
        setError(null);
        try {
          return await onSubmit(body);
        } catch (e) {
          setError(actionErrorMessage(e));
          throw e;
        }
      }}
    />
  );
}

describe("CommentForm", () => {
  it("doesn't submit a whitespace-only comment", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<CommentHarness onSubmit={onSubmit} />);
    await userEvent.click(screen.getByLabelText("Add a comment"));
    await userEvent.paste("     ");
    await userEvent.click(screen.getByRole("button", { name: "Post comment" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Write at least 2 characters.");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows the error and keeps the text when posting fails", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new ActionRefusedError("Comments are closed."));
    render(<CommentHarness onSubmit={onSubmit} />);
    const box = screen.getByLabelText("Add a comment");
    await userEvent.click(box);
    await userEvent.paste("This is the bridge near the docks.");
    await userEvent.click(screen.getByRole("button", { name: "Post comment" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Comments are closed.");
    expect(onSubmit).toHaveBeenCalledWith("This is the bridge near the docks.");
    expect(box).toHaveValue("This is the bridge near the docks.");
  });

  it("clears the text after a successful post", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<CommentHarness onSubmit={onSubmit} />);
    const box = screen.getByLabelText("Add a comment");
    await userEvent.click(box);
    await userEvent.paste("Looks right to me.");
    await userEvent.click(screen.getByRole("button", { name: "Post comment" }));
    await waitFor(() => expect(box).toHaveValue(""));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("AddEvidenceDialog", () => {
  it("rejects a javascript: link with a visible error", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<AddEvidenceDialog open onOpenChange={vi.fn()} onSubmit={onSubmit} pending={false} error={null} />);
    const dialog = screen.getByRole("dialog", { name: "Add supporting evidence" });
    await userEvent.click(within(dialog).getByLabelText(/Evidence/));
    await userEvent.paste("The sign matches the reference image.");
    await userEvent.click(within(dialog).getByLabelText(/Link/));
    await userEvent.paste("javascript:alert(1)");
    await userEvent.click(within(dialog).getByRole("button", { name: "Add evidence" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Enter a full link starting with http:// or https://",
    );
    expect(within(dialog).getByLabelText(/Link/)).toHaveAttribute("aria-invalid", "true");
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe("ReportDialog", () => {
  it("requires a reason before sending", async () => {
    const onSubmit = vi.fn().mockResolvedValue({ reportId: "r1" });
    render(
      <ReportDialog
        open
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
        pending={false}
        error={null}
        subject="discovery"
      />,
    );
    const dialog = screen.getByRole("dialog", { name: "Report this discovery" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Send report" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Choose a reason.");
    expect(onSubmit).not.toHaveBeenCalled();

    await userEvent.click(within(dialog).getByLabelText("Spam or advertising"));
    await userEvent.click(within(dialog).getByRole("button", { name: "Send report" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ reason: "spam" })));
  });
});
