import Stripe from "stripe";
import { env } from "@/lib/env";

const API_VERSION = "2026-05-27.dahlia" as const;

export function getStripe(): Stripe {
  return new Stripe(env().STRIPE_SECRET_KEY, {
    apiVersion: API_VERSION,
  });
}
