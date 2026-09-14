import { describe, expect, it, vi } from "vitest";
import { sendCheckoutReceipt } from "@/lib/email/receipt";
import { sendEmail } from "@/lib/email/send";
import { sendVerificationEmail } from "@/lib/email/verification";

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

  it("skips when apiKey is missing in production", async () => {
    const send = vi.fn();
    const result = await sendEmail(
      { to: "a@b.com", subject: "Hi", html: "<p>Hi</p>" },
      { apiKey: undefined, from: "hello@example.com", nodeEnv: "production", send },
    );
    expect(result).toEqual({ skipped: true, reason: "no-api-key" });
    expect(send).not.toHaveBeenCalled();
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

const transport = {
  from: "hello@example.com",
  nodeEnv: "development" as const,
};

describe("sendVerificationEmail", () => {
  it("builds a verification subject and html and calls sendEmail", async () => {
    const send = vi.fn(async () => ({ id: "verify_1" }));
    const result = await sendVerificationEmail(
      { to: "a@b.com", url: "https://example.com/verify" },
      { ...transport, apiKey: "re_test", send },
    );
    expect(result).toEqual({ id: "verify_1" });
    expect(send).toHaveBeenCalledWith({
      from: "hello@example.com",
      to: "a@b.com",
      subject: "Verify your Launchpad email",
      html: expect.stringContaining("https://example.com/verify"),
    });
  });
});

describe("sendCheckoutReceipt", () => {
  it("builds a receipt subject and html and calls sendEmail", async () => {
    const send = vi.fn(async () => ({ id: "receipt_1" }));
    const result = await sendCheckoutReceipt(
      { to: "a@b.com", priceId: "price_test" },
      { ...transport, apiKey: "re_test", send },
    );
    expect(result).toEqual({ id: "receipt_1" });
    expect(send).toHaveBeenCalledWith({
      from: "hello@example.com",
      to: "a@b.com",
      subject: "Your Launchpad subscription",
      html: expect.stringContaining("price_test"),
    });
  });
});
