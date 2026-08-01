# Site başına izole multi-tenant mimarisi

**Referans:** [DEVELOPMENT_RULES.md](../../DEVELOPMENT_RULES.md) · [FAZ1_APARTMAN_PLAN.md](./FAZ1_APARTMAN_PLAN.md)

---

## 1. Kiracı seviyeleri

| Seviye | Model | Açıklama |
|--------|--------|----------|
| Platform tenant | `Organization` | Yönetim firması / SaaS abonesi |
| Site tenant | `PropertyTenant` | Yönetilen apartman/sitesi; portal kodu, izolasyon modu |
| Veri kapsamı | `propertyId` | Tüm operasyonel tablolarda zorunlu filtre |

---

## 2. İzolasyon modları

### SHARED_SCHEMA (varsayılan)
- Tek PostgreSQL, tüm siteler aynı şemada.
- Mantıksal izolasyon: her sorgu `organizationId` + `propertyId` ile filtrelenir.
- `UserPropertyAccess` ile kullanıcı yalnızca yetkili siteleri görür.

### DEDICATED_DATABASE (ileri seviye)
- Site başına Neon branch / ayrı `DATABASE_URL`.
- `PropertyTenant.databaseUrlSecretKey` → env’de secret adı (ham URL DB’de tutulmaz).
- `platform-tenant.resolveDatabaseUrl(propertyId)` runtime yönlendirme kancası.
- Kontrol düzlemi (org, kullanıcı, tenant kaydı) paylaşımlı DB’de kalır; operasyonel veri ayrı DB’ye taşınabilir (FAZ 2 provisioning job).

---

## 3. Rol ve portal modeli (SMS yok)

| Katman | Mekanizma |
|--------|-----------|
| Org rolü | `UserOrganization.role` — `ORG_ADMIN` tüm sitelere erişir |
| Site rolü | `UserPropertyAccess.role` — site kapsamlı yetki |
| Admin portal | `/admin` — yönetici paneli |
| Denetçi portal | `/auditor` — salt okunur raporlar, site listesi RBAC ile filtrelenir |
| Malik portal | `/portal` — e-posta **veya** daire kodu + şifre (`PortalUnitCredential`) |

**Bilinçli olarak uygulanmadı:** SMS OTP, telefon ile yönetici girişi.

---

## 4. Modüller

| Modül | Sorumluluk |
|-------|------------|
| `platform-tenant` | `PropertyTenant`, portal ayarları, daire şifresi, DB URL çözümleme |
| `platform-rbac` | `UserPropertyAccess`, site erişim kontrolü |

---

## 5. Oturum claim’leri (JWT)

Admin oturumunda:
- `orgWideAccess: true` → `ORG_ADMIN`
- `propertyAccess: [{ propertyId, role }]` → diğer roller

Portal oturumunda:
- `portalAuthKind: EMAIL | UNIT`
- `propertyId`, `unitId` (daire girişi)

---

## 6. Yol haritası

| Faz | Madde |
|-----|--------|
| **Şimdi** | Şema, tenant provisioning, RBAC, daire girişi, portal görünürlük ayarları |
| FAZ 2 | Neon branch otomatik provisioning, dedicated DB migration aracı |
| FAZ 2 | Güvenlik / iş takip portalları (`SECURITY`, `MAINTENANCE` rolleri) |
| FAZ 2 | Online ödeme portal kancası (`allowOnlinePayment`) |
| FAZ 3 | Menü RBAC tam enforcement, property-scoped audit görünümü |

---

## 7. Sektör uygulamaları karşılaştırması

| Tipik uygulama | siteyonetim (bu tasarım) |
|-------------|---------------------------|
| Telefon + SMS yönetici girişi | E-posta + şifre (SMS yok) |
| Site/blok/kapı + şifre sakin girişi | `portalCode` + blok + daire + şifre |
| Rol = ayrı portal | Admin / Auditor / Portal route grupları + `PropertyAccessRole` |
| Site başına veri | `PropertyTenant` + SHARED / DEDICATED izolasyon |
