import { product } from "@/lib/config/product";
import {
  sendEmail,
  type SendEmailDeps,
  type SendEmailResult,
} from "@/lib/email/send";

export async function sendVerificationEmail(
  input: { to: string; url: string },
  deps?: SendEmailDeps,
): Promise<SendEmailResult> {
  return sendEmail(
    {
      to: input.to,
      subject: `Verify your ${product.name} email`,
      html: `<p>Confirm your email for ${product.name}:</p><p><a href="${input.url}">${input.url}</a></p>`,
    },
    deps,
  );
}
