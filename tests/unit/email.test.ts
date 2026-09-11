import { describe, expect, it, vi } from "vitest";
import { sendEmail } from "@/lib/email/send";

describe("sendEmail", () => {
  it("skips when apiKey is missing in development", async () => {
    const send = vi.fn();
    const result = await sendEmail(
      { to: "a@b.com", subject: "Hi", html: "<p>Hi</p>" },
      { apiKey: undefined, from: "hello@example.com", nodeEnv: "development", send },
    );
    expect(result).toEqual({ skipped: true, reason: "no-api-key" });
    expect(send).not.toHaveBeenCalled();
  });

  it("throws when apiKey is missing in production", async () => {
    await expect(
      sendEmail(
        { to: "a@b.com", subject: "Hi", html: "<p>Hi</p>" },
        { apiKey: undefined, from: "hello@example.com", nodeEnv: "production", send: vi.fn() },
      ),
    ).rejects.toThrow(/RESEND_API_KEY/);
  });

  it("sends through the transport when an api key is present", async () => {
    const send = vi.fn(async () => ({ id: "msg_1" }));
    const result = await sendEmail(
      { to: "a@b.com", subject: "Hi", html: "<p>Hi</p>" },
      { apiKey: "re_test", from: "hello@example.com", nodeEnv: "development", send },
    );
    expect(result).toEqual({ id: "msg_1" });
    expect(send).toHaveBeenCalledTimes(1);
  });
});
