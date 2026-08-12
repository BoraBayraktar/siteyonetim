# Site Yönetimi — Property Management Platform

Modüler monolith, multi-tenant SaaS apartman yönetimi (FAZ 1). Kurallar: [DEVELOPMENT_RULES.md](./DEVELOPMENT_RULES.md).

## Gereksinimler

- Node.js 20+
- PostgreSQL (bu repo için ayrı Docker servisi — **beemmb ile paylaşılmaz**)
- (Önerilen) Upstash Redis — Vercel’de entegrasyon

## Kurulum

```bash
cp .env.example .env
# AUTH_SECRET: openssl rand -base64 32

# Site yönetimine özel Postgres (port 5433 — beemmb 5432 kullanıyorsa çakışmaz)
docker compose up -d

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

**Team:** [Site Yonetimi](https://vercel.com/siteyonetim) (`siteyonetim`) — **beemmb-arge ile paylaşılmaz.**

1. GitHub reposunu bu team altındaki projeye bağlayın: [siteyonetim/siteyonetim](https://vercel.com/siteyonetim/siteyonetim)
2. **Root Directory:** `apps/web` (projede ayarlı)
3. CLI her zaman bu team ile: `npx vercel -S siteyonetim …`
4. Deploy (monorepo **kökünden**): `npx vercel deploy --prod -S siteyonetim --regions fra1`
   - **`--regions fra1` zorunlu** — Neon veritabanı Frankfurt'ta (`eu-central-1`); bu bayrak olmadan fonksiyonlar Vercel'in varsayılanı olan `iad1`'e (ABD) döner ve her sorgu transatlantik gecikmeye maruz kalır (sayfa yükleri ~3s'den ~0.5s'ye düşüyor bu bayrakla).
   - **Önemli:** `apps/web/vercel.json` içindeki `"regions": ["fra1"]` ayarı test edildi ve **hem CLI hem git-push ile tetiklenen deploy'larda tek başına işe yaramadı** (fonksiyonlar yine `iad1`'de kaldı) — sebebi netleşmedi, muhtemelen dashboard'daki proje ayarı override ediyor. Kalıcı çözüm: Vercel dashboard → `siteyonetim` projesi → **Settings → Functions → Function Region** → **Frankfurt (fra1)** seçip kaydedin. Bu yapılmadan git push ile otomatik deploy'lar sessizce `iad1`'e dönebilir; CLI ile deploy ederken de her seferinde `--regions fra1` bayrağını unutmayın.
   - `.env` dosyanız asla deploy paketine dahil edilmemeli (`load-env.cjs` varlığını görürse `DATABASE_URL`'i yerel Docker'a çevirir) — kök `.vercelignore` bunu engelliyor, silmeyin.
5. **Neon + migration + seed:**
   ```bash
   cd ~/Documents/GitHub/siteyonetim
   ./scripts/vercel-neon-setup.sh
   ```
   Neon şartları: [siteyonetim team Neon terms](https://vercel.com/siteyonetim/~/integrations/accept-terms/neon?source=cli)
6. Ortam: `AUTH_SECRET` (Production + Preview); Neon sonrası `DATABASE_URL` otomatik gelir. Ayrıca **Storage → Upstash Redis** entegrasyonu (bölge: Frankfurt) eklenmeli — `UPSTASH_REDIS_REST_URL`/`TOKEN` olmadan merkezi cache (`platform-cache`) sessizce devre dışı kalır.

**Eski kurulum:** `beemmb-arge/siteyonetim-web` artık kullanılmamalı; karışıklığı önlemek için Vercel panelinden **silebilirsiniz** (`devbeemmb` projesine dokunmayın).

Canlı demo giriş (seed sonrası): `admin@demo.local` / `Demo123!`

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
