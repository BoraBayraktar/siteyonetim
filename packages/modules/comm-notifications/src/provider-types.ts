export type SendEmailInput = {
  to: string;
  subject: string;
  body: string;
};

export type SendSmsInput = {
  to: string;
  body: string;
};

export type SendWhatsAppTemplateInput = {
  toPhoneE164: string;
  phoneNumberId: string;
  templateName: string;
  templateLanguage: string;
  title: string;
  body: string;
};

export type SendResult = {
  costMinor?: number;
};

export interface EmailProvider {
  send(input: SendEmailInput): Promise<SendResult>;
}

export interface SmsProvider {
  send(input: SendSmsInput): Promise<SendResult>;
}

export interface WhatsAppProvider {
  sendTemplate(input: SendWhatsAppTemplateInput): Promise<SendResult>;
}
