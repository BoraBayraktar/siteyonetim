# FAZ 1 — Apartman Yönetimi Geliştirme Planı

**Ürün konumu:** Property Management Platform (uzun vadede Site, Plaza, AVM vb.)  
**FAZ 1 kapsamı:** Tek apartman / apartman sitesi operasyonu — mali + idari çekirdek  
**Mimari:** Modüler monolith, multi-tenant SaaS, Contract → Repository → Service  
**Referans:** [DEVELOPMENT_RULES.md](../../DEVELOPMENT_RULES.md)

---

## 1. Stratejik hedef

FAZ 1’de piyasadaki “aidat programı” seviyesinde kalmadan, **genişlemeye hazır platform çekirdeği** kurulur. Apartmana özel ekranlar ve kurallar yazılır; veri modeli ve modül sınırları ileride `PropertyKind` (Site, Plaza, AVM …) eklenince **yeni modül yazmadan** konfigürasyon + domain extension ile büyümeye izin verir.

FAZ 1’de **bilinçli olarak implement edilmeyecek** (yalnızca arayüz/entegrasyon kancası):

| Özellik | Faz |
|--------|-----|
| Online ödeme | FAZ 2 |
| Arıza bildirimi (Incident/Ticket) | FAZ 2 |
| Mobil uygulama (native) | FAZ 2 |
| Banka entegrasyonu | FAZ 2 |
| BPM / Workflow | FAZ 3+ |
| CMDB / Asset | FAZ 3+ |
| AI önerileri | FAZ 4+ |

---

## 2. Kiracı (tenant) ve organizasyon modeli

Multi-tenant iki seviyede düşünülür:

1. **Platform tenant (`Organization`)** — Yönetim firması veya site yönetimi şirketi (SaaS abonesi).
2. **Property (`Property`)** — Yönetilen tesis; FAZ 1’de `kind = APARTMAN` (veya `APARTMAN_SITE`). İleride aynı org altında Plaza + Apartman birlikte yönetilebilir.

Her istek bağlamında: `organizationId` + (varsa) `propertyId` + kullanıcı rolü. Tüm servisler bu bağlamı zorunlu alır; cross-tenant veri sızıntısı repository seviyesinde filtrelenir.

---

## 3. Modül haritası (modüler monolith)

Modüller yalnızca **public service interface** üzerinden konuşur. UI ve API route’lar servis çağırır; Prisma yalnızca repository içinde.

### 3.1 Platform çekirdeği (FAZ 1 — zorunlu altyapı)

| Modül | Sorumluluk |
|-------|------------|
| `platform-auth` | Oturum, MFA hazırlığı, şifre politikası |
| `platform-rbac` | Rol, izin, property-scoped yetki |
| `platform-audit` | Merkezi audit (DEVELOPMENT_RULES §32) |
| `platform-i18n` | `tr.json` / `en.json` |
| `platform-cache` | Redis, event-driven invalidation |
| `platform-events` | Domain event bus (modüller arası gevşek bağ) |
| `platform-files` | Dosya metadata + object storage adapter (evrak) |
| `platform-jobs` | Zamanlanmış işler (tahakkuk, hatırlatma, rapor) |

### 3.2 Mülk / apartman domain (FAZ 1)

| Modül | Sorumluluk |
|-------|------------|
| `property-core` | Property, blok, kat, bağımsız bölüm (unit), ortak alan tanımı |
| `property-parties` | Malik, kiracı, vekil, yönetici; kişi/kurum |
| `property-occupancy` | Unit–party ilişkisi, dönem, ana malik / kiracı |
| `property-settings` | Aidat günü, para birimi, mali yıl, banka hesap bilgisi (gösterim; entegrasyon FAZ 2) |

**Genişleme kancası:** `PropertyKind` enum + `propertyKindConfig` (JSON schema veya key-value) — Plaza’da “dükkan”, OSB’de “parsel” gibi unit tipleri FAZ 2+’da enum/config ile gelir, çekirdek tablo yapısı değişmez.

### 3.3 Finans (FAZ 1 — tam kapsam)

| Modül | Sorumluluk |
|-------|------------|
| `finance-accounts` | Cari hesap planı, cari kart (malik/kiracı/tedarikçi) |
| `finance-cashbox` | Kasa tanımı, kasa hareketi, kasa transferi |
| `finance-ledger` | Gelir/gider fişi, masraf kalemi, belge no |
| `finance-dues` | Aidat tanımı, dönemsel tahakkuk, gecikme kuralı (tanım; uygulama FAZ 1) |
| `finance-debt` | Borç bakiye, yaşlandırma, unit/party bazlı ekstre |
| `finance-payments` | **Manuel** tahsilat/ödeme, mahsup, fiş ilişkisi (online kanal FAZ 2) |
| `finance-period` | Mali dönem kapatma, kilit (değişiklik engeli) |

**Muhasebe ilkesi (FAZ 1):** Tam ERP değil; site yönetimi pratiğine uygun **çift taraflı lite defter**: her tahsilat/tahakkuk auditlenebilir, cari ve kasa anlık güncellenir. İleride muhasebe paketi entegrasyonu için `ExternalLedgerExport` event’i tanımlanır (implementasyon yok).

### 3.4 İletişim (FAZ 1)

| Modül | Sorumluluk |
|-------|------------|
| `comm-announcements` | Duyuru, hedef kitle (tüm site / blok / unit listesi), okundu takibi (portal) |
| `comm-notifications` | SMS + e-posta orchestration, kuyruk, retry, provider adapter |
| `comm-templates` | Şablonlar (aidat hatırlatma, duyuru, borç uyarısı) |

FAZ 1’de tetikleyiciler: duyuru yayını, manuel toplu gönderim, tahakkuk sonrası opsiyonel hatırlatma job’ı. Workflow tetiklemesi FAZ 3.

### 3.5 Evrak (FAZ 1)

| Modül | Sorumluluk |
|-------|------------|
| `document-management` | Klasör, etiket, property/unit/party ilişkisi, yetki, versiyon metadata |

Dosya içeriği object storage’da; DB’de metadata + soft delete.

### 3.6 Raporlama (FAZ 1)

| Modül | Sorumluluk |
|-------|------------|
| `reporting-core` | Parametreli rapor tanımları, export (PDF/Excel), server-side aggregation |
| `reporting-standard` | Hazır set: aidat tahakkuk özeti, tahsilat, gider dağılımı, kasa özeti, cari ekstre, borç yaşlandırma |

Raporlar **servis + read model sorguları**; ağır raporlar job + bildirim ile.

### 3.7 Gelecek modüller (FAZ 1’de yalnızca sözleşme / boş adapter)

Kodda **interface + event isimleri**, implementasyon yok:

- `itsm-incidents` — Arıza bildirimi (FAZ 2)
- `workflow-engine` — Onay / süreç (FAZ 3)
- `cmdb-assets` — Demirbaş (FAZ 3)
- `payments-gateway` — Online ödeme (FAZ 2)
- `bank-integration` — Ekstre / otomatik eşleştirme (FAZ 2)

Bu sayede finans ve property modülleri FAZ 2’de “ticket kapandı → gider kaydı” gibi event’lere abone olabilir; FAZ 1’de bağımlılık oluşmaz.

---

## 4. Rol ve paneller

### 4.1 Roller (minimum FAZ 1)

| Rol | Panel | Tipik yetkiler |
|-----|--------|----------------|
| `ORG_ADMIN` | Yönetici | Org ayarları, tüm property’ler |
| `PROPERTY_MANAGER` | Yönetici | Seçili apartman tam mali + idari |
| `ACCOUNTANT` | Yönetici | Finans modülleri, rapor |
| `BOARD_MEMBER` | Yönetici (kısıtlı) | Rapor + duyuru okuma, onay FAZ 3 |
| `OWNER` | Malik/Kiracı portal | Kendi unit borç/ekstre, duyuru, evrak (paylaşılan) |
| `TENANT` | Malik/Kiracı portal | Kiracıya açılan alanlar |
| `STAFF` | Yönetici (opsiyonel FAZ 1 sonu) | Kısıtlı operasyon |

Yetkiler **property scope** ile birlikte değerlendirilir (`propertyId` claim).

### 4.2 UI uygulamaları

- **Admin app (`apps/admin` veya route group `/admin`):** Responsive web — yönetici paneli (DEVELOPMENT_RULES §9).
- **Portal app (`/portal`):** Malik/kiracı — borç, duyuru, evrak indirme.
- FAZ 2: React Native / Expo veya PWA derinlemesi; FAZ 1 portal mobil uyumlu web.

---

## 5. FAZ 1 fonksiyonel kapsam detayı

### 5.1 Aidat tahakkuku

- Aidat kalemi tanımı (sabit, m² bazlı, karma formül FAZ 1’de: sabit + m² yeterli).
- Dönem (ay/yıl) açma, toplu tahakkuk job’ı.
- Unit bazında borç satırı; iptal/düzeltme audit’li.
- Gecikme faizi/zam: kural tanımı + aylık uygulama job’ı (basit oran).

### 5.2 Gelir / gider, kasa, cari, borç

- Gider: tedarikçi cari + kasa/banka (manuel banka hareketi) çıkışı.
- Gelir: aidat dışı gelir kalemleri.
- Kasa sayımı / gün sonu (opsiyonel FAZ 1 MVP+).
- Cari ekstre: party + property filtreli.
- Borç takibi: unit ve party bazlı dashboard, yaşlandırma (0-30, 31-60 …).

### 5.3 SMS ve e-posta

- Provider adapter (Netgsm, Twilio, SendGrid, SMTP — en az bir SMS + bir e-posta).
- Log: gönderim durumu, hata, maliyet alanı (rapor için).
- KVKK: açık rıza alanı party üzerinde (iletişim izni).

### 5.4 Duyurular

- Rich text / ek dosya.
- Hedef: property geneli, blok, seçili unit’ler.
- Portalda liste + detay; kritik duyuru e-posta/SMS (yönetici onayı ile gönder).

### 5.5 Evrak yönetimi

- Yönetici: tüm evraklar; portal: “paylaşılan” ve unit’e özel.
- Kategoriler: sözleşme, karar defteri özeti, fatura kopyası vb.

### 5.6 Raporlama

- Admin’de rapor merkezi; filtre: dönem, property, blok.
- Export async; hazır olunca bildirim (e-posta link veya uygulama içi).

---

## 6. Veri modeli — çekirdek varlıklar (özet)

Prisma şeması FAZ 1 sprint’inde detaylandırılır; üst seviye:

- `Organization`, `User`, `UserOrganization`, `Role`, `Permission`, `UserPropertyRole`
- `Property` (`kind`, `name`, `address`, `settings`)
- `Block`, `Unit` (`unitType`, `area`, `share` aidat payı için)
- `Party`, `PartyContact`, `Occupancy` (`startDate`, `endDate`, `role: OWNER|TENANT`)
- `FinanceAccount`, `PartyAccount` (cari bağlantı)
- `Cashbox`, `CashboxMovement`
- `LedgerEntry`, `LedgerLine`
- `DueDefinition`, `DueAccrual`, `DueAccrualLine`
- `Payment`, `PaymentAllocation`
- `Announcement`, `AnnouncementTarget`, `AnnouncementRead`
- `Document`, `DocumentLink`
- `Notification`, `NotificationTemplate`, `OutboxMessage`
- `AuditLog` (merkezi)
- Tüm iş tablolarında: `deleted`, `deletedDate`, `deletedUserId`

**Index stratejisi:** `(organizationId, propertyId, …)` composite; borç sorguları için `(unitId, period)`; soft delete partial index pattern.

---

## 7. Teknoloji yığını (önerilen, kurallarla uyumlu)

| Katman | Seçim |
|--------|--------|
| Runtime | Node.js LTS |
| Dil | TypeScript |
| Web | Next.js (App Router), server components + API routes → services |
| ORM | Prisma + PostgreSQL |
| Cache | Redis |
| Queue | BullMQ veya benzeri (notification, tahakkuk, export) |
| Storage | S3 uyumlu object storage |
| Auth | Session/JWT + httpOnly cookie; ileride SSO hook |

Monorepo önerisi: `apps/web`, `packages/modules/*`, `packages/shared-contracts`, `packages/db`.

---

## 8. FAZ 1 içi teslimat fazları (önerilen sıra)

Her faz sonunda **çalışan dikey dilim** (deploy edilebilir).

### Faz 1.0 — Platform iskelet (2–3 hafta)

- Repo yapısı, modül şablonu (contract/repo/service)
- Auth, RBAC, audit, i18n iskelet
- Organization + Property (APARTMAN) CRUD
- Admin shell + boş portal shell, responsive layout

**Çıktı:** Yönetici giriş yapar, apartman ve blok/daire tanımlar.

### Faz 1.1 — Partiler ve occupancy (1–2 hafta)

- Malik/kiracı kartları, unit atama, dönem
- Portal kullanıcı daveti (OWNER/TENANT)

**Çıktı:** Her daire için malik/kiracı görünür; portal girişi.

### Faz 1.2 — Finans çekirdeği (3–4 hafta)

- Cari, kasa, gelir/gider fişleri
- Mali dönem

**Çıktı:** Gider girilebilir, kasa hareketleri izlenir.

### Faz 1.3 — Aidat ve borç (2–3 hafta)

- Aidat tanımı, toplu tahakkuk, manuel tahsilat + mahsup
- Borç dashboard + ekstre (admin + portal)

**Çıktı:** Aylık aidat döngüsü uçtan uca.

### Faz 1.4 — İletişim ve evrak (2 hafta)

- Duyurular + SMS/e-posta
- Evrak yükleme ve portal paylaşımı

**Çıktı:** Duyuru + hatırlatma kanıtlanabilir.

### Faz 1.5 — Raporlama ve sertleştirme (2 hafta)

- Standart rapor seti, export
- Performans (N+1), pagination, cache hot read’ler
- Güvenlik testi, tenant izolasyonu review

**Çıktı:** FAZ 1 MVP production adayı.

Toplam kabaca **12–16 hafta** (ekip büyüklüğüne göre); paralel iş ile kısaltılabilir.

---

## 9. FAZ 2 hazırlık checklist (FAZ 1 kodunda yapılacaklar)

- [ ] `PaymentChannel` enum: `MANUAL` (FAZ 1), `ONLINE`, `BANK` (reserved)
- [ ] `IncidentReport` tablosu **yok**; `platform-events` içinde `incident.created` event adı dokümante
- [ ] Portal API’leri mobil client tüketimine uygun (REST veya tRPC + OpenAPI)
- [ ] Banka hareketi import için `BankStatementLine` stub migration **yapma** — yalnızca ADR notu
- [ ] Unit test: tenant izolasyonu property servislerinde

---

## 10. Kalite ve operasyon

- **Test:** Servis katmanı integration test (PostgreSQL test container); kritik finans senaryoları (tahakkuk → tahsilat → bakiye).
- **Observability:** Yapılandırılmış log, correlation id, audit ile birleşik iz.
- **Migration:** `prisma migrate dev`; production’da data loss kabul edilmez (DEVELOPMENT_RULES §28).
- **Güvenlik:** OWASP ASVS lite, dosya upload tür/boyut, rate limit (login, SMS).

---

## 11. Başarı ölçütleri (FAZ 1)

1. Tek apartmanda 200+ unit ile tahakkuk job’ı makul sürede tamamlanır.
2. Malik portalından borç ve son 12 ay ekstre görüntülenir.
3. Tüm finans hareketleri audit ve soft delete ile geri izlenebilir.
4. Yeni `PropertyKind` eklemek için FAZ 1 finans modüllerinde breaking change gerekmez (sadece config/UI).
5. DEVELOPMENT_RULES ihlali yok (UI→DB yok, mock data yok, merkezi audit, Redis pattern).

---

## 12. Sonraki adım

1. Bu planda onay / öncelik değişikliği.
2. `packages/db` Prisma şeması: Faz 1.0 varlıkları.
3. Modül iskeleti generator veya ilk modül (`property-core`) referans implementasyonu.

Plan revizyonları bu dosyada versiyon notu ile tutulur.
