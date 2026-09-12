/** CAIP-2 chain identifier, e.g. "eip155:84532" or "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1". */
export type Caip = `${string}:${string}`;

const NETWORK_TO_CAIP = {
  "base-sepolia": "eip155:84532",
  base: "eip155:8453",
  "solana-devnet": "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
  "solana-testnet": "solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z",
  "solana-mainnet": "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
  solana: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
} as const;

export type DemoPaymentAccept = {
  scheme: "exact";
  price: "$0.001";
  network: Caip;
  payTo: string;
};

export type DemoWallets = {
  evmWallet?: string;
  evmNetwork?: string;
  solanaWallet?: string;
  solanaNetwork?: string;
};

export function isX402Configured(
  evmWallet?: string,
  solanaWallet?: string,
): boolean {
  return Boolean(evmWallet) || Boolean(solanaWallet);
}

export function networkToCaip(network: string): Caip {
  const mapped = NETWORK_TO_CAIP[network as keyof typeof NETWORK_TO_CAIP];
  if (!mapped) {
    throw new Error(`Unknown network: ${network}`);
  }
  return mapped;
}

function acceptFor(wallet: string, network: string): DemoPaymentAccept {
  return {
    scheme: "exact",
    price: "$0.001",
    network: networkToCaip(network),
    payTo: wallet,
  };
}

export function demoPaymentAccepts(wallets: DemoWallets): DemoPaymentAccept[] {
  const accepts: DemoPaymentAccept[] = [];
  if (wallets.evmWallet) {
    accepts.push(
      acceptFor(wallets.evmWallet, wallets.evmNetwork ?? "base-sepolia"),
    );
  }
  if (wallets.solanaWallet) {
    accepts.push(
      acceptFor(
        wallets.solanaWallet,
        wallets.solanaNetwork ?? "solana-devnet",
      ),
    );
  }
  return accepts;
}
