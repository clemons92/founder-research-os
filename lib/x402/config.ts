/** CAIP-2 chain identifier, e.g. "eip155:84532". */
export type Caip = `${string}:${string}`;

const NETWORK_TO_CAIP = {
  "base-sepolia": "eip155:84532",
  base: "eip155:8453",
} as const;

export type DemoPaymentAccept = {
  scheme: "exact";
  price: "$0.001";
  network: Caip;
  payTo: string;
};

export function isX402Configured(wallet: string | undefined): boolean {
  return Boolean(wallet);
}

export function networkToCaip(network: string): Caip {
  const mapped = NETWORK_TO_CAIP[network as keyof typeof NETWORK_TO_CAIP];
  if (!mapped) {
    throw new Error(`Unknown network: ${network}`);
  }
  return mapped;
}

export function demoPaymentAccepts(
  wallet: string,
  network: string,
): DemoPaymentAccept[] {
  return [
    {
      scheme: "exact",
      price: "$0.001",
      network: networkToCaip(network),
      payTo: wallet,
    },
  ];
}
