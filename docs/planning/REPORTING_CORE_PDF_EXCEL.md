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

## Sonraki

- Parametreli rapor tanımları (FAZ 2)
- PDF’de gerçek kolon hizalama / Türkçe font
