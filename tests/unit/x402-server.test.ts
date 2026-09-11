import { beforeEach, describe, expect, it, vi } from "vitest";

const registerExactEvmScheme = vi.fn((server: { id: string }) => server);
const HTTPFacilitatorClient = vi.fn(function HTTPFacilitatorClient(this: {
  url: string;
}, opts: { url: string }) {
  this.url = opts.url;
});
const x402ResourceServer = vi.fn(function x402ResourceServer(this: {
  id: string;
}) {
  this.id = "server";
});

vi.mock("@x402/core/server", () => ({
  HTTPFacilitatorClient,
  x402ResourceServer,
}));

vi.mock("@x402/evm/exact/server", () => ({
  registerExactEvmScheme,
}));

vi.mock("@/lib/env", () => ({
  env: () => ({ FACILITATOR_URL: "https://x402.org/facilitator" }),
}));

describe("getX402Server", () => {
  beforeEach(() => {
    vi.resetModules();
    HTTPFacilitatorClient.mockClear();
    x402ResourceServer.mockClear();
    registerExactEvmScheme.mockClear();
  });

  it("builds and memoizes the resource server", async () => {
    const { getX402Server } = await import("@/lib/x402/server");
    const first = getX402Server();
    const second = getX402Server();
    expect(second).toBe(first);
    expect(HTTPFacilitatorClient).toHaveBeenCalledTimes(1);
    expect(registerExactEvmScheme).toHaveBeenCalledTimes(1);
  });
});
