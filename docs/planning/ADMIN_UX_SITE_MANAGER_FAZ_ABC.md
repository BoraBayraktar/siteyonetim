# Site Yöneticisi UX — FAZ A / B / C Geliştirme Planı

**Referans:** [DEVELOPMENT_RULES.md](../../DEVELOPMENT_RULES.md)  
**Bağlam:** Admin paneli menü dağılımı, form anlaşılırlığı ve ilk kez kullanan site yöneticisi için kullanım kolaylığı  
**Hedef kullanıcı:** `PROPERTY_MANAGER`, `ORG_ADMIN` (günlük operasyon); `ACCOUNTANT` (tam mali menü)  
**Mevcut durum:** Mali işlevler tam; bilgi mimarisi muhasebe odaklı; kurulum checklist ve borçlandırma uyarıları mevcut

---

## 1. Stratejik hedef

Site yöneticisinin (apartman yöneticisi) **Excel / kağıt defterden geçişini** hızlandırmak; mali işlemleri doğru sırada yapmasını sağlamak; jargonu sade Türkçe ile değiştirmek.

**Yazılımın rolü:** İş kurallarını değiştirmek değil; **navigasyon, terminoloji, rehberlik ve rol bazlı görünürlük** ile aynı modüler monolith’i site yöneticisi diline çevirmek.

**Bilinçli kapsam dışı (FAZ C sonrası / ayrı program):**

| Konu | Neden |
|------|--------|
| Native mobil uygulama | [FAZ1_APARTMAN_PLAN.md](./FAZ1_APARTMAN_PLAN.md) — FAZ 2 |
| Video hosting / LMS | Üçüncü parti; plan yalnızca harici link kancası |
| AI sohbet asistanı | FAZ 4+ |
| Tam ERP terminoloji eşlemesi (mizan, yevmiye) | Lite defter ilkesi korunur |

---

## 2. Mimari ilkeler (DEVELOPMENT_RULES uyumu)

| Kural | Uygulama |
|-------|----------|
| §1 Contract → Repository → Service | Yeni aggregate veriler (aylık görevler, onboarding durumu) service’te |
| §14 UI’da iş kuralı yok | “Bu ay borçlandırılmadı” kararı service’te; UI yalnızca DTO render |
| §15 API route → service | Yeni action’lar mevcut server action pattern’i |
| §4 i18n | Tüm etiket, tooltip, rehber metinleri yalnızca `tr.json` / `en.json` |
| §7 Mock yasak | Görev listesi, checklist, onboarding adımları DB / mevcut servislerden |
| §9 Responsive | Menü, sekme çubuğu, onboarding sheet — mobile-first |
| §10 shadcn/ui | `Tabs`, `Tooltip`, `Sheet`, `Dialog`, `Card`, `Badge`, `Alert` |
| §16 Redis | Aylık görev özeti cache (property + yıl/ay); `propertySetupStatus` invalidation event’leri ile |
| §19 Tablolar | Mevcut server-side pagination korunur; yeni tablo yok (FAZ A) |
| §32 Audit | Onboarding tamamlama, basit mod aç/kapa, rol menü tercihi — audit |
| §3 Mevcut pattern | `PropertySetupChecklist`, `AccrualContextAlerts`, `admin-nav-capabilities` genişletilir |

**Modüller arası iletişim:**

```
apps/web (UI, actions, i18n)
    ↓
reporting-standard          platform-auth (FAZ B — kullanıcı UI tercihi)
    ↓                              ↓
finance-dues, finance-core   UserUiPreference (soft delete)
property-core, property-meters
platform-rbac (menü yetenekleri)
```

- **Cross-module repository erişimi yasak.** `reporting-standard` yalnızca public service çağırır (`finance-dues`, `property-core`, `property-meters` vb.).
- **FAZ A** ağırlıklı UI + i18n; yeni DB tablosu yok.
- **FAZ B** `UserUiPreference` + aylık görev aggregate.
- **FAZ C** `Property.uiMode` veya `property-settings` üzerinden basit mod + akıllı varsayılanlar.

---

## 3. Mevcut envanter (değiştirilmeyecek temel)

| Bileşen | Konum |
|---------|--------|
| Admin sidebar | `apps/web/src/components/admin-sidebar.tsx` |
| Nav yetenekleri | `apps/web/src/lib/admin-nav-capabilities.ts` |
| Mali sekme hub | `apps/web/src/components/dues-tabs.tsx`, `finance-tabs.tsx` |
| Kurulum checklist | `apps/web/src/components/property-setup-checklist.tsx` |
| Borçlandırma uyarıları | `apps/web/src/components/accrual-context-alerts.tsx` |
| Kurulum durumu service | `reporting-standard` → `propertySetupStatus()` |
| Dashboard KPI | `property-dashboard-panel.tsx` |
| Borçlandırma sihirbazı | `due-definition-wizard.tsx` |
| i18n | `apps/web/src/messages/tr.json`, `en.json` |

---

## FAZ A — Hızlı kazanımlar (terminoloji + navigasyon)

**Hedef:** Kod davranışını değiştirmeden site yöneticisi diline geçiş; “neredeyim?” hissi; form ipuçları.  
**Tahmini süre:** 1–1,5 hafta  
**Bağımlılık:** Yok

### A1 — Menü etiketlerini sadeleştir (i18n)

| Alan | Detay |
|------|--------|
| **Katman** | UI / i18n yalnızca |
| **Dosyalar** | `tr.json` → `nav`, `setup`, `dashboard`; `en.json` eşdeğerleri |
| **Yaklaşım** | Mevcut key’ler korunur; **görünen metin** güncellenir (breaking key yok) |

**Önerilen TR etiket eşlemesi (nav):**

| Mevcut key | Eski (özet) | Yeni görünen metin |
|------------|-------------|---------------------|
| `registerModule` | Dönem defteri | Tahsilat & borç listesi |
| `duesDefinitionsModule` | Borçlandırma grupları | Aidat ve gider türleri |
| `accountsModule` | Cari hesaplar | Malik / kiracı hesapları |
| `staffAccountsModule` | Personel cari | Kapıcı & personel hesabı |
| `tabUnits` | Taşınmazlar | Daireler |
| `menuStructureGroup` | Taşınmazlar | Apartman yapısı |
| `accrualModule` | Borçlandırma | Aidat / gider borçlandır |
| `expensesModule` | Gelir gider | Gelir & gider kayıtları |
| `categoriesModule` | Gider tanımları | Gider kalemleri |
| `settingsModule` | Tanımlar | Apartman tanımları |

**Menü gruplama (sidebar — yalnızca etiket/sıra, route değişmez):**

1. **Genel bakış**
2. **Günlük işlemler** (`menuFinance` yeniden adlandırılır)
   - Tahsilat & borç listesi, Aidat borçlandır, Gelir & gider, Gecikme cezası
3. **Apartman tanımları** (`settingsModule` + yapı linkleri birleşik grup — görsel hiyerarşi)
   - Daireler, Aidat türleri, Kasa & banka, Sayaçlar, …
4. **Raporlar**, **Genel kurul**, **İletişim & arşiv** (mevcut)

**Acceptance criteria:**

- [ ] Sidebar’da yeni etiketler TR/EN tutarlı
- [ ] Route URL’leri değişmedi (`dues?tab=register` vb.)
- [ ] E2E / smoke: admin sidebar snapshot veya manuel checklist

---

### A2 — Mali işlemler sayfasında sekme çubuğu (dues hub)

| Alan | Detay |
|------|--------|
| **Bileşen** | Yeni `DuesPageTabs` — shadcn `Tabs` veya `NavigationMenu` (mobile scroll) |
| **Konum** | `dues/page.tsx` üstünde; sidebar’a **ek** (sidebar kaldırılmaz) |
| **Gruplar** | 4 üst sekme: **Tahsilat**, **Borçlandırma**, **Gelir/Gider**, **Tanımlar** |
| **Alt yönlendirme** | Tanımlar seçilince ikinci satır: Kasa, Malik hesapları, Gider kalemleri, Sayaç, Aidat türleri |

**Tab → `?tab=` eşlemesi (mevcut `resolveDuesTab` korunur):**

| Üst sekme | Alt / varsayılan tab |
|-----------|----------------------|
| Tahsilat | `register` |
| Borçlandırma | `accrual` (+ `lateFee` alt link) |
| Gelir/Gider | `expenses` |
| Tanımlar | `definitions` (varsayılan); dropdown: cashboxes, accounts, staffAccounts, categories, meters |

**Acceptance criteria:**

- [ ] Desktop ve mobilde aktif sekme görünür
- [ ] URL deep link (`?tab=accrual`) doğru sekmeyi açar
- [ ] shadcn dışı ham tab HTML yok

**Dosyalar:**

- `apps/web/src/components/dues-page-tabs.tsx` (yeni)
- `apps/web/src/app/[locale]/admin/properties/[propertyId]/dues/page.tsx`
- `apps/web/src/lib/dues-tab.ts` (grup helper — saf URL logic, iş kuralı yok)

---

### A3 — Form placeholder ve yardım metinleri

| Alan | Detay |
|------|--------|
| **Kapsam** | Borçlandırma sihirbazı, gelir/gider fişi, taşınmaz/malik formları, gecikme politikası |
| **Bileşen** | `FieldHelp` — shadcn `Tooltip` + `CircleHelp` ikon; metin i18n |
| **i18n namespace** | `help.*` (yeni kök veya modül bazlı `dues.help.*`, `finance.help.*`) |

**Zorunlu tooltip alanları (MVP):**

- Hesaplama yöntemi (sabit / m² / pay / fatura paylaştırma / sayaç)
- Pay oranı (arsa payı)
- Kesinleştir vs taslak borçlandırma
- Cari hesap türü
- Gecikme cezası vs tedarikçi gecikme faizi vs kanuni faiz (kısa karar ağacı metni)

**Placeholder standardı (tüm yeni/düzenlenen formlar):**

- `definitionName`: "Örn. 2026 A Blok aidatı"
- `fixedAmount`: "Örn. 850"
- `blockName`: "Örn. A Blok"

**Acceptance criteria:**

- [ ] Tooltip yalnızca i18n string; hardcoded TR yok
- [ ] Mobilde tooltip tıklanabilir (shadcn touch davranışı)
- [ ] Mevcut form validasyonu değişmedi

**Dosyalar:**

- `apps/web/src/components/field-help.tsx` (yeni)
- `due-definition-wizard.tsx`, `finance-tabs.tsx`, `period-register-panel.tsx` (entegrasyon)
- `tr.json`, `en.json`

---

### A4 — Gecikme & ceza karar rehberi (inline)

| Alan | Detay |
|------|--------|
| **Katman** | UI + i18n |
| **Konum** | `dues?tab=lateFee` üstü + borçlandırma sihirbazı adım 1 |
| **Bileşen** | shadcn `Alert` — 3 yol: Aidat gecikme tazminatı (KMK) → Gecikme cezası sekmesi; Tedarikçi faturası → Tedarikçi gecikme grubu; Kanuni faiz oranı → Org menü linki |

**Acceptance criteria:**

- [ ] Üç kavram tek ekranda ayrıştırılmış
- [ ] Org `legal-interest` sayfasına link (yetki varsa)

---

### A5 — Boş durum metinlerini eylem odaklı yap

| Alan | Detay |
|------|--------|
| **Kapsam** | `dues.accrualRunsEmpty`, finance ledger empty, definitions empty |
| **Format** | "Henüz X yok." → "Henüz X yok. **Yapılacak:** 1) … 2) …" + `Button` deep link |

**Acceptance criteria:**

- [ ] Her boş durumda en az bir primary action linki
- [ ] Metinler `tr.json` / `en.json`

---

### FAZ A — Teslim özeti

| Madde | Tür | DB | Service |
|-------|-----|-----|---------|
| A1 Menü i18n | UI | Hayır | Hayır |
| A2 Sekme çubuğu | UI | Hayır | Hayır |
| A3 Tooltip / placeholder | UI | Hayır | Hayır |
| A4 Gecikme rehberi | UI | Hayır | Hayır |
| A5 Boş durum | UI | Hayır | Hayır |

---

## FAZ B — Rehberlik ve rol bazlı deneyim

**Hedef:** İlk giriş onboarding, aylık görev widget’ı, rol bazlı menü sadeleştirme, yardım linkleri.  
**Tahmini süre:** 2–2,5 hafta  
**Bağımlılık:** FAZ A (terminoloji tutarlılığı)

### B1 — Aylık görevler widget’ı (dashboard)

| Alan | Detay |
|------|--------|
| **Modül** | `@siteyonetim/reporting-standard` |
| **Contract** | `PropertyMonthlyTasksDto`, `propertyMonthlyTasks(orgId, propertyId, year, month)` |
| **Service logic** | Mevcut servisleri compose et (yeni iş kuralı yok): |

**Görev kodları (örnek):**

| Kod | Kaynak | Mesaj (i18n) |
|-----|--------|--------------|
| `ACCRUAL_NOT_RUN` | `finance-dues` — bu ay posted accrual yok | "{period} aidatı henüz borçlandırılmadı" |
| `METER_READINGS_MISSING` | `AccrualContextWarningsDto` reuse | "{count} dairede sayaç endeksi eksik" |
| `DRAFT_ACCRUAL_PENDING` | mevcut warning | "Taslak borçlandırma onay bekliyor" |
| `OVERDUE_UNITS` | dashboard KPI eşiği > 0 | "{count} dairede gecikmiş borç var" |
| `PERIOD_NOT_CLOSED` | `finance-core` period — opsiyonel | "Geçen ay mali dönemi kapatılabilir" |

**UI:** `PropertyMonthlyTasksPanel` — dashboard’da checklist altında veya KPI üstünde; her satır `Link` + öncelik `Badge`.

**Cache:** Redis key `reporting:monthly-tasks:{propertyId}:{year}:{month}`; TTL 5 dk; invalidation: accrual post, meter reading, payment event’leri (mevcut cache pattern).

**Acceptance criteria:**

- [ ] Mock veri yok; tüm maddeler service DTO’dan
- [ ] Paralel service çağrıları (`Promise.all`)
- [ ] Mobile responsive card list

**Dosyalar:**

- `packages/modules/reporting-standard/src/contract.ts`
- `packages/modules/reporting-standard/src/service.ts`
- `apps/web/src/components/property-monthly-tasks-panel.tsx`
- `apps/web/src/app/.../dashboard/page.tsx`

---

### B2 — İlk giriş onboarding turu

| Alan | Detay |
|------|--------|
| **Modül** | `@siteyonetim/platform-auth` (veya `platform-tenant` — kullanıcı tercihi) |
| **DB** | `UserUiPreference` — soft delete alanları §31 |

**Şema (Prisma — özet):**

```
UserUiPreference
  id, userId, organizationId
  adminOnboardingCompletedAt DateTime?
  adminOnboardingStep Int?
  dismissedHints Json?   // { "monthlyTasks": true }
  deleted, deletedDate, deletedUserId
  @@unique([userId, organizationId])
```

**Service:** `AuthService` veya yeni `UserPreferenceService` — `getAdminOnboardingState`, `completeAdminOnboarding`, `dismissHint`.

**UI:** shadcn `Sheet` veya `Dialog` — 5 adım:

1. Daireleri tanımlayın → `?tab=units`
2. Malik / kiracı atayın → `?tab=units`
3. Aidat türü oluşturun → `dues?tab=definitions`
4. Kasa açın → `dues?tab=cashboxes`
5. İlk aidatı kesin → `dues?tab=accrual`

**Tetikleme:** Property dashboard; koşul: `!setup.isComplete` **veya** `onboardingCompletedAt == null` ve ilk property ziyareti.

**Acceptance criteria:**

- [ ] Tur atlanabilir; tercih DB’de kalıcı
- [ ] Audit: `auth.onboardingCompleted`, `auth.onboardingDismissed`
- [ ] SUPER_ADMIN için aynı akış (opsiyonel skip)

---

### B3 — Rol bazlı menü profilleri

| Alan | Detay |
|------|--------|
| **Katman** | `admin-nav-capabilities.ts` genişletme |
| **Profiller** | |

| Rol | Menü profili |
|-----|--------------|
| `PROPERTY_MANAGER` | **Günlük mod** (varsayılan): dashboard, günlük mali işlemler, duyuru, arıza, arşiv — tanımlar ve banka mutabakatı gizli veya “Gelişmiş” altında |
| `ACCOUNTANT` | **Tam mali mod**: mevcut FULL_PROPERTY_MODULES |
| `ORG_ADMIN` | Tam mod + org modülleri |
| `BOARD_MEMBER` | Salt okunur profil (mevcut RBAC ile hizala) |

**Contract:** `AdminNavCapabilities` → `navProfile: 'daily' | 'full' | 'readonly'`, `propertyModules` filtresi.

**UI:** Header’da “Basit görünüm / Tam görünüm” toggle — tercih `UserUiPreference.navProfile` (opsiyonel override).

**Acceptance criteria:**

- [ ] RBAC service’ten rol; UI’da hardcoded rol string yok
- [ ] Toggle audit’lenir
- [ ] Staff portal etkilenmez

---

### B4 — Aylık iş akışı checklist (ay sonu)

| Alan | Detay |
|------|--------|
| **Modül** | `reporting-standard` — `propertyMonthlyWorkflow(orgId, propertyId, year, month)` |
| **UI** | Dashboard veya `dues?tab=accrual` yan paneli — statik adım sırası, **tamamlanma durumu** DB’den |

**Adımlar (sıralı rehber, otomasyon zorunlu değil):**

1. Sayaç endekslerini gir
2. Aidat / ortak gider borçlandır
3. Borçlandırmayı kesinleştir
4. (Opsiyonel) SMS / e-posta hatırlatma gönder
5. Geciken borçları incele
6. Aylık raporu indir

**Tamamlanma:** Her adım ilgili service’ten boolean (`hasMeterReadings`, `hasPostedAccrual`, …).

**Acceptance criteria:**

- [ ] Adımlar tıklanınca doğru `?tab=` veya rapor sayfasına gider
- [ ] İş kuralı service’te; UI progress bar yalnızca DTO

---

### B5 — Modül yardım linkleri

| Alan | Detay |
|------|--------|
| **Katman** | i18n + UI |
| **Format** | `helpLinks.dues`, `helpLinks.register` → `{ label, href }` |
| **href** | Harici dokümantasyon URL (placeholder `#` kabul edilmez production’da — en azından internal `/help/glossary` FAZ B6) |

**UI:** Sayfa başlığı yanında `Button variant="ghost" size="sm"` — “Nasıl kullanılır?”

---

### B6 — Siteyonetim sözlüğü (terminoloji)

| Alan | Detay |
|------|--------|
| **Route** | `/{locale}/admin/help/glossary` (org admin + property manager) |
| **İçerik** | i18n `glossary.*` — Dönem defteri, Borçlandırma, Kesinleştirme, Cari, Tahsilat vb. |
| **DB** | Yok — statik i18n (§7 uyumlu; eğitim metni) |

**Acceptance criteria:**

- [ ] TR/EN tam
- [ ] Mali sayfalardan sözlüğe deep link

---

### FAZ B — Teslim özeti

| Madde | DB migration | Yeni modül |
|-------|--------------|------------|
| B1 Aylık görevler | Hayır | Hayır |
| B2 Onboarding | Evet (`UserUiPreference`) | Hayır |
| B3 Rol menü | Hayır | Hayır |
| B4 Ay sonu akışı | Hayır | Hayır |
| B5 Yardım linkleri | Hayır | Hayır |
| B6 Sözlük sayfası | Hayır | Hayır |

---

## FAZ C — Basit mod ve akıllı varsayılanlar

**Hedef:** Düşük dijital okuryazarlık / tek blok apartman için sadeleştirilmiş deneyim.  
**Tahmini süre:** 2–3 hafta  
**Bağımlılık:** FAZ A + B

### C1 — Basit mod (property-scoped UI)

| Alan | Detay |
|------|--------|
| **Modül** | `@siteyonetim/property-settings` |
| **Alan** | `Property.adminUiMode`: `STANDARD` \| `SIMPLE` (varsayılan STANDARD) |
| **Service** | `PropertySettingsService.getUiMode`, `setUiMode` — audit |

**Basit mod davranışı:**

| STANDARD | SIMPLE |
|----------|--------|
| Tam sidebar | Yalnızca: Genel bakış, Tahsilat, Borçlandır, Gider, Duyuru |
| 10+ dues sekmesi | Tek sayfa wizard: “Bu ay aidatı kes” → “Tahsilat al” |
| Tanımlar ayrı menü | İlk kurulum sihirbazında birleşik (blok+dire+kasa+aidat türü) |

**UI route:** Mevcut route’lar korunur; `SIMPLE` modda sidebar filtresi + dashboard’da “Basit moddasınız — Tüm özellikler” linki.

**Acceptance criteria:**

- [ ] Mod değişimi audit
- [ ] ACCOUNTANT rolü basit modu override edebilir (tam menü)
- [ ] Mobile-first basit mod layout

---

### C2 — Akıllı varsayılanlar (service)

| Alan | Detay |
|------|--------|
| **Modül** | `property-core`, `finance-dues` |
| **Kurallar (service katmanı)** | |

| Koşul | Varsayılan |
|-------|------------|
| Tek blok | Blok adı `"A Blok"` otomatik oluştur (create property sonrası job veya explicit API) |
| Aidat sihirbazı — tek unit tipi | Hesaplama: `FIXED` seçili |
| İlk kasa | Ad: `"Ana kasa"`, oluşturma onboarding B2 adım 4’te önerilir |
| Property kind = APARTMAN | `adminUiMode` önerisi: SIMPLE (org admin onayı) |

**Acceptance criteria:**

- [ ] Varsayılanlar UI’da değil service’te
- [ ] Mevcut apartmanlara retroaktif uygulanmaz (yalnızca yeni property veya explicit “Önerilen ayarları uygula” butonu)

---

### C3 — Birleşik “Apartman tanımları” hub (opsiyonel route)

| Alan | Detay |
|------|--------|
| **Route** | `.../properties/{id}/setup` — kurulum + tanımlar tek sayfa |
| **İçerik** | `PropertySetupChecklist` + kısayol kartları (daireler, aidat türleri, kasa) |
| **Basit mod** | Sidebar “Tanımlar” grubu bu tek sayfaya yönlenir |

---

### FAZ C — Teslim özeti

| Madde | DB migration |
|-------|--------------|
| C1 Basit mod | Evet (`Property.adminUiMode` veya settings JSON) |
| C2 Akıllı varsayılanlar | Hayır (davranış) |
| C3 Setup hub | Hayır |

---

## 4. Önerilen menü bilgi mimarisi (hedef durum)

Sidebar nihai hiyerarşi (FAZ A sonrası etiketler + FAZ B/C profiller):

```
Genel bakış
Günlük işlemler
  ├─ Tahsilat & borç listesi
  ├─ Aidat / gider borçlandır
  ├─ Gelir & gider kayıtları
  └─ Gecikme cezası
Raporlar
Genel kurul
Apartman tanımları          ← FAZ A gruplama
  ├─ Daireler & malikler     ← ?tab=units
  ├─ Aidat ve gider türleri
  ├─ Kasa ve banka
  ├─ Sayaç endeksleri
  └─ … (gelişmiş: cari, personel, gider kalemleri)
İletişim & arşiv
  ├─ Duyurular, SMS, Arşiv, Arızalar
```

**Banka mutabakatı:** Raporlar altında kalır; FAZ A’da rapor kartına alt metin: “Banka hareketleri ve mutabakat”.

---

## 5. i18n anahtar planı

| Namespace | FAZ | Açıklama |
|-----------|-----|----------|
| `nav.*` | A | Menü etiketleri güncelleme |
| `help.*` / `*.help.*` | A | Tooltip ve karar ağacı |
| `emptyActions.*` | A | Boş durum CTA |
| `monthlyTasks.*` | B | Dashboard widget |
| `onboarding.*` | B | Tur adımları |
| `workflow.*` | B | Ay sonu checklist |
| `glossary.*` | B | Sözlük |
| `uiMode.*` | C | Basit / standart mod |

**Kural:** Yalnızca `tr.json` ve `en.json`; key silme yerine metin güncelleme tercih edilir.

---

## 6. Test planı (faz bazlı)

| FAZ | Test |
|-----|------|
| A | Component test: `DuesPageTabs` URL sync; i18n key existence (TR/EN parity) |
| A | Manuel: site yöneticisi persona — 5 görevlik senaryo (tahsilat, borçlandır, gider) |
| B | Service unit: `propertyMonthlyTasks`, onboarding preference CRUD |
| B | Integration: dashboard widget veri kaynağı mock’suz |
| C | E2E: SIMPLE mod sidebar item count; yeni property varsayılan blok |

---

## 7. Uygulama sırası ve riskler

**Sıra:** A1 → A2 → A3 → A4 → A5 → B1 → B2 → B3 → B4 → B5 → B6 → C1 → C2 → C3

| Risk | Azaltma |
|------|---------|
| Menü yeniden adlandırma — eğitim materyali eskir | Sözlük (B6) + kısa release not |
| Sekme + sidebar çift navigasyon | Sekme primary; sidebar collapse’ta sekme sticky |
| Basit mod — muhasebeci rolü çatışması | ACCOUNTANT her zaman full mod |
| Onboarding DB migration | Soft delete; geri alınabilir migration |
| Redis cache stale görev listesi | Event-driven invalidation (§26) |

---

## 8. Başarı metrikleri

| Metrik | Hedef (FAZ A+B sonrası) |
|--------|-------------------------|
| İlk aidat borçlandırma süresi (yeni property) | −30% (checklist + onboarding) |
| Support / “nerede?” tipi geri bildirim | Azalma |
| Dashboard’dan tahsilat/borçlandırma tıklama | Artış |
| Basit mod adoption (FAZ C) | Yeni apartmanların ≥50% SIMPLE (opsiyonel) |

---

## 9. İlgili dosyalar (implementasyon öncesi checklist)

- [DEVELOPMENT_RULES.md](../../DEVELOPMENT_RULES.md)
- [FAZ1_APARTMAN_PLAN.md](./FAZ1_APARTMAN_PLAN.md) — rol ve mali kapsam
- `apps/web/src/components/admin-sidebar.tsx`
- `apps/web/src/lib/admin-nav-capabilities.ts`
- `apps/web/src/components/dues-tabs.tsx`
- `packages/modules/reporting-standard/src/service.ts` — `propertySetupStatus`
- `apps/web/src/messages/tr.json`, `en.json`

---

*Son güncelleme: 2026-08-09 — Planlama dokümanı; implementasyon öncesi onay beklenir.*
