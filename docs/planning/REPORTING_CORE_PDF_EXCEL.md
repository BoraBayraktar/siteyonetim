# reporting-core — PDF / Excel export

Modül: `@siteyonetim/reporting-core`

## Sorumluluk

- Tablo raporu (`ReportTableDocument`: başlık, başlık satırı, satırlar, footer) → **CSV**, **XLSX**, **PDF** buffer
- MIME ve dosya uzantısı yardımcıları

## Bağımlılıklar

- `exceljs` — Excel
- `pdfkit` — PDF (metin tablosu, MVP düzeni)

## Kullanım

`@siteyonetim/reporting-standard`:

1. Veriyi toplar → `buildReportTableDocument`
2. `reportingCore.render(format, document)` ile dosya üretir
3. Async `ReportExport.format` alanı (`ReportExportFormat` enum) ile saklar

## UI

- Anlık: `/api/reports/export?format=csv|xlsx|pdf`
- Arka plan: rapor sekmesinde format seçimi + kuyruk + e-posta bildirimi (mevcut akış)

## Cache (FAZ A–B §4)

| Key pattern | TTL | Invalidation |
|-------------|-----|--------------|
| `report:annual:{orgId}:{propertyId}:{year}…` | 15 dk | `invalidatePropertyYearReports` |
| `report:collection-rate:{…}` | 15 dk | aynı |

Invalidation tetikleyicileri: `dues.payment.record`, `finance.ledger.create`, `finance.operatingBudget.save` (`platform-cache/report-cache.ts`).

## Sonraki

- Parametreli rapor tanımları (FAZ 2)

## Resmi çıktı düzeni (FAZ C4 — 2026-08-03)

- `official-pdf-layout.ts` — paylaşılan antet, numaralı madde, imza bloğu, sayfa numarası
- Denetçi PDF: `renderAuditorTemplatePdf` — Madde 1…N + yapılandırılmış imza blokları
- Tablo PDF: `renderPdfBuffer` — antet + hizalı tablo + sayfa numarası
- Noter/basılı süreç: [NOTARY_PRINT_GUIDE.md](./NOTARY_PRINT_GUIDE.md)
