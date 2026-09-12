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

  it("is true when only a Solana wallet is set", () => {
    expect(isX402Configured(undefined, "SoL11111111111111111111111111111111111111112")).toBe(
      true,
    );
  });

  it("is false when both wallets are empty", () => {
    expect(isX402Configured("", "")).toBe(false);
  });
});

describe("networkToCaip", () => {
  it("maps base-sepolia to eip155:84532", () => {
    expect(networkToCaip("base-sepolia")).toBe("eip155:84532");
  });

  it("maps base to eip155:8453", () => {
    expect(networkToCaip("base")).toBe("eip155:8453");
  });

  it("maps solana-devnet to the confirmed CAIP-2 id", () => {
    expect(networkToCaip("solana-devnet")).toBe(
      "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
    );
  });

  it("maps solana mainnet aliases to the confirmed CAIP-2 id", () => {
    expect(networkToCaip("solana")).toBe(
      "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
    );
    expect(networkToCaip("solana-mainnet")).toBe(
      "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
    );
  });

  it("throws on an unknown network", () => {
    expect(() => networkToCaip("ethereum")).toThrow(/unknown network/i);
  });
});

describe("demoPaymentAccepts", () => {
  it("returns EVM-only accepts", () => {
    expect(
      demoPaymentAccepts({
        evmWallet: "0xabc",
        evmNetwork: "base-sepolia",
      }),
    ).toEqual([
      {
        scheme: "exact",
        price: "$0.001",
        network: "eip155:84532",
        payTo: "0xabc",
      },
    ]);
  });

  it("returns Solana-only accepts", () => {
    expect(
      demoPaymentAccepts({
        solanaWallet: "SoL11111111111111111111111111111111111111112",
        solanaNetwork: "solana-devnet",
      }),
    ).toEqual([
      {
        scheme: "exact",
        price: "$0.001",
        network: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
        payTo: "SoL11111111111111111111111111111111111111112",
      },
    ]);
  });

  it("defaults EVM network to base-sepolia and Solana network to solana-devnet", () => {
    expect(demoPaymentAccepts({ evmWallet: "0xabc" })[0]?.network).toBe(
      "eip155:84532",
    );
    expect(
      demoPaymentAccepts({
        solanaWallet: "SoL11111111111111111111111111111111111111112",
      })[0]?.network,
    ).toBe("solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1");
  });

  it("returns both EVM and Solana accepts when both wallets are set", () => {
    expect(
      demoPaymentAccepts({
        evmWallet: "0xabc",
        evmNetwork: "base",
        solanaWallet: "SoL11111111111111111111111111111111111111112",
        solanaNetwork: "solana-mainnet",
      }),
    ).toEqual([
      {
        scheme: "exact",
        price: "$0.001",
        network: "eip155:8453",
        payTo: "0xabc",
      },
      {
        scheme: "exact",
        price: "$0.001",
        network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
        payTo: "SoL11111111111111111111111111111111111111112",
      },
    ]);
  });
});
