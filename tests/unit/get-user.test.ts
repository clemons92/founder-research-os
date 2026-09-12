import { describe, expect, it, vi } from "vitest";

const getSession = vi.fn();

vi.mock("@/lib/auth/server", () => ({
  auth: { api: { getSession } },
}));

vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
}));

describe("getUser", () => {
  it("returns a DTO when a session exists", async () => {
    getSession.mockResolvedValue({
      user: {
        id: "u1",
        email: "a@b.com",
        name: "A",
        image: "https://img",
        emailVerified: true,
      },
    });
    const { getUser } = await import("@/lib/dal/user");
    await expect(getUser()).resolves.toEqual({
      id: "u1",
      email: "a@b.com",
      name: "A",
      image: "https://img",
      emailVerified: true,
    });
  });

  it("returns null when there is no session", async () => {
    vi.resetModules();
    getSession.mockResolvedValue(null);
    const { getUser } = await import("@/lib/dal/user");
    await expect(getUser()).resolves.toBeNull();
  });
});
