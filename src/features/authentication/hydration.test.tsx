import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { expect, it } from "vitest";
import { useSession } from "./hooks";

function Probe() {
  const session = useSession();
  return <p>{session.data ? `signed in as ${session.data.user.username}` : "signed out"}</p>;
}

const tree = (client: QueryClient) => (
  <QueryClientProvider client={client}>
    <Probe />
  </QueryClientProvider>
);

it("hydrates cleanly even when the session is already cached", async () => {
  // The server never knows the session.
  const container = document.createElement("div");
  container.innerHTML = renderToString(tree(new QueryClient()));
  expect(container.textContent).toBe("signed out");

  // In the browser, the rail has often fetched it before this boundary hydrates.
  const client = new QueryClient();
  client.setQueryData(["session"], { user: { username: "sol_abc", displayName: "sol_abc" }, walletOnly: true });

  const recoverable: unknown[] = [];
  await act(async () => {
    hydrateRoot(container, tree(client), { onRecoverableError: (error) => recoverable.push(error) });
  });

  expect(recoverable).toEqual([]); // no "Hydration failed"
  expect(container.textContent).toBe("signed in as sol_abc"); // and the session still shows, right after
});
