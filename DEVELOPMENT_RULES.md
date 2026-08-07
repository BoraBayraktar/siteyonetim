# Site Yönetimi — Geliştirme Kuralları

Bu dosya **siteyonetim** projesi için tek kaynak (single source of truth) geliştirme standardıdır.  
Tüm yeni geliştirmeler, refactor’lar, kod incelemeleri ve mimari kararlar bu kurallara uygun yapılır. Bu dosyayla çelişen değişiklik kabul edilmez.

---

## 1) Modular monolith ve katman sınırları

- UI katmanından **doğrudan Prisma / veritabanı erişimi yasaktır**.
- Tüm modüller **modüler yapıda** olmalı; modüller birbirleriyle yalnızca **servis katmanı** üzerinden haberleşir.
- Her modül **Contract → Repository → Service** akışına uyar.
- **Cross-module dependency** oluşturma ve **iş kurallarını UI’a taşıma** yasaktır.

## 3) Proje bütünlüğü

- Mevcut mimari pattern, klasör yapısı ve kod stilini koru.
- Yeni abstraction veya paralel pattern eklemeden önce repodaki mevcut örneklere uy.

## 4) i18n

- Projede **global i18n** dil yapısını kullan.
- Çeviri anahtarları yalnızca **`tr.json`** ve **`en.json`** dosyalarında tanımlanır; başka key kaynağı kullanma.

## 7) Veri kaynağı

- **Mock data kullanmak yasaktır.** Yalnızca veritabanından gelen gerçek veriler kullanılır.

## 8) Veritabanı erişimi

- Varsayılan olarak **Prisma ORM** kullan.
- Zorunlu durumlarda **gerekçeli** raw SQL kullanılabilir.

## 9) Responsive UI

- UI **tam mobil uyumlu** ve **responsive** olmalıdır (mobile-first).

## 10) UI kontrolleri (shadcn/ui)

- UI’daki **tüm kontroller** (buton, input, select, checkbox, dialog, dropdown, tab, form alanları vb.) **[shadcn/ui](https://ui.shadcn.com/)** bileşenleri üzerinden kullanılır.
- Form ve etkileşimli kontroller için **yalnızca shadcn/ui** kullan; alternatif UI kitleri (MUI, Ant Design, Chakra UI vb.) ve ham HTML kontrolleri **yasaktır**.
- Projeye eklenen shadcn bileşenleri standart **`components/ui`** (veya repoda tanımlı eşdeğer shadcn dizini) altında tutulur; özelleştirme bu bileşenler üzerinde yapılır, paralel “ikinci bir button/input” kütüphanesi oluşturma.
- shadcn’de karşılığı olan bir kontrol varken üçüncü parti veya sıfırdan yazılmış kontrol kullanma; gerekirse mevcut shadcn bileşenini genişlet veya birleştir.

## 14) İş kuralı ve modül sınırları

- Modüller arası doğrudan bağımlılık oluşturma.
- Business logic UI, API route veya repository adapter katmanında değil; **service katmanında** olmalıdır.

## 15) API route’lar

- Tüm API route’ları **service layer** üzerinden çalışacak şekilde tasarlanır ve güncellenir.
- API route katmanı **doğrudan veritabanına erişemez**.

## 16) Önbellek (Redis)

- Cache için merkezi **Redis (distributed cache)** yapısını kullan.

## 17) N+1

- Performans sorunlarını önlemek için **N+1 sorgu** kullanımını engelle (include/select, batch yükleme, uygun repository sorguları).

## 18) Render ve yükleme

- Gereksiz **lazy loading** kullanma; **kritik render path**’i optimize et.

## 19) Tablolar

- Tablo görünümlerinde global **server-side pagination** bileşenini kullan.

## 20) Paralellik ve transaction

- **Bağımsız** işlemler mümkün olduğunca **paralel** çalışmalı.
- **Transactional** işlemler **sıralı** ve tutarlı şekilde yürütülmeli.

## 21) UI içinde Supabase cache

- UI içinde **Supabase cache** yapmak yasaktır.

## 22) DB trigger ile cache

- **DB trigger** ile cache yönetmek yasaktır.

## 23) SLA verisi

- **SLA verisini frontend cache’e almak** yasaktır.

## 24) Deadline timestamp

- Deadline timestamp, cache dışında **veritabanında canonical** (tek doğru kaynak) olmalıdır.

## 25) Active timer

- Active timer, cache dışında **veritabanında canonical** olmalıdır.

## 26) Cache invalidation

- Yalnızca TTL’e güvenme; mümkün olduğunca **event-driven invalidation** uygula.

## 28) Prisma migrate (production)

- Production ortamında **asla** `--accept-data-loss` kullanma.
- Geliştirme için **`prisma migrate dev`** kullan (production akışına uygun deploy/migrate süreçlerine uy).

## 29) Dark mode

- Dark mode için **CSS class**’ları **`globals.css`** üzerinden yönetilir.

## 30) Silme politikası

- Veritabanında **permanent delete** kullanma; bunun yerine **soft delete** kullan.

## 31) Soft delete alanları

- Silme işlemi olan her tabloda soft delete için şu alanlar kullanılır:
  - `deleted`
  - `deletedDate`
  - `deletedUserId`

## 32) Audit

- **Merkezi audit** kullan; her anlamlı işlem loglansın.

## 33) Platform süper yöneticisi

- `User.isSuperAdmin = true` olan hesap **platform süper yöneticisidir**; organizasyon rolü / property RBAC / menü kısıtlarından bağımsızdır.
- Süper admin **Kullanıcılar & roller** listesinde görünmez; org üyeliği (`UserOrganization`) taşımaz; UI veya org-user servisi üzerinden rolü değiştirilemez / silinemez.
- E-posta: `SUPER_ADMIN_EMAIL` ortam değişkeni (boşsa varsayılan `bora.bayraktar@hotmail.com`). Kimlik eşlemesi `getSuperAdminEmail()` ile yapılır.
- Hesap yalnızca **`SUPER_ADMIN_PASSWORD` ortam değişkeni set iken** `npm run db:seed` ile oluşturulur/güncellenir; değişken yoksa seed süper admin adımını atlar.
- Süper admin oturumunda `isSuperAdmin` JWT claim’i set edilir; tüm admin property erişim kontrolleri ve org-wide yetki kontrolleri bypass edilir.
- Süper admin için 2FA zorunluluğu ve self-service şifre sıfırlama **devre dışıdır** (platform erişim kaybını önlemek için).
- **Güvenlik:** `SUPER_ADMIN_PASSWORD` (ve production değerleri) repoya, seed kaynak koduna veya DEVELOPMENT_RULES’a **asla** düz metin yazılmaz. Yerel: kök `.env` (gitignore). Production: Vercel/env secret veya güvenli ops kanalı.

---

## Uygulama notu

- Lint, kod incelemesi ve mimari kontroller bu dosyaya göre yapılır.
- Agent ve geliştirici oturumlarında öncelik: **[DEVELOPMENT_RULES.md](DEVELOPMENT_RULES.md)**.
