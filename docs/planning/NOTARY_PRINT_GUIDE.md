# Noter / basılı çıktı rehberi

Bu belge, Site Yönetimi platformundaki **resmi PDF çıktılarının** basılı kullanım ve noter süreçleri için operasyonel notlarını içerir. Hukuki bağlayıcılık için **hukuk danışmanlığı onayı** zorunludur.

## Kapsam

Platform aşağıdaki belgeleri **basılı çıktıya uygun** resmi düzenle üretir:

| Belge | Modül | PDF renderer |
|-------|--------|--------------|
| Denetçi raporu | `reporting-standard` | `renderAuditorTemplatePdf` |
| Tablo raporları (gelir-gider, mutabakat vb.) | `reporting-standard` | `renderPdfBuffer` |
| Hazirun cetveli | `property-governance` | `renderPdfBuffer` |

## Resmi düzen bileşenleri (FAZ C4)

Tüm resmi PDF'ler `@siteyonetim/reporting-core` içindeki `official-pdf-layout.ts` üzerinden:

1. **Antet** — organizasyon adı, apartman adı, adres, belge başlığı, dönem/referans, hukuki uyarı satırı
2. **Numaralı maddeler** — denetçi raporunda `Madde 1`, `Madde 2`, … (EN: `Article 1`, …)
3. **İmza blokları** — rol, ad-soyad satırı, tarih satırı
4. **Sayfa numarası** — `Sayfa 1 / N` (basılı arşiv ve noter dosyası için)

## Özelleştirilmiş antet (C4+)

Admin → **Rapor merkezi** → **Resmi rapor anteti** panelinden apartman bazında:

| Alan | PDF etkisi |
|------|------------|
| Alt başlık satırı | Antet alt satırı (varsayılan: adres) |
| Referans öneki (TR/EN) | `Ref: …` satırı |
| Hukuki uyarı (TR/EN) | Antet altındaki gri uyarı metni |

Veri: `PropertyReportLetterheadProfile` (`property-settings` modülü). Boş alanlar sistem varsayılanını kullanır.

## Operasyonel akış (öneri)

1. Sistemden PDF indirilir veya onaylı denetçi raporu arşivlenir.
2. Yönetici çıktıyı gözden geçirir; gerekirse hukuk danışmanına iletir.
3. Islak imza toplanır (denetçi / yönetim kurulu).
4. Noter tasdiki veya genel kurul defterine yapıştırma süreci **site yönetiminin** yerel uygulamasına göre yürütülür.

> Platform noter entegrasyonu veya e-tebligat **kapsam dışıdır** (FAZ 1 planı).

## Font ve baskı

- PDF: **Noto Sans** gömülü font (`packages/modules/reporting-core/assets/fonts/` veya `apps/web/public/fonts/`)
- Kağıt: A4, kenar boşluğu 48 pt
- Renkli baskı gerekmez; antet çizgisi ve tablo kenarlıkları gri ton

## Sorumluluk sınırı

Çıktılar **sistem taslağı** niteliğindedir. Antet metni, madde numaralandırması ve imza alanları hukuk danışmanlığı ile özelleştirilebilir; platform varsayılan metinleri bağlayıcı hukuki görüş değildir.
