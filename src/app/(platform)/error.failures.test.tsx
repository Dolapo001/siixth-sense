import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import PlatformError from "./error";

describe("(platform) error boundary", () => {
  afterEach(() => vi.restoreAllMocks());

  it("shows the error state, logs the error, and retries on request", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const retry = vi.fn();
    const error = new Error("boom");
    render(<PlatformError error={error} retry={retry} />);

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("This page hit an unexpected problem. Trying again often fixes it.")).toBeInTheDocument();
    expect(consoleError).toHaveBeenCalledWith(error);
    expect(retry).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
