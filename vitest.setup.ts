import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(cleanup);

// The sample data sources simulate ~250 ms of latency per call, and some flows
// chain several calls. The 1 s default flakes when the whole suite runs in parallel.
configure({ asyncUtilTimeout: 3000 });

// jsdom doesn't implement modal dialogs. Minimal stand-in: toggles `open` and fires `close`.
if (typeof HTMLDialogElement !== "undefined" && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    if (!this.hasAttribute("open")) return;
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
}
