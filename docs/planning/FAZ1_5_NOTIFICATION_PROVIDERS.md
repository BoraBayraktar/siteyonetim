# FAZ 1.5 — SMS / e-posta sağlayıcıları

Modül: `@siteyonetim/comm-notifications` (`email-providers.ts`, `sms-providers.ts`)

## E-posta

| Sağlayıcı | Ortam | Not |
|-----------|--------|-----|
| Konsol | varsayılan | `EMAIL_*` / API key yok |
| Resend | `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, `EMAIL_FROM` | Vercel uyumlu |
| SendGrid | `EMAIL_PROVIDER=sendgrid`, `SENDGRID_API_KEY`, `EMAIL_FROM` | |

Otomatik seçim: `EMAIL_PROVIDER` yoksa önce SendGrid key, sonra Resend key kontrol edilir.

## SMS

| Sağlayıcı | Ortam | Not |
|-----------|--------|-----|
| Konsol | varsayılan | |
| Netgsm | `SMS_PROVIDER=netgsm`, `NETGSM_*` | TR |
| Twilio | `SMS_PROVIDER=twilio`, `TWILIO_*` | E.164 |

Telefon normalizasyonu: `05xx` → `905xx` (Netgsm/Twilio).

## Outbox

- Gönderim durumu, hata ve `costMinor` alanı mevcut outbox kaydında.
- `processPending` sağlayıcı hatalarını `lastError` olarak yazar.

## Rapor export bildirimi (2025-07-29)

- Export `READY` olunca `enqueueReportExportReady` → talep eden admin e-postası (yoksa org notifier).
- Cron: `/api/cron/report-exports` — 15 dk’da bir `processPendingExports` (Vercel `vercel.json`).

Bkz. `.env.example` ve `APP_URL` (indirme linkleri).
