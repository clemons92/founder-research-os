import { HTTPFacilitatorClient, x402ResourceServer } from "@x402/core/server";
import { registerExactEvmScheme } from "@x402/evm/exact/server";
import { registerExactSvmScheme } from "@x402/svm/exact/server";
import { env } from "@/lib/env";

let cached: x402ResourceServer | undefined;

export function getX402Server(): x402ResourceServer {
  if (!cached) {
    const facilitatorClient = new HTTPFacilitatorClient({
      url: env().FACILITATOR_URL,
    });
    const server = new x402ResourceServer(facilitatorClient);
    registerExactEvmScheme(server);
    registerExactSvmScheme(server);
    cached = server;
  }
  return cached;
}
