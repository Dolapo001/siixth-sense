import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.stubEnv("NEXT_PUBLIC_ENABLE_DEV_MOCKS", "true");

let signedIn = true;
vi.mock("@/features/authentication/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/authentication/session")>()),
  getSession: async () => (signedIn ? { user: { username: "sample_viewer", displayName: "You (sample viewer)" }, walletOnly: true } : null),
}));

const replace = vi.fn();
let search = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => "/settings",
  useSearchParams: () => new URLSearchParams(search),
}));

const { createMockSettingsSource, __resetSampleSettings, __lastSampleVerificationToken } = await import("./data/mock-source");
const { AccountSettingsSections } = await import("./settings-panels");
const { VerifyEmailView } = await import("./verify-email-view");

function withQuery(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  signedIn = true;
  search = "";
  replace.mockReset();
  __resetSampleSettings();
});

describe("live adapter", () => {
  let requests: { url: string; method: string; body: unknown }[] = [];
  let respond: () => Response;
  const ok = (data: unknown) => Response.json({ success: true, message: "OK", data });
  const backend = {
    account: { username: "sol_abc", email: "a@b.io", email_verified: false, has_password: false },
    privacy: { profile_public: true, show_wallet: false, show_activity: true, attribute_discoveries_publicly: true },
  };

  beforeEach(() => {
    requests = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit = {}) => {
        requests.push({ url, method: init.method ?? "GET", body: typeof init.body === "string" ? JSON.parse(init.body) : null });
        return respond();
      }),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  const live = async () => (await import("./data/api-source")).createApiSettingsSource();

  it("maps the backend's flags onto the screen's names", async () => {
    respond = () => ok(backend);
    expect(await (await live()).get()).toEqual({
      account: { username: "sol_abc", email: "a@b.io", emailVerified: false, hasPassword: false },
      privacy: { profilePublic: true, showWallet: false, showActivity: true, creditDiscoveries: true },
    });
  });

  it("sends only the flag that changed, under the backend's name", async () => {
    respond = () => ok({ ...backend, privacy: { ...backend.privacy, attribute_discoveries_publicly: false } });
    const settings = await (await live()).setPrivacy({ creditDiscoveries: false });
    expect(requests[0]).toMatchObject({ method: "PATCH", body: { privacy: { attribute_discoveries_publicly: false } } });
    expect(settings.privacy.creditDiscoveries).toBe(false);
  });

  it("confirms deletion explicitly, adding the password only when there is one", async () => {
    respond = () => ok({});
    await (await live()).deleteAccount();
    await (await live()).deleteAccount("hunter2!");
    expect(requests.map((r) => [r.method, r.body])).toEqual([
      ["DELETE", { confirm: "DELETE" }],
      ["DELETE", { confirm: "DELETE", password: "hunter2!" }],
    ]);
  });

  it("reads as signed out on 401", async () => {
    respond = () => Response.json({ success: false, message: "No.", errors: {} }, { status: 401 });
    expect(await (await live()).get()).toBeNull();
  });
});

describe("settings page (sample source)", () => {
  it("asks signed-out players to sign in", async () => {
    signedIn = false;
    withQuery(<AccountSettingsSections />);
    expect(await screen.findByRole("link", { name: "Sign in" })).toBeInTheDocument();
  });

  it("saves a privacy change", async () => {
    withQuery(<AccountSettingsSections />);
    const wallet = await screen.findByRole("checkbox", { name: /Show my wallet/ });
    expect(wallet).not.toBeChecked();
    await userEvent.click(wallet);
    await waitFor(() => expect(wallet).toBeChecked());
    expect((await createMockSettingsSource().get())!.privacy.showWallet).toBe(true);
  });

  it("adds an email, which stays unverified until the link is used", async () => {
    withQuery(<AccountSettingsSections />);
    const email = await screen.findByRole("textbox", { name: "Email" });
    await userEvent.click(screen.getByRole("button", { name: "Add email" }));
    expect(await screen.findByText("Enter a valid email.")).toBeInTheDocument();
    await userEvent.type(email, "player@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Add email" }));
    expect(await screen.findByText(/We sent a link to player@example.com/)).toBeInTheDocument();
    expect(await screen.findByText("Not verified")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Resend verification link" })).toBeInTheDocument();
  });

  it("only deletes once DELETE is typed, then signs out and leaves", async () => {
    const logout = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", logout);
    withQuery(<AccountSettingsSections />);
    await userEvent.click(await screen.findByRole("button", { name: "Delete account" }));
    const dialog = await screen.findByRole("dialog", { name: "Delete your account?" });
    expect(within(dialog).getByText(/Signing in with it again starts a new, empty account/)).toBeInTheDocument();
    const confirm = within(dialog).getByRole("button", { name: "Delete my account" });
    expect(confirm).toBeDisabled();
    await userEvent.type(within(dialog).getByLabelText(/Type "DELETE"/), "delete");
    expect(confirm).toBeDisabled(); // exact, case-sensitive
    await userEvent.clear(within(dialog).getByLabelText(/Type "DELETE"/));
    await userEvent.type(within(dialog).getByLabelText(/Type "DELETE"/), "DELETE");
    await userEvent.click(confirm);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(logout).toHaveBeenCalledWith("/api/auth/logout", expect.objectContaining({ method: "POST" }));
    expect(await createMockSettingsSource().get()).toBeNull();
    vi.unstubAllGlobals();
  });
});

describe("verify email page (sample source)", () => {
  it("verifies with the emailed token", async () => {
    await createMockSettingsSource().setEmail("player@example.com");
    search = `token=${__lastSampleVerificationToken()}`;
    withQuery(<VerifyEmailView />);
    expect(await screen.findByText("Email verified")).toBeInTheDocument();
    expect((await createMockSettingsSource().get())!.account.emailVerified).toBe(true);
  });

  it("explains a bad or expired link", async () => {
    search = "token=nope";
    withQuery(<VerifyEmailView />);
    expect(await screen.findByText("We couldn't verify your email")).toBeInTheDocument();
    expect(screen.getByText(/Invalid or expired token/)).toBeInTheDocument();
  });

  it("explains a link with no token", async () => {
    withQuery(<VerifyEmailView />);
    expect(await screen.findByText("This link is incomplete")).toBeInTheDocument();
  });
});
