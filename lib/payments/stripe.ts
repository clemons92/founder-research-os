import Stripe from "stripe";
import { env } from "@/lib/env";

const API_VERSION = "2026-05-27.dahlia" as const;

export function isStripeConfigured(): boolean {
  return Boolean(env().STRIPE_SECRET_KEY);
}

export function getStripe(): Stripe {
  const secretKey = env().STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Stripe is not configured");
  }
  return new Stripe(secretKey, {
    apiVersion: API_VERSION,
  });
}
