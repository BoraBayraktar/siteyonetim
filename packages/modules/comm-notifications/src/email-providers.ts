import type { EmailProvider, SendEmailInput, SendResult } from "./provider-types";

export function isRealEmailProviderConfigured(): boolean {
  const kind = process.env.EMAIL_PROVIDER?.trim().toLowerCase();
  const from = process.env.EMAIL_FROM?.trim();
  if (!from) return false;

  if (kind === "sendgrid" || (!kind && process.env.SENDGRID_API_KEY?.trim())) {
    return Boolean(process.env.SENDGRID_API_KEY?.trim());
  }
  if (kind === "resend" || process.env.RESEND_API_KEY?.trim()) {
    return Boolean(process.env.RESEND_API_KEY?.trim());
  }
  return false;
}

export class ConsoleEmailProvider implements EmailProvider {
  async send(input: SendEmailInput): Promise<SendResult> {
    console.info("[comm-notifications] EMAIL (console provider — not delivered)", {
      to: input.to,
      subject: input.subject,
      body: input.body,
    });
    return { costMinor: 0 };
  }
}

export class ResendEmailProvider implements EmailProvider {
  async send(input: SendEmailInput): Promise<SendResult> {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    const from = process.env.EMAIL_FROM?.trim();
    if (!apiKey || !from) {
      throw new Error("EMAIL_NOT_CONFIGURED");
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        text: input.body,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`EMAIL_SEND_FAILED:${response.status}:${detail.slice(0, 200)}`);
    }

    return { costMinor: 0 };
  }
}

export class SendGridEmailProvider implements EmailProvider {
  async send(input: SendEmailInput): Promise<SendResult> {
    const apiKey = process.env.SENDGRID_API_KEY?.trim();
    const from = process.env.EMAIL_FROM?.trim();
    if (!apiKey || !from) {
      throw new Error("EMAIL_NOT_CONFIGURED");
    }

    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: input.to }] }],
        from: { email: from },
        subject: input.subject,
        content: [{ type: "text/plain", value: input.body }],
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`EMAIL_SEND_FAILED:${response.status}:${detail.slice(0, 200)}`);
    }

    return { costMinor: 0 };
  }
}

export function createEmailProvider(): EmailProvider {
  const kind = process.env.EMAIL_PROVIDER?.trim().toLowerCase();
  if (kind === "sendgrid" || (!kind && process.env.SENDGRID_API_KEY?.trim())) {
    if (process.env.SENDGRID_API_KEY?.trim() && process.env.EMAIL_FROM?.trim()) {
      return new SendGridEmailProvider();
    }
  }
  if (kind === "resend" || process.env.RESEND_API_KEY?.trim()) {
    if (process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim()) {
      return new ResendEmailProvider();
    }
  }
  return new ConsoleEmailProvider();
}
