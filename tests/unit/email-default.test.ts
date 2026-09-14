import { afterEach, describe, expect, it, vi } from "vitest";

const send = vi.fn();

vi.mock("resend", () => ({
  Resend: class Resend {
    emails = { send };
    constructor() {}
  },
}));

const envState = {
  RESEND_API_KEY: "re_test" as string | undefined,
  EMAIL_FROM: "hello@example.com",
  NODE_ENV: "development" as string,
};

vi.mock("@/lib/env", () => ({
  env: () => envState,
}));

describe("sendEmail default transport", () => {
  afterEach(() => {
    send.mockReset();
    envState.RESEND_API_KEY = "re_test";
    envState.NODE_ENV = "development";
  });

  it("sends via Resend when no deps are passed", async () => {
    send.mockResolvedValue({ data: { id: "msg_env" }, error: null });
    const { sendEmail } = await import("@/lib/email/send");
    const result = await sendEmail({
      to: "a@b.com",
      subject: "Hi",
      html: "<p>Hi</p>",
    });
    expect(result).toEqual({ id: "msg_env" });
    expect(send).toHaveBeenCalledWith({
      from: "hello@example.com",
      to: "a@b.com",
      subject: "Hi",
      html: "<p>Hi</p>",
    });
  });

  it("throws when Resend returns an error", async () => {
    send.mockResolvedValue({ data: null, error: { message: "boom" } });
    vi.resetModules();
    const { sendEmail } = await import("@/lib/email/send");
    await expect(
      sendEmail({ to: "a@b.com", subject: "Hi", html: "<p>Hi</p>" }),
    ).rejects.toThrow(/boom/);
  });

  it("throws when Resend omits a message id", async () => {
    send.mockResolvedValue({ data: {}, error: null });
    vi.resetModules();
    const { sendEmail } = await import("@/lib/email/send");
    await expect(
      sendEmail({ to: "a@b.com", subject: "Hi", html: "<p>Hi</p>" }),
    ).rejects.toThrow(/message id/);
  });

  it("skips when env has no api key outside production", async () => {
    envState.RESEND_API_KEY = undefined;
    envState.NODE_ENV = "development";
    vi.resetModules();
    const { sendEmail } = await import("@/lib/email/send");
    const result = await sendEmail({
      to: "a@b.com",
      subject: "Hi",
      html: "<p>Hi</p>",
    });
    expect(result).toEqual({ skipped: true, reason: "no-api-key" });
  });

  it("skips when env has no api key in production", async () => {
    envState.RESEND_API_KEY = undefined;
    envState.NODE_ENV = "production";
    vi.resetModules();
    const { sendEmail } = await import("@/lib/email/send");
    const result = await sendEmail({
      to: "a@b.com",
      subject: "Hi",
      html: "<p>Hi</p>",
    });
    expect(result).toEqual({ skipped: true, reason: "no-api-key" });
  });
});
