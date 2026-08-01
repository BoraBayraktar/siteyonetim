# FAZ 1.6 — Rapor merkezi (MVP)

Modül: `@siteyonetim/reporting-standard`

## Kapsam

- Admin: `/admin/properties/[propertyId]/reports`
- Filtreler: yıl, ay, blok (opsiyonel)
- Raporlar: tahakkuk özeti, tahsilat, gider dağılımı, kasa özeti, borç yaşlandırma
- CSV: `GET /api/reports/export` (oturum gerekli)

## Sonraki (FAZ 1.5+)

- ~~`reporting-core`: parametreli tanımlar, PDF/Excel~~ → MVP: `@siteyonetim/reporting-core` CSV/XLSX/PDF (2025-07-29)
- Parametreli rapor tanımları (FAZ 2)

## Async CSV export (2025-07-29)

- `ReportExport` tablosu; `requestReportExport` + `processReportExport` (Next.js `after()`)
- İndirme: `/api/reports/exports/[id]/download`
- Hazır olunca e-posta: `comm-notifications` `ReportExportReady` outbox
- Cron: `/api/cron/report-exports` (15 dk, bekleyen export’ları işler)

## Tahakkuk taslak hatırlatması (2025-07-29)

- Job: `ACCRUAL_DRAFT_REMINDER` — DRAFT tahakkuku olan sitelerde org admin/muhasebe/yönetici e-postası (outbox)
- Cron: `/api/cron/accrual-reminders` (ayın 2’si, tahakkuk job’ından sonra)
- `APP_URL` ile aidat ekranı linki
