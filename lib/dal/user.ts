import { cache } from "react";
import { redirect } from "next/navigation";

export type UserDTO = {
  id: string;
  email: string;
  name: string;
  image: string | null;
  emailVerified: boolean;
};

/** Shape of the Better Auth user we accept; extra fields are ignored. */
type SessionUser = {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  emailVerified: boolean;
  [key: string]: unknown;
};

/**
 * Map a Better Auth user to the public DTO. Never pass the full Better Auth
 * user (which may carry sensitive/internal fields) to Client Components.
 */
export function toUserDTO(user: SessionUser): UserDTO {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image ?? null,
    emailVerified: user.emailVerified,
  };
}

export type GetUser = () => Promise<UserDTO | null>;
type RedirectFn = (url: string) => never;

/**
 * Testable core of `requireUser`. Injecting the session lookup and redirect
 * keeps this free of Next/Postgres so it can be unit-tested.
 */
export function createRequireUser(
  getUser: GetUser,
  redirectTo: RedirectFn = redirect,
): () => Promise<UserDTO> {
  return async () => {
    const user = await getUser();
    if (!user) {
      redirectTo("/sign-in");
    }
    return user;
  };
}

/**
 * Authoritative session read. Lazily imports the server-only auth module so
 * this file stays importable (pure helpers) outside a server runtime.
 * Wrapped in React `cache()` to dedupe within a single render pass.
 */
export const getUser: GetUser = cache(async () => {
  const { auth } = await import("@/lib/auth/server");
  const { headers } = await import("next/headers");
  const session = await auth.api.getSession({ headers: await headers() });
  return session ? toUserDTO(session.user) : null;
});

/** Redirects to /sign-in when unauthenticated; returns the user otherwise. */
export const requireUser = createRequireUser(getUser);
