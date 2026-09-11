import { env } from "@/lib/env";

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
};

export type SendEmailResult =
  | { id: string }
  | { skipped: true; reason: "no-api-key" };

export type SendEmailTransport = (payload: {
  from: string;
  to: string;
  subject: string;
  html: string;
}) => Promise<{ id: string }>;

export type SendEmailDeps = {
  apiKey?: string;
  from: string;
  nodeEnv: string;
  send: SendEmailTransport;
};

async function defaultResendSend(
  apiKey: string,
  payload: {
    from: string;
    to: string;
    subject: string;
    html: string;
  },
): Promise<{ id: string }> {
  const { Resend } = await import("resend");
  const result = await new Resend(apiKey).emails.send(payload);
  if (result.error) {
    throw new Error(result.error.message);
  }
  const id = result.data?.id;
  if (!id) {
    throw new Error("Resend did not return a message id");
  }
  return { id };
}

function resolveDeps(deps?: SendEmailDeps): SendEmailDeps {
  if (deps) {
    return deps;
  }
  const config = env();
  const apiKey = config.RESEND_API_KEY;
  return {
    apiKey,
    from: config.EMAIL_FROM,
    nodeEnv: config.NODE_ENV,
    send: (payload) => {
      if (!apiKey) {
        throw new Error("RESEND_API_KEY is required in production");
      }
      return defaultResendSend(apiKey, payload);
    },
  };
}

export async function sendEmail(
  input: SendEmailInput,
  deps?: SendEmailDeps,
): Promise<SendEmailResult> {
  const resolved = resolveDeps(deps);
  if (!resolved.apiKey) {
    if (resolved.nodeEnv === "production") {
      throw new Error("RESEND_API_KEY is required in production");
    }
    console.info("Skipping email send: no RESEND_API_KEY", {
      to: input.to,
      subject: input.subject,
    });
    return { skipped: true, reason: "no-api-key" };
  }

  return resolved.send({
    from: resolved.from,
    to: input.to,
    subject: input.subject,
    html: input.html,
  });
}
