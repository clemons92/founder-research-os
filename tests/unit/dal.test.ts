import { describe, expect, it, vi } from "vitest";
import { toUserDTO, createRequireUser } from "@/lib/dal/user";

describe("toUserDTO", () => {
  it("returns only public fields", () => {
    const dto = toUserDTO({
      id: "u1",
      email: "a@b.com",
      name: "A",
      image: null,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    expect(dto).toEqual({
      id: "u1",
      email: "a@b.com",
      name: "A",
      image: null,
      emailVerified: true,
    });
    expect(dto).not.toHaveProperty("createdAt");
  });
});

describe("requireUser", () => {
  it("returns the user when a session exists", async () => {
    const requireUser = createRequireUser(async () => ({
      id: "u1",
      email: "a@b.com",
      name: "A",
      image: null,
      emailVerified: true,
    }));
    await expect(requireUser()).resolves.toMatchObject({ id: "u1" });
  });

  it("redirects to /sign-in when there is no session", async () => {
    const redirect = vi.fn(() => {
      throw new Error("NEXT_REDIRECT");
    });
    const requireUser = createRequireUser(async () => null, redirect);
    await expect(requireUser()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/sign-in");
  });
});
