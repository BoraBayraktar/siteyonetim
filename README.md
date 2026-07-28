# Site Yönetimi — Property Management Platform

Modüler monolith, multi-tenant SaaS apartman yönetimi (FAZ 1). Kurallar: [DEVELOPMENT_RULES.md](./DEVELOPMENT_RULES.md).

## Gereksinimler

- Node.js 20+
- PostgreSQL
- (Önerilen) Upstash Redis — Vercel’de entegrasyon

## Kurulum

```bash
cp .env.example .env
# DATABASE_URL ve AUTH_SECRET düzenleyin (AUTH_SECRET: openssl rand -base64 32)

npm install
npm run db:migrate
npm run db:seed
npm run dev
```

`db:migrate` ve `db:seed`, repodaki kök `.env` içindeki `DATABASE_URL` değerini kullanır (web uygulamasıyla aynı veritabanı).

Uygulama: [http://localhost:3000/tr](http://localhost:3000/tr)

**Demo giriş (seed sonrası):** `admin@demo.local` / `Demo123!`

## Monorepo

| Paket | Açıklama |
|-------|----------|
| `apps/web` | Next.js (Vercel) — admin + portal UI |
| `packages/db` | Prisma şema ve client |
| `packages/modules/property-core` | Apartman CRUD (Contract → Repository → Service) |
| `packages/modules/platform-auth` | Kimlik doğrulama servisi |
| `packages/platform-audit` | Merkezi audit |
| `packages/platform-cache` | Redis (Upstash) |

## Vercel deploy

1. Repoyu Vercel’e bağlayın.
2. **Root Directory:** `apps/web`
3. Ortam değişkenleri: `DATABASE_URL`, `AUTH_SECRET`, isteğe bağlı Upstash.
4. Build sonrası migration: Vercel **Build Command** içinde veya ayrı job ile `npm run migrate:deploy -w @siteyonetim/db` çalıştırın (Production Postgres hazır olmalı).

## Komutlar

```bash
npm run dev          # geliştirme
npm run build        # production build
npm run db:generate  # Prisma client
npm run db:migrate   # migrate dev (FAZ 1.1: party/occupancy migration)
```

### FAZ 1.1 akışı (yönetici)

1. Apartman oluştur → **Detay** ile apartmana gir.
2. **Bloklar** / **Daireler** sekmelerinden yapı tanımla.
3. **Kişiler** sekmesinde malik/kiracı kartı oluştur, **Portal erişimi** ile giriş tanımla (min. 8 karakter şifre).
4. **Atamalar** sekmesinde daire ↔ kişi (malik/kiracı) eşle.

Malik/kiracı: `/tr/portal/login` → atanan daireler listelenir.

### FAZ 1.2 akışı (finans)

1. Apartman detayında **Finans** → ilk girişte mali dönem ve varsayılan gelir/gider kalemleri oluşur.
2. **Kasa** sekmesinde kasa tanımla.
3. **Cari** sekmesinde malik/tedarikçi cari kartları aç (isteğe bağlı kişi bağlantısı).
4. **Gelir / gider** sekmesinde fiş kaydet (kasa ve/veya cari); kasa bakiyesi ve cari bakiye transactional güncellenir.
5. Dönem sonunda **Dönemi kapat** (kapalı döneme yeni fiş yazılamaz).

### FAZ 1.3 akışı (aidat)

1. **Aidat** ekranında tanım oluştur (sabit veya m²).
2. Yıl/ay seçerek **tahakkuk oluştur**, ardından **kesinleştir** (cari borç yazılır).
3. En az bir **kasa** tanımlı olmalı; **Manuel tahsilat** ile otomatik mahsup.
4. **Borç** sekmesinde yaşlandırma; malik portalında ekstre ve açık borç.
