import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
    STRIPE_WEBHOOK_SECRET: z.string().min(1),
    STRIPE_PRICE_ID: z.string().startsWith("price_"),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith("pk_"),
    EMAIL_FROM: z.email(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    RESEND_API_KEY: z.string().optional(),
    RESOURCE_WALLET_ADDRESS: z.string().optional(),
    NETWORK: z.string().default("base-sepolia"),
    SOLANA_RESOURCE_WALLET_ADDRESS: z.string().optional(),
    SOLANA_NETWORK: z.string().default("solana-devnet"),
    FACILITATOR_URL: z.url().default("https://x402.org/facilitator"),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === "production" && !data.RESEND_API_KEY) {
      ctx.addIssue({
        code: "custom",
        path: ["RESEND_API_KEY"],
        message: "RESEND_API_KEY is required in production",
      });
    }
    if (data.NODE_ENV === "production" && !data.RESOURCE_WALLET_ADDRESS) {
      ctx.addIssue({
        code: "custom",
        path: ["RESOURCE_WALLET_ADDRESS"],
        message: "RESOURCE_WALLET_ADDRESS is required in production",
      });
    }
    const hasId = Boolean(data.GOOGLE_CLIENT_ID);
    const hasSecret = Boolean(data.GOOGLE_CLIENT_SECRET);
    if (hasId !== hasSecret) {
      ctx.addIssue({
        code: "custom",
        path: ["GOOGLE_CLIENT_ID"],
        message: "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must both be set",
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

export function loadEnv(
  source: Record<string, string | undefined> = process.env,
): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment: ${details}`);
  }
  return parsed.data;
}

let cached: Env | undefined;

export function env(): Env {
  if (!cached) {
    cached = loadEnv();
  }
  return cached;
}
