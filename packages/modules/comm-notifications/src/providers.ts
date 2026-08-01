export type {
  EmailProvider,
  SendEmailInput,
  SendResult,
  SendSmsInput,
  SendWhatsAppTemplateInput,
  SmsProvider,
  WhatsAppProvider,
} from "./provider-types";
export { createEmailProvider, ConsoleEmailProvider, ResendEmailProvider, SendGridEmailProvider } from "./email-providers";
export { createSmsProvider, ConsoleSmsProvider, NetgsmSmsProvider, TwilioSmsProvider } from "./sms-providers";

import type { SendResult, SendWhatsAppTemplateInput, WhatsAppProvider } from "./provider-types";

function normalizeWhatsAppTo(to: string): string {
  return to.replace(/\D/g, "");
}

export class ConsoleWhatsAppProvider implements WhatsAppProvider {
  async sendTemplate(input: SendWhatsAppTemplateInput): Promise<SendResult> {
    console.info("[comm-notifications] WHATSAPP template", {
      to: normalizeWhatsAppTo(input.toPhoneE164),
      template: input.templateName,
      title: input.title,
    });
    return { costMinor: 0 };
  }
}

export class MetaCloudWhatsAppProvider implements WhatsAppProvider {
  async sendTemplate(input: SendWhatsAppTemplateInput): Promise<SendResult> {
    const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
    if (!token) {
      throw new Error("WHATSAPP_TOKEN_MISSING");
    }

    const to = normalizeWhatsAppTo(input.toPhoneE164);
    const bodyText = input.body.replace(/\s+/g, " ").trim().slice(0, 900);
    const titleText = input.title.replace(/\s+/g, " ").trim().slice(0, 200);

    const url = `https://graph.facebook.com/v21.0/${input.phoneNumberId}/messages`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: input.templateName,
          language: { code: input.templateLanguage },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: titleText },
                { type: "text", text: bodyText },
              ],
            },
          ],
        },
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`WHATSAPP_SEND_FAILED:${response.status}:${detail.slice(0, 200)}`);
    }

    return { costMinor: 0 };
  }
}

export function createWhatsAppProvider(): WhatsAppProvider {
  if (process.env.WHATSAPP_ACCESS_TOKEN?.trim()) {
    return new MetaCloudWhatsAppProvider();
  }
  return new ConsoleWhatsAppProvider();
}
