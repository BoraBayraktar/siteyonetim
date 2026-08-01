# A → B → C: Gecikme, tesisat profili, sayaç (FAZ 1 genişlemesi)

Öncelik sırası (bağımlılık ve değer):

| Sıra | Paket | Amaç |
|------|--------|------|
| **A** | `finance-dues` | Gecikme politikası + aylık zam satırları (aidat borcuna bağlı) |
| **B** | `property-settings` | Isıtma / sıcak su tesisat profili + aidat modları: pay oranı, fatura paylaştırma |
| **C** | `property-meters` | Daire sayacı + dönem okuması → tüketim × birim fiyat tahakkuku |

## A — Gecikme faizi / zam

- `DueLateFeePolicy`: property başına aylık oran (%), grace gün, vade günü (ay içi).
- `DueAccrualLine.lineKind`: `STANDARD` | `LATE_FEE`; `sourceLineId` kaynak aidat satırı.
- `applyLateFees`: vadesi geçmiş açık **STANDARD** satırlarda kalan × (aylık % / 100); sistem `DueDefinition` ile aynı dönemde **LATE_FEE** satırı (audit).
- Yasal faiz / icra ayrı ürün kapsamı; FAZ 1’de **sözleşmede tanımlı basit aylık oran**.
- **Genişleme (2025-07-29):** `LateFeeRateKind` (`CONTRACTUAL` | `LEGAL_TCMB`), `LegalInterestRate` tablosu, `@siteyonetim/platform-jobs` + `POST /api/cron/late-fees`.
- **Genişleme (2025-07-29):** `DueDefinition.autoAccrualMonthly`, `DUE_ACCRUAL_MONTHLY` job, `/api/cron/due-accruals`, `apps/web/vercel.json` crons.

## B — Tesisat + manuel su/ısı payı

- `PropertyUtilityProfile`: `heatingSystem`, `hotWaterSystem`, not.
- Yeni `DueCalculationMode`:
  - `SHARE_RATIO` — sabit kalem × (daire payı / toplam pay).
  - `ALLOCATED_BILL` — tahakkuk formunda **toplam fatura**; pay veya m² ile dağıtım.
- Profil yönetimi: apartman detayında **Tesisat** sekmesi.

## C — Sayaç

- `UnitMeter` + `MeterReading` (dönem bazlı).
- `METER_CONSUMPTION` — tanımda `meterKind` + `ratePerM2` alanı **birim fiyat** olarak kullanılır.
- Tahakkuk: (bu ay okuma − önceki ay) × birim fiyat; okuma yoksa daire atlanır.

## Modül sınırları

- UI → servis; servis → repository; `finance-dues` sayaç verisi için yalnızca `property-meters` **servis contract** kullanır.
