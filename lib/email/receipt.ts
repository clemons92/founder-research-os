import { product } from "@/lib/config/product";
import {
  sendEmail,
  type SendEmailDeps,
  type SendEmailResult,
} from "@/lib/email/send";

export async function sendCheckoutReceipt(
  input: { to: string; priceId: string },
  deps?: SendEmailDeps,
): Promise<SendEmailResult> {
  return sendEmail(
    {
      to: input.to,
      subject: `Your ${product.name} subscription`,
      html: `<p>Thanks for subscribing to ${product.name}.</p><p>Plan: ${input.priceId}</p>`,
    },
    deps,
  );
}
