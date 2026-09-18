# Kasir Toko

Aplikasi kasir untuk alat dan bahan bangunan serta pertanian menggunakan Next.js, PostgreSQL, dan Prisma.

## Konfigurasi environment

Untuk lokal, salin `.env.example` menjadi `.env`, lalu isi `DATABASE_URL`.
Jangan commit `.env` atau kredensial Google ke repository.

Untuk mengaktifkan login Google, buat OAuth client bertipe **Web application** di
[Google Cloud Console](https://console.cloud.google.com/apis/credentials), lalu isi:

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://DOMAIN-ANDA/api/auth/google/callback
```

Nilai `GOOGLE_REDIRECT_URI` harus sama persis dengan **Authorized redirect URI**
di Google Cloud Console. Production wajib memakai HTTPS.

## Konfigurasi database aktif di komputer ini

PostgreSQL lokal TaniBangun berjalan pada port `5433` dengan database dan kredensial:

```env
DATABASE_URL="postgresql://tanibangun:tanibangun@127.0.0.1:5433/tanibangun?schema=public"
```

Data cluster disimpan di `%LOCALAPPDATA%\TaniBangunPostgres`. Jika server perlu dinyalakan ulang:

```powershell
& "C:\Program Files\PostgreSQL\17\bin\pg_ctl.exe" `
  -D "$env:LOCALAPPDATA\TaniBangunPostgres" `
  -o " -p 5433" `
  -l "$env:LOCALAPPDATA\TaniBangunPostgres\server.log" start
```

## Menjalankan secara lokal

1. Instal Docker Desktop.
2. Jalankan PostgreSQL:

```powershell
docker compose up -d
```

3. Salin `.env.example` menjadi `.env`.
4. Instal dependency:

```powershell
npm install
```

5. Sinkronkan schema dan isi data produk awal:

```powershell
npm run db:setup
```

6. Jalankan aplikasi:

```powershell
npm run dev
```

Buka `http://localhost:3000`.

## Deploy production ke Vercel

1. Push project ke GitHub dan import repository tersebut di Vercel.
2. Buat database PostgreSQL production (misalnya Neon, Supabase, atau Railway).
3. Tambahkan environment variables berikut di Vercel untuk **Production**:

   - `DATABASE_URL`: connection string PostgreSQL production, termasuk `sslmode=require`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URI`: `https://DOMAIN-ANDA/api/auth/google/callback`
   - `BACKUP_DIR`: hanya gunakan bila deployment memakai server dengan disk persisten.
     Filesystem Vercel bersifat ephemeral dan `pg_dump` tidak tersedia secara default,
     jadi endpoint backup perlu diarahkan ke job/server backup eksternal sebelum dipakai
     untuk data production.

4. Deploy. Vercel akan menjalankan `vercel-build`, yang otomatis meng-generate Prisma
Client, menyinkronkan schema ke database production, lalu membuat production build.
Pastikan `DATABASE_URL` sudah diisi di environment **Production** sebelum deployment.
Untuk sinkronisasi manual, jalankan:

```powershell
npx prisma generate
npx prisma db push
```

Untuk production dengan migration history, gunakan migration yang sudah direview
dan jalankan `npx prisma migrate deploy` sebagai bagian dari pipeline deploy.
Jangan menjalankan `db:seed` di production kecuali memang ingin membuat data demo.

5. Di Google Cloud Console, tambahkan domain production pada OAuth consent screen
dan masukkan URL callback production pada **Authorized redirect URIs**.
Tambahkan akun penguji bila consent screen masih berstatus **Testing**.

Setelah deploy, cek `https://DOMAIN-ANDA/api/health`. Respons yang diharapkan:

```json
{"status":"ok","database":"connected","googleOAuth":"configured"}
```

### Login dashboard

Dashboard (`/dashboard`) dilindungi sesi cookie httpOnly. Jalankan `npm run db:seed` setelah setup untuk membuat akun demo:

- Admin: `admin` / `admin123`
- Kasir: `kasir` / `kasir123`

Halaman checkout publik tetap tersedia di `/`; API autentikasi yang tersedia adalah `POST /api/auth/login`, `POST /api/auth/logout`, dan `GET /api/auth/me`.

## API

- `GET /api/products?search=semen&category=BANGUNAN` mengambil produk dengan filter opsional.
- `POST /api/products` membuat produk baru.
- `GET /api/sales` mengambil riwayat transaksi terbaru.
- `POST /api/sales` membuat transaksi dan mengurangi stok secara atomik.
- `GET /api/inventory/movements` mengambil 100 riwayat perubahan stok terbaru (khusus Admin/Owner).
- `POST /api/inventory/movements` mencatat stok masuk, stok keluar, atau penyesuaian (khusus Admin/Owner) secara atomik.
- Halaman manajemen inventori tersedia di `/stok` untuk Admin dan Owner.
- `GET /api/health` memeriksa koneksi database.

Contoh body transaksi:

```json
{
  "paymentMethod": "TUNAI",
  "items": [
    { "productId": 1, "quantity": 2 }
  ]
}
```

## Validasi

```powershell
npm run lint
npm run build
```

# Project Tani Bangun

## 🚀 Environment Setup
Proyek ini menggunakan dua koneksi database untuk proses pengembangan dan migrasi data:

- **Database Lokal (Source):** `DATABASE_URL` di file `.env`
  - Connection: `postgresql://tanibangun:tanibangun@127.0.0.1:5433/tanibangun?schema=public`
- **Database Online (Target - Neon.tech):** `DATABASE_URL_ONLINE` di file `.env.local`
  - Connection: Neon Serverless Postgres (`postgresql://<user>:<password>@<neon-host>:5432/<dbname>?sslmode=require`)

> **Catatan untuk AI Agent:** Selalu gunakan **Direct Connection URL** dari Neon (bukan Pooled/PgBouncer URL) saat melakukan migrasi skema, `prisma db push`, atau perintah `pg_dump`/`psql`.

---

## 🔄 Database Migration Guide (for AI Agents & Developers)

Panduan bagi AI Agent / CLI untuk menyalin/backup data dari PostgreSQL lokal ke Neon Online.

### Option A: Menggunakan Prisma ORM (Rekomendasi)
Jika proyek menggunakan Prisma, AI Agent dapat mengeksekusi push skema secara langsung ke Neon:
```bash
# Menimpa variabel DATABASE_URL sementara menggunakan URL dari .env.local
DATABASE_URL=$DATABASE_URL_ONLINE npx prisma db push
