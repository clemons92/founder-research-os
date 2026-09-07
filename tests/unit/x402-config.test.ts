import { describe, expect, it } from "vitest";
import {
  demoPaymentAccepts,
  isX402Configured,
  networkToCaip,
} from "@/lib/x402/config";

describe("isX402Configured", () => {
  it("is false when wallet is missing or empty", () => {
    expect(isX402Configured(undefined)).toBe(false);
    expect(isX402Configured("")).toBe(false);
  });

  it("is true when a wallet is set", () => {
    expect(isX402Configured("0xabc")).toBe(true);
  });
});

describe("networkToCaip", () => {
  it("maps base-sepolia to eip155:84532", () => {
    expect(networkToCaip("base-sepolia")).toBe("eip155:84532");
  });

  it("maps base to eip155:8453", () => {
    expect(networkToCaip("base")).toBe("eip155:8453");
  });

  it("throws on an unknown network", () => {
    expect(() => networkToCaip("ethereum")).toThrow(/unknown network/i);
  });
});

describe("demoPaymentAccepts", () => {
  it("returns the exact-scheme accept for the wallet and mapped network", () => {
    expect(demoPaymentAccepts("0xabc", "base-sepolia")).toEqual([
      {
        scheme: "exact",
        price: "$0.001",
        network: "eip155:84532",
        payTo: "0xabc",
      },
    ]);
  });
});
