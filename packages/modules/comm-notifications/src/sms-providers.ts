import type { SendResult, SendSmsInput, SmsProvider } from "./provider-types";

function normalizeSmsPhone(to: string): string {
  const digits = to.replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 11) {
    return `90${digits.slice(1)}`;
  }
  if (digits.length === 10 && digits.startsWith("5")) {
    return `90${digits}`;
  }
  return digits;
}

export class ConsoleSmsProvider implements SmsProvider {
  async send(input: SendSmsInput): Promise<SendResult> {
    console.info("[comm-notifications] SMS", { to: input.to, bodyLength: input.body.length });
    return { costMinor: 0 };
  }
}

export class TwilioSmsProvider implements SmsProvider {
  async send(input: SendSmsInput): Promise<SendResult> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
    const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
    const from = process.env.TWILIO_SMS_FROM?.trim();
    if (!accountSid || !authToken || !from) {
      throw new Error("SMS_NOT_CONFIGURED");
    }

    const to = normalizeSmsPhone(input.to);
    const e164 = to.startsWith("+") ? to : `+${to}`;
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const body = new URLSearchParams({
      To: e164,
      From: from,
      Body: input.body.slice(0, 1600),
    });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`SMS_SEND_FAILED:${response.status}:${detail.slice(0, 200)}`);
    }

    return { costMinor: 0 };
  }
}

export class NetgsmSmsProvider implements SmsProvider {
  async send(input: SendSmsInput): Promise<SendResult> {
    const usercode = process.env.NETGSM_USERCODE?.trim();
    const password = process.env.NETGSM_PASSWORD?.trim();
    const msgheader = process.env.NETGSM_MSGHEADER?.trim();
    if (!usercode || !password || !msgheader) {
      throw new Error("SMS_NOT_CONFIGURED");
    }

    const no = normalizeSmsPhone(input.to);
    const response = await fetch("https://api.netgsm.com.tr/sms/send/json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        usercode,
        password,
        msgheader,
        messages: [{ msg: input.body.slice(0, 917), no }],
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`SMS_SEND_FAILED:${response.status}:${detail.slice(0, 200)}`);
    }

    const payload = (await response.json()) as { code?: string; description?: string };
    if (payload.code && payload.code !== "00") {
      throw new Error(`SMS_SEND_FAILED:${payload.code}:${payload.description ?? "NETGSM"}`);
    }

    return { costMinor: 0 };
  }
}

export function createSmsProvider(): SmsProvider {
  const kind = process.env.SMS_PROVIDER?.trim().toLowerCase();
  if (kind === "netgsm" || (!kind && process.env.NETGSM_USERCODE?.trim())) {
    if (
      process.env.NETGSM_USERCODE?.trim() &&
      process.env.NETGSM_PASSWORD?.trim() &&
      process.env.NETGSM_MSGHEADER?.trim()
    ) {
      return new NetgsmSmsProvider();
    }
  }
  if (kind === "twilio" || process.env.TWILIO_ACCOUNT_SID?.trim()) {
    if (
      process.env.TWILIO_ACCOUNT_SID?.trim() &&
      process.env.TWILIO_AUTH_TOKEN?.trim() &&
      process.env.TWILIO_SMS_FROM?.trim()
    ) {
      return new TwilioSmsProvider();
    }
  }
  return new ConsoleSmsProvider();
}
