import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { env } from "@/lib/env";

const config = env();
const googleId = config.GOOGLE_CLIENT_ID;
const googleSecret = config.GOOGLE_CLIENT_SECRET;

export const auth = betterAuth({
  secret: config.BETTER_AUTH_SECRET,
  baseURL: config.BETTER_AUTH_URL,
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: { enabled: true },
  socialProviders:
    googleId && googleSecret
      ? { google: { clientId: googleId, clientSecret: googleSecret } }
      : undefined,
  plugins: [nextCookies()],
});
