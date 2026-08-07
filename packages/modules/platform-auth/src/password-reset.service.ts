import { createHash, randomBytes } from "node:crypto";

import bcrypt from "bcryptjs";
import { prisma } from "@siteyonetim/db";
import { createAuditService } from "@siteyonetim/platform-audit";
import { createEmailProvider, isRealEmailProviderConfigured } from "@siteyonetim/comm-notifications";

import type { PasswordResetResult, RequestPasswordResetInput, ResetPasswordInput } from "./contract";
import { PASSWORD_RESET_TTL_MS } from "./session";
import { isSuperAdminUser } from "./super-admin";
import { PasswordResetRepository } from "./password-reset.repository";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function buildResetEmailBody(params: {
  locale: string;
  name: string;
  resetUrl: string;
}): { subject: string; body: string } {
  if (params.locale === "tr") {
    return {
      subject: "Şifre sıfırlama bağlantınız",
      body: `Merhaba ${params.name},

Yönetici hesabınız için şifre sıfırlama talebi aldık. Bağlantı 1 saat geçerlidir:

${params.resetUrl}

Bu talebi siz yapmadıysanız bu e-postayı yok sayabilirsiniz.`,
    };
  }

  return {
    subject: "Your password reset link",
    body: `Hello ${params.name},

We received a password reset request for your admin account. This link expires in 1 hour:

${params.resetUrl}

If you did not request this, you can ignore this email.`,
  };
}

export class PasswordResetService {
  constructor(
    private readonly repository = new PasswordResetRepository(),
    private readonly audit = createAuditService(),
    private readonly emailProvider = createEmailProvider(),
  ) {}

  async requestPasswordReset(input: RequestPasswordResetInput): Promise<PasswordResetResult> {
    const email = input.email.trim().toLowerCase();
    if (!email) {
      return { ok: true };
    }

    const user = await this.repository.findAdminUserByEmail(email);
    if (!user) {
      return { ok: true };
    }

    const dbUser = await prisma.user.findFirst({
      where: { id: user.id, deleted: false },
      select: { isSuperAdmin: true, email: true },
    });
    if (isSuperAdminUser(dbUser)) {
      return { ok: true };
    }

    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

    await this.repository.invalidateActiveTokens(user.id);
    await this.repository.createToken(user.id, tokenHash, expiresAt);

    const resetUrl = `${input.appBaseUrl.replace(/\/$/, "")}/${input.locale}/login/reset-password?token=${rawToken}`;
    const message = buildResetEmailBody({
      locale: input.locale,
      name: user.name,
      resetUrl,
    });

    const emailConfigured = isRealEmailProviderConfigured();

    if (emailConfigured) {
      try {
        await this.emailProvider.send({
          to: user.email,
          subject: message.subject,
          body: message.body,
        });
      } catch (error) {
        console.error("[platform-auth] password reset email failed", error);
        return { ok: true };
      }
    } else if (process.env.NODE_ENV === "development") {
      console.info("[platform-auth] PASSWORD_RESET_DEV_LINK", {
        to: user.email,
        resetUrl,
      });
      await this.audit.record({
        organizationId: user.organizationId,
        userId: user.id,
        action: "auth.passwordReset.request",
        entityType: "PasswordResetToken",
        entityId: user.id,
        metadata: { email: user.email, delivery: "development_console" },
      });
      return { ok: true, devResetUrl: resetUrl };
    } else {
      console.error("[platform-auth] password reset skipped: EMAIL_NOT_CONFIGURED");
      return { ok: true };
    }

    await this.audit.record({
      organizationId: user.organizationId,
      userId: user.id,
      action: "auth.passwordReset.request",
      entityType: "PasswordResetToken",
      entityId: user.id,
      metadata: { email: user.email },
    });

    return { ok: true };
  }

  async resetPassword(input: ResetPasswordInput): Promise<PasswordResetResult> {
    const password = input.password.trim();
    if (password.length < 8) {
      throw new Error("PASSWORD_TOO_SHORT");
    }

    const tokenHash = hashToken(input.token.trim());
    const row = await this.repository.findValidToken(tokenHash);
    if (!row || !row.user.organizations[0]) {
      throw new Error("INVALID_RESET_TOKEN");
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await this.repository.updatePassword(row.userId, passwordHash);
    await this.repository.markTokenUsed(row.id);
    await this.repository.invalidateActiveTokens(row.userId, row.userId);

    await this.audit.record({
      organizationId: row.user.organizations[0].organizationId,
      userId: row.userId,
      action: "auth.passwordReset.complete",
      entityType: "User",
      entityId: row.userId,
    });

    return { ok: true };
  }
}

export function createPasswordResetService(): PasswordResetService {
  return new PasswordResetService();
}
