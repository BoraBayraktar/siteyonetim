# Online Ödeme — FAZ 2 MVP Planı

**Referans:** [DEVELOPMENT_RULES.md](../../DEVELOPMENT_RULES.md), [FAZ1_APARTMAN_PLAN.md](./FAZ1_APARTMAN_PLAN.md)  
**Durum:** Plan — implementasyon yok (`payments-gateway` modülü henüz oluşturulmadı)  
**Son güncelleme:** 2026-08-08

---

## 1. Stratejik hedef

Malik/kiracının **portal üzerinden** açık aidat borcunu **kart ile** (3D Secure) ödemesi; tahsilatın otomatik olarak mevcut finans çekirdeğine (`Payment`, borç mahsup, kasa) **`PaymentChannel.ONLINE`** kanalıyla işlenmesi.

**Bu özellik banka ekstresi entegrasyonu değildir.** Repodaki `finance-banking` (CSV/webhook/REST poll) zaten **havale/EFT sonrası mutabakat** içindir. Online ödeme = **PSP (Payment Service Provider / ödeme kuruluşu)** entegrasyonudur.

---

## 2. Repodaki mevcut durum

| Parça | Durum |
|-------|--------|
| `PaymentChannel` enum (`MANUAL`, `ONLINE`, `BANK`) | Var |
| `Payment.channel` | Var; tahsilat kayıtlarında kullanılabilir |
| `PropertyPortalSettings.allowOnlinePayment` | Var (varsayılan `false`); admin toggle mevcut |
| `finance-dues.recordPayment()` | Var — **yalnızca manuel admin akışı** |
| `payments-gateway` modülü | **Yok** (FAZ 1 planında kanca) |
| Portal “Öde” UI | **Yok** |
| Webhook / callback route | **Yok** |

**Mevcut manuel tahsilat akışı** (`recordPayment`): tutar → açık borç satırlarına otomatik mahsup → kasa hareketi → audit. Online ödeme MVP’si bu servisi **yeniden yazmadan**, PSP onayı sonrası `channel: ONLINE` ile çağırmalıdır.

---

## 3. MVP kapsamı

### 3.1 Dahil (MVP)

- **Tek PSP adapter** (öneri: **iyzico Checkout Form** — bkz. §6)
- **Portal:** açık borç listesinde “Öde” butonu (`allowOnlinePayment === true`)
- **Ödeme türü:** yalnızca **tek seferlik, tam veya kısmi tutar** (malik borç satırlarından seçim veya “toplam açık borç”)
- **3D Secure:** zorunlu (PSP varsayılanı)
- **Taksit:** MVP dışı (tek çekim); FAZ 2.1
- **Webhook + idempotency:** aynı PSP referansı iki kez tahsilat oluşturamaz
- **Başarı / hata sayfaları** portal içinde (i18n `tr.json` / `en.json`)
- **Admin:** site bazında PSP profili (API key / secret — şifreli veya secret store); `allowOnlinePayment` toggle’ı zaten var
- **Audit:** `payment.online.initiated`, `payment.online.succeeded`, `payment.online.failed`
- **Sandbox test** ortamı ile uçtan uca smoke

### 3.2 MVP dışı (sonraki iterasyonlar)

| Özellik | Not |
|---------|-----|
| İkinci PSP (PayTR vb.) | Adapter arayüzü hazırlanır; MVP’de tek implementasyon |
| Taksit | Site yönetimi + PSP sözleşmesi gerekir |
| Kayıtlı kart / abonelik | PCI kapsamı genişler |
| Pazaryeri / alt üye işyeri (her site ayrı merchant) | iyzico sub-merchant; karmaşıklık yüksek |
| Komisyonu malike yansıtma (surcharge) | Ürün + yasal inceleme |
| Otomatik iade (chargeback flow) | Manuel admin iade yeterli MVP |
| `PaymentChannel.BANK` otomasyonu | Zaten ayrı modül (`finance-banking`) |
| Native mobil SDK | FAZ 2 ayrı kalem |

---

## 4. Mimari (modüler monolith)

```
Malik portal (/portal)
  → Server Action veya API: createCheckoutSession(partyId, unitId, amount, lineIds?)
  → @siteyonetim/payments-gateway (Service)
       → PSP adapter: createCheckout / initialize
       → DB: PaymentIntent (PENDING)
  → Redirect / iframe: PSP hosted ödeme sayfası
  → 3D Secure
  → PSP webhook → POST /api/payments/webhook/[provider]
       → signature verify
       → PaymentIntent → SUCCEEDED | FAILED
       → finance-dues.recordPayment({ channel: ONLINE, ... })
       → comm-notifications: makbuz e-postası (opsiyonel MVP+)
```

### 4.1 Yeni modül: `@siteyonetim/payments-gateway`

| Katman | Sorumluluk |
|--------|------------|
| `contract.ts` | `PaymentGatewayContract`, DTO’lar, hata kodları |
| `repository.ts` | `PaymentIntent`, `PropertyPaymentProfile` Prisma erişimi |
| `service.ts` | Oturum oluşturma, webhook işleme, idempotency |
| `adapters/iyzico.ts` | iyzico Checkout Form + webhook parse |
| `adapters/paytr.ts` | (FAZ 2.1) iframe token + postback |

**Cross-module kural:** Web route yalnızca `payments-gateway` servisini çağırır; tahsilat için **`finance-dues.recordPayment`** kullanılır (doğrudan Prisma yok).

### 4.2 Veri modeli (önerilen migration)

```prisma
enum PaymentIntentStatus {
  PENDING
  PROCESSING
  SUCCEEDED
  FAILED
  CANCELLED
  EXPIRED
}

model PropertyPaymentProfile {
  id             String   @id @default(cuid())
  organizationId String
  propertyId     String   @unique
  provider       PaymentProvider  // IYZICO | PAYTR
  enabled        Boolean  @default(false)
  merchantId     String?  // PSP merchant / api key (public)
  secretEnc      String?  // şifreli secret (server-only)
  sandbox        Boolean  @default(true)
  defaultCashboxId String? // ONLINE tahsilatın düşeceği kasa
  // soft delete alanları
}

model PaymentIntent {
  id               String   @id @default(cuid())
  organizationId   String
  propertyId       String
  partyId          String
  unitId           String?
  provider         PaymentProvider
  status           PaymentIntentStatus @default(PENDING)
  amount           Decimal
  currency         String   @default("TRY")
  providerRef      String?  // conversationId / merchant_oid
  idempotencyKey   String   @unique
  paymentId        String?  @unique // başarılı olunca Payment FK
  metadata         Json?    // seçilen dueAccrualLineId’ler
  expiresAt        DateTime?
  // audit timestamps, soft delete
}
```

`Payment` tablosuna (MVP):

- `externalReference String?` — PSP işlem no
- `paymentIntentId String? @unique`

`RecordPaymentInput` genişletmesi:

- `channel?: PaymentChannel` (varsayılan `MANUAL`)
- `paymentIntentId?: string | null` — webhook tarafından set edilir

### 4.3 Portal güvenlik

- Oturum: mevcut portal auth (`portal` / unit credential)
- Malik yalnızca **kendi `partyId` / unit** borcunu ödeyebilir
- Tutar sunucuda yeniden hesaplanır (client’tan gelen tutara güvenilmez)
- Webhook: HMAC / IP allowlist + idempotency key

---

## 5. Malik deneyimi (MVP akış)

1. Portal → “Açık borçlarım” (mevcut `PortalOpenDebtSection`)
2. `allowOnlinePayment` açıksa **“Kart ile öde”** görünür
3. Tutar: varsayılan = toplam açık borç; gelişmiş seçim FAZ 2.1
4. Yönlendirme → iyzico hosted checkout (kart bilgisi **bizim DB’ye girmez** — PCI scope düşük)
5. Başarı → portal “Ödemeniz alındı” + ekstre güncellenir (birkaç saniye gecikme webhook’a bağlı)
6. Başarısız → hata kodu i18n

---

## 6. PSP karşılaştırması: iyzico vs PayTR

> Komisyon oranları **sözleşmeye göre değişir**; tablodaki yüzdeler piyasa/blog referanslarıdır (2026 civarı). Canlı teklif alınmadan bütçe planlaması yapılmamalıdır.

| Kriter | **iyzico** | **PayTR** |
|--------|------------|-----------|
| **Lisans** | Ödeme kuruluşu (TCMB) | Ödeme kuruluşu (TCMB) |
| **Entegrasyon** | Checkout Form (hosted) + Direct API | iframe token + Direct API (HMAC POST) |
| **Resmi Node paketi** | `iyzipay` (aktif) | Resmi npm yok |
| **TypeScript / monorepo uyumu** | Orta (JS SDK + kendi tipler) | Orta (community paketleri; resmi değil) |
| **Sandbox** | Ayrı sandbox API, test kartları | `test_mode=1` ile canlı endpoint |
| **Webhook** | IPN, retry (~3 deneme) | Postback (Bildirim URL); **asıl sonuç webhook’ta** — redirect’e güvenilmez |
| **3D Secure** | Standart | Standart |
| **Taksit** | Geniş banka ağı | Geniş banka ağı |
| **Pazaryeri / sub-merchant** | Güçlü (ileride çok-site modeli) | Daha sınırlı |
| **Dokümantasyon** | Güçlü, REST odaklı | Yeterli; dağınık bölümler |
| **Onay süresi (tahmini)** | ~3–5 iş günü | ~5–10 iş günü |
| **Tipik komisyon (tek çekim, referans)** | ~%2,4–2,9 + sabit (ör. 0,25 TL) | ~%2,5–3,0 + sabit; hacimle düşer |
| **Para aktarım (valör)** | Genelde T+1 | T+1 (T+0 premium) |
| **Site yönetimi use-case** | Uygun | Uygun |

### 6.1 Bu proje için öneri

| Seçim | Gerekçe |
|-------|---------|
| **MVP: iyzico Checkout Form** | Resmi Node SDK, ayrı sandbox, webhook modeli TypeScript monolith ile uyumlu, DEVELOPMENT_RULES’a uygun adapter katmanı hızlı kurulur |
| **FAZ 2.1: PayTR adapter** | Maliyet hassas müşteriler için ikinci provider; aynı `PaymentGatewayContract` |

**Craftgate** gibi aggregator’lar ileride değerlendirilebilir (tek API → çok POS); MVP kapsamını şişirmemek için FAZ 2.2.

---

## 7. Maliyet modeli

### 7.1 Kim ne öder?

| Maliyet | Tipik yükümlü | Not |
|---------|---------------|-----|
| PSP komisyonu (% + sabit) | Site yönetimi (merchant) | Aidattan kesilmez; muhasebe gideri |
| İade/chargeback | Merchant | Nadir; MVP’de manuel |
| PSP kurulum / aylık | Çoğu senaryoda 0 TL (ciro eşiğine bağlı) | Sözleşmeye bakın |
| Platform (siteyonetim SaaS) | İsteğe bağlı — **bu planda yok** | İleride “online tahsilat başına X kuruş” eklenebilir |

### 7.2 Örnek hesap (illustratif)

100.000 TL/ay aidat tahsilatı, %2,5 komisyon → **~2.500 TL/ay** PSP maliyeti (KDV hariç). 500 TL ortalama ödeme → 200 işlem/ay.

### 7.3 Banka entegrasyonu maliyeti

Ekstre CSV/webhook (**mevcut `finance-banking`**) genelde **ek POS komisyonu gerektirmez**; banka kurumsal API ayrı anlaşma olabilir. Online kart tahsilatı için **banka API şart değil**.

---

## 8. Uygulama fazları

### Faz 2.0 — MVP (tahmini 2–3 hafta)

1. Prisma: `PropertyPaymentProfile`, `PaymentIntent`, `Payment` alan genişletmesi
2. `packages/modules/payments-gateway` iskelet + iyzico adapter
3. Admin UI: PSP profili (Tesisat veya Finans ayarları altında)
4. Portal: ödeme başlat + return URL’ler
5. `POST /api/payments/webhook/iyzico` — imza, idempotency, `recordPayment(ONLINE)`
6. i18n + audit + unit test (webhook parse, idempotency)
7. Sandbox smoke checklist

### Faz 2.1 — Genişleme

- PayTR adapter
- Taksit (site bazında açık/kapalı)
- Kısmi borç satırı seçimi
- Makbuz e-postası (`comm-notifications`)

### Faz 2.2 — Platform

- Craftgate veya çoklu PSP yönlendirme
- Org bazında merchant (yönetim firması tek sözleşme, sitelere dağıtım)
- Komisyon raporu

---

## 9. Test planı (MVP)

- [ ] Sandbox: başarılı ödeme → `PaymentIntent.SUCCEEDED` + `Payment.channel=ONLINE` + borç kapanır
- [ ] Sandbox: başarısız / iptal → intent `FAILED`, tahsilat yok
- [ ] Aynı webhook iki kez → tek `Payment`
- [ ] `allowOnlinePayment=false` → portalda buton yok
- [ ] Başka malikin borcunu ödeme denemesi → reddedilir
- [ ] Kapalı mali dönemde online tahsilat (karar: reddet veya izin ver — **öneri: admin ile aynı kural**)
- [ ] Production: gerçek merchant + düşük tutarlı canlı smoke

---

## 10. Riskler ve kararlar

| Konu | Öneri |
|------|--------|
| Merchant kimliği | MVP: **site (property) başına** profil; yönetim firması org altında her site kendi iyzico hesabı veya tek hesap + açıklama alanı |
| PCI | Hosted checkout; kart PAN/CVV backend’e gelmez |
| Webhook gecikmesi | Portal success sayfası “onay bekleniyor” + polling veya kısa süre sonra yenile |
| PSP reddi (sektör) | “Site yönetimi / aidat” genelde kabul edilir; sözleşme öncesi PSP’ye sor |
| `recordPayment` `channel` | Repository `recordPaymentTx` içinde `Payment.channel` set edilmeli |

---

## 11. Bağımlılıklar

- Çalışan portal borç görünümü (`PortalOpenDebtSection`, `listOpenLinesForPortal`)
- En az bir **açık kasa** (`Cashbox`) — profilde `defaultCashboxId`
- Production: `APP_URL` (return URL), HTTPS, webhook URL’si PSP paneline kayıtlı
- Opsiyonel: Redis ile intent durumu cache (TTL); DB canonical yeterli MVP

---

## 12. Sonraki adım

1. Bu planda onay / merchant modeli kararı (site başına vs org başına)
2. iyzico sandbox merchant başvurusu
3. Faz 2.0 implementasyon branch’i: `payments-gateway` + migration

Plan revizyonları bu dosyada tutulur.
