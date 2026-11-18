import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import bs58 from "bs58";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { __sample } from "@/features/discoveries/data/mock-source";
import type { WalletControls } from "./wallet";

vi.stubEnv("NEXT_PUBLIC_ENABLE_DEV_MOCKS", "true");

let signedIn = true;
let walletOnly = false;
vi.mock("@/features/authentication/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/authentication/session")>()),
  getSession: async () =>
    signedIn ? { user: { username: "sample_viewer", displayName: "You (sample viewer)" }, walletOnly } : null,
}));

let search = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/web3",
  useSearchParams: () => new URLSearchParams(search),
}));

const { createMockWeb3Source, verifySolanaSignature } = await import("./data/mock-source");
const { IdentityView } = await import("./identity-view");
const { ProofOfDiscovery } = await import("./proof-view");
const { RewardsView } = await import("@/features/rewards/rewards-view");

/** A real Ed25519 keypair, like a Solana wallet's. */
async function makeWallet() {
  const keys = (await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"])) as CryptoKeyPair;
  const address = bs58.encode(new Uint8Array(await crypto.subtle.exportKey("raw", keys.publicKey)));
  const sign = async (message: Uint8Array) =>
    new Uint8Array(await crypto.subtle.sign("Ed25519", keys.privateKey, message as BufferSource));
  return { address, sign };
}

function withQuery(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const controls = (overrides: Partial<WalletControls> = {}): WalletControls => ({
  available: [],
  connected: false,
  connecting: false,
  walletName: null,
  address: null,
  connect: vi.fn(),
  disconnect: vi.fn(async () => {}),
  signMessage: null,
  ...overrides,
});

beforeEach(async () => {
  signedIn = true;
  walletOnly = false;
  search = "";
  // Start each test with no linked wallet.
  await createMockWeb3Source().unlinkWallet();
});

describe("wallet ownership check", () => {
  it("accepts a genuine signature and links the wallet as verified", async () => {
    const source = createMockWeb3Source();
    const wallet = await makeWallet();
    const challenge = await source.createChallenge(wallet.address);
    expect(challenge.message).toContain("It is not a transaction and costs nothing.");
    const signature = bs58.encode(await wallet.sign(new TextEncoder().encode(challenge.message)));
    const linked = await source.linkWallet(wallet.address, challenge, signature);
    expect(linked).toMatchObject({ address: wallet.address, verified: true });
    expect(await source.getLinkedWallet()).toMatchObject({ verified: true });
  });

  it("rejects a signature from a different wallet", async () => {
    const source = createMockWeb3Source();
    const [owner, imposter] = [await makeWallet(), await makeWallet()];
    const challenge = await source.createChallenge(owner.address);
    const forged = bs58.encode(await imposter.sign(new TextEncoder().encode(challenge.message)));
    await expect(source.linkWallet(owner.address, challenge, forged)).rejects.toThrow("didn't match this wallet");
    expect(await source.getLinkedWallet()).toBeNull();
  });

  it("won't accept the same challenge twice", async () => {
    const source = createMockWeb3Source();
    const wallet = await makeWallet();
    const challenge = await source.createChallenge(wallet.address);
    const signature = bs58.encode(await wallet.sign(new TextEncoder().encode(challenge.message)));
    await source.linkWallet(wallet.address, challenge, signature);
    await expect(source.linkWallet(wallet.address, challenge, signature)).rejects.toThrow("isn't valid");
  });

  it("rejects an expired challenge", async () => {
    let now = Date.now();
    const source = createMockWeb3Source(() => now);
    const wallet = await makeWallet();
    const challenge = await source.createChallenge(wallet.address);
    const signature = bs58.encode(await wallet.sign(new TextEncoder().encode(challenge.message)));
    now += 10 * 60_000;
    await expect(source.linkWallet(wallet.address, challenge, signature)).rejects.toThrow("expired");
  });

  it("rejects malformed input instead of crashing", async () => {
    expect(await verifySolanaSignature("not-base58-0OIl", "hi", "x")).toBe(false);
  });

  it("requires sign-in", async () => {
    signedIn = false;
    await expect(createMockWeb3Source().createChallenge("x")).rejects.toThrow("Sign in");
  });
});

describe("sample rewards and attestations", () => {
  it("never rewards discoveries that aren't verified", async () => {
    const rewards = (await createMockWeb3Source().getRewards())!;
    const mine = __sample.items.filter((i) => i.contributor.username === "sample_viewer");
    expect(rewards.activity).toHaveLength(mine.length);
    for (const activity of rewards.activity) {
      const item = mine.find((i) => i.id === activity.discoveryId)!;
      if (item.verification !== "verified") {
        expect(activity.status).toBe("not_eligible");
        expect(activity.reason).toBeTruthy();
        expect(activity.amount).toBeUndefined();
      }
    }
    const paid = rewards.history.filter((p) => p.status === "completed").reduce((n, p) => n + p.amount, 0);
    expect(rewards.summary.completed).toBe(paid);
    expect(rewards.history.filter((p) => p.status === "pending").every((p) => p.transaction === null)).toBe(true);
  });

  it("pays nothing out until a verified wallet is linked", async () => {
    const source = createMockWeb3Source();
    const before = (await source.getRewards())!;
    expect(before.summary.completed).toBe(0);
    expect(before.activity.filter((a) => a.status === "pending_payout").every((a) => a.reason)).toBe(true);

    const wallet = await makeWallet();
    const challenge = await source.createChallenge(wallet.address);
    await source.linkWallet(
      wallet.address,
      challenge,
      bs58.encode(await wallet.sign(new TextEncoder().encode(challenge.message))),
    );
    const after = (await source.getRewards())!;
    expect(after.summary.completed).toBeGreaterThan(0);
  });

  it("has no rewards when signed out", async () => {
    signedIn = false;
    expect(await createMockWeb3Source().getRewards()).toBeNull();
  });

  it("only attests verified discoveries, newest first, a page at a time", async () => {
    const page = await createMockWeb3Source().listAttestations(1);
    expect(page.items.length).toBeLessThanOrEqual(page.pageSize);
    expect(page.items.every((a) => a.status === "verified")).toBe(true);
    const dates = page.items.map((a) => a.recordedAt);
    expect([...dates].sort().reverse()).toEqual(dates);
  });
});

describe("IdentityView", () => {
  it("says plainly when no wallet is installed", async () => {
    withQuery(<IdentityView source={createMockWeb3Source()} controls={controls()} />);
    expect(await screen.findByRole("heading", { name: "No Solana wallet found" })).toBeInTheDocument();
    expect(screen.getByText(/never/)).toBeInTheDocument();
  });

  it("offers each installed wallet", async () => {
    const connect = vi.fn();
    withQuery(
      <IdentityView
        source={createMockWeb3Source()}
        controls={controls({ available: [{ name: "Sample Wallet", icon: "data:," }], connect })}
      />,
    );
    await userEvent.click(await screen.findByRole("button", { name: /Connect Sample Wallet/ }));
    expect(connect).toHaveBeenCalledWith("Sample Wallet");
  });

  it("verifies ownership end to end and shows the wallet as verified", async () => {
    const wallet = await makeWallet();
    withQuery(
      <IdentityView
        source={createMockWeb3Source()}
        controls={controls({
          connected: true,
          walletName: "Sample Wallet",
          address: wallet.address,
          signMessage: wallet.sign,
        })}
      />,
    );
    expect(await screen.findByText("No wallet linked")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Verify ownership" }));
    expect(await screen.findByText("Verified")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Unlink wallet" })).toBeInTheDocument();
  });

  it("never offers to unlink the wallet an account signs in with", async () => {
    // Wallet-only accounts have no other way in: unlinking would lock them out
    // for good, and the backend has no guard yet.
    walletOnly = true;
    const wallet = await makeWallet();
    withQuery(
      <IdentityView
        source={createMockWeb3Source()}
        controls={controls({ connected: true, address: wallet.address, signMessage: wallet.sign })}
      />,
    );
    await userEvent.click(await screen.findByRole("button", { name: "Verify ownership" }));
    expect(await screen.findByText("Verified")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Unlink wallet" })).not.toBeInTheDocument();
    expect(screen.getByText(/this wallet is how you sign in/i)).toBeInTheDocument();
  });

  it("explains a cancelled signature and links nothing", async () => {
    const wallet = await makeWallet();
    const reject = vi.fn(async () => {
      throw new Error("User rejected the request.");
    });
    withQuery(
      <IdentityView
        source={createMockWeb3Source()}
        controls={controls({ connected: true, address: wallet.address, signMessage: reject })}
      />,
    );
    await userEvent.click(await screen.findByRole("button", { name: "Verify ownership" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You cancelled the signature request. Nothing was linked.",
    );
    expect(screen.getByText("No wallet linked")).toBeInTheDocument();
  });

  it("asks signed-out visitors to sign in before linking", async () => {
    signedIn = false;
    withQuery(<IdentityView source={createMockWeb3Source()} controls={controls()} />);
    expect(await screen.findByText(/to link a wallet to your account/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Verify ownership" })).not.toBeInTheDocument();
  });
});

describe("ProofOfDiscovery", () => {
  it("separates community verification from on-chain attestation", async () => {
    withQuery(<ProofOfDiscovery />);
    expect(screen.getByRole("heading", { name: "Community verification" })).toBeInTheDocument();
    expect(screen.getByText(/does/).closest("p")).toHaveTextContent("It does not prove the discovery is correct.");
    const first = (await screen.findAllByRole("listitem"))[0];
    expect(within(first).getByRole("link", { name: /View in explorer/ })).toHaveAttribute("target", "_blank");
    expect(within(first).getByText("Status when recorded")).toBeInTheDocument();
  });
});

describe("RewardsView", () => {
  it("asks signed-out visitors to sign in", async () => {
    signedIn = false;
    withQuery(<RewardsView />);
    expect(await screen.findByRole("heading", { name: "Sign in to see your rewards" })).toBeInTheDocument();
  });

  it("shows eligibility rules, reasons for ineligible work, and the wallet requirement", async () => {
    withQuery(<RewardsView />);
    expect(await screen.findByText(/Uploading alone never earns rewards/)).toBeInTheDocument();
    expect(await screen.findByText(/Payouts need a verified wallet/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Your discoveries" })).toBeInTheDocument();
  });
});
