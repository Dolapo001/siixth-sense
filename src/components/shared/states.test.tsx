import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EmptyState, ErrorState, LoadingState, PermissionDeniedState, UnavailableState } from "./states";

describe("shared states", () => {
  it("announces loading to screen readers", () => {
    render(<LoadingState label="Loading discoveries" />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading discoveries…");
  });

  it("empty state explains and offers a next step", () => {
    render(
      <EmptyState
        title="No discoveries yet"
        description="Be the first to share one."
        action={{ label: "Analyze a screenshot", href: "/analyze" }}
      />,
    );
    expect(screen.getByRole("heading", { name: "No discoveries yet" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Analyze a screenshot" })).toHaveAttribute("href", "/analyze");
  });

  it("error state is an alert and retries", async () => {
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("error state has no retry button when retrying can't help", () => {
    render(<ErrorState />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("unavailable is worded differently from empty", () => {
    render(<UnavailableState description="The backend isn't connected yet." />);
    expect(screen.getByRole("heading", { name: "Not available yet" })).toBeInTheDocument();
  });

  it("permission denied explains why", () => {
    render(<PermissionDeniedState description="Admin requires a staff account." />);
    expect(screen.getByRole("heading", { name: "You don't have access" })).toBeInTheDocument();
    expect(screen.getByText("Admin requires a staff account.")).toBeInTheDocument();
  });
});
