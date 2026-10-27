# Panduan Setup Supabase — e-Surat Dinas Pertanian

Panduan ini untuk menjalankan sistem persuratan Dinas Pertanian Minahasa Selatan
di atas Supabase (Postgres + Auth + Storage). Ikuti urutan di bawah;
proyek Supabase diasumsikan **belum ada** sama sekali.

---

## 0. Ringkasan

||# | Langkah | Hasil |
|---|---|---|
|1|Buat project Supabase | URL project + anon key + service role key + connection string |
|2|Isi `.env.local` | aplikasi tahu project mana yang dipakai |
|3|Aktifkan extension `pg_cron` | penjadwal pengingat batas waktu |
|4|Jalankan migrasi `0001` → `0006` | skema, RLS, RPC, bucket, seed data |
|5|Jalankan `npm run seed:supabase` | 15 akun Auth siap pakai |
|6|Jalankan `npm run dev` + login | sistem hidup |
|7|Uji cepat + reset data | bukti pengujian skripsi |

Langkah 1–2 dan 5–7 membutuhkan proyek Supabase yang sudah hidup. Sebelum itu,
`npm run check:migrasi` memverifikasi seluruh migrasi secara lokal.

Aplikasi punya dua mode:

- **Mode Demo** — `NEXT_PUBLIC_SUPABASE_URL` kosong. Semua data tetap di
  `localStorage` seperti versi mockup. Tidak ada error, login lewat
  `src/lib/demo-akun.json`. Dipakai bila Supabase belum siap.
- **Mode Supabase** — `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  terisi. Postgres menjadi satu-satunya sumber kebenaran; RLS yang mengatur
  siapa boleh melihat apa.

Mode dipilih otomatis. Tidak ada tombol on/off.

---

## 1. Buat project Supabase

1. Buka <https://supabase.com> → **New project**.
2. Isi:
   - **Name** — mis. `surat-dinas-minsel`
   - **Database Password** — buat password kuat, **simpan di password manager**.
     Password ini hanya dipakai saat membuat project; koneksi aplikasi memakai
     API key, bukan password database.
   - **Region** — pilih yang paling dekat dengan pengguna (mis. `Asia Southeast (Jakarta)`).
3. Tunggu provisioning (±2 menit), lalu simpan **Project URL** dan **anon key**.

## 2. Ambil kredensial dan isi `.env.local`

Salin berkas contoh lalu isi nilainya:

```bash
cp .env.example .env.local
```

Di Dashboard → **Project Settings → API**:

| Nilai di `.env.local` | Asal di Dashboard |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL (`https://xxxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` / `publishable` key |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` key (**server only**) |
| `CRON_SECRET` | string acak buatan sendiri, mis. `openssl rand -hex 24` |
| `DATABASE_URL` | Connection string Postgres (**server only**) — hanya untuk `npm run supabase:migrate` |

Isi `.env.local` seperti ini:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...   # JANGAN di-commit
CRON_SECRET=9f2c1a7e4b...
DATABASE_URL=postgresql://postgres.xxxx:password@db.xxxx.supabase.co:5432/postgres
```

`DATABASE_URL` diambil dari Dashboard → **Project Settings → Database →
Connection string → URI**. Pilih mode **Session pooler** (port `5432`) —
paling aman untuk menjalankan DDL. Password yang mengandung karakter khusus
(`@ : / ? #`) harus di-*URL-encode*; pakai **Session pooler** juga menghindari
masalah `ENOTFOUND db.xxxx.supabase.co` di jaringan tanpa IPv6.

> **Penting**
> - `.env.local` sudah masuk `.gitignore` — jangan pernah di-commit.
> - `SUPABASE_SERVICE_ROLE_KEY` **tidak boleh** masuk kode browser. Key ini
>   melewati seluruh aturan RLS. Yang boleh memakainya hanya: skrip seed,
>   reset kata sandi, penerbitan/streaming berkas, dan route cron.
> - `.env.example` (tanpa nilai) ikut dalam repo sebagai templat.

## 3. Aktifkan extension `pg_cron`

Extension `pgcrypto` dan `citext` dibuat otomatis oleh migrasi `0001`.
Yang **harus** diaktifkan manual adalah `pg_cron`:

1. Dashboard → **Database → Extensions**.
2. Cari `pg_cron` → **Enable**.
3. (Opsional) **Dashboard → Database → Cron Jobs** untuk melihat job
   `pengingat-batas-waktu` setelah migrasi `0006` dijalankan.

Bila `pg_cron` tidak tersedia di paket Anda, lewati langkah ini — migrasi
`0006` akan mengeluarkan *notice*, bukan error. Pengingat lalu dijalankan lewat
route HTTP (lihat bagian 9).

## 4. Jalankan migrasi

Migrasi berada di `supabase/migrations/`. **Jalankan berurutan**, satu berkas
per pemanggilan, lewat **SQL Editor** (Dashboard → **SQL Editor → New query**):

| Urutan | Berkas | Isi |
|---|---|---|
| 1 | `0001_schema.sql` | 22 tabel, trigger `updated_at`, helper `app_*` |
| 2 | `0002_rls.sql` | Row Level Security + policy + bucket Storage privat |
| 3 | `0003_rpc.sql` | 38 fungsi RPC (semua tulisan data lewat sini) |
| 4 | `0004_seed_domain.sql` | data master + 15 baris pengguna demo |
| 5 | `0005_seed_contoh.sql` | data contoh: surat masuk 83–89, surat keluar 239–250, buku ekspedisi |
| 6 | `0006_cron.sql` | jadwal pg_cron untuk pengingat batas waktu |

Cara memuat berkas ke SQL Editor: buka menu **⋮** pada panel berkas di SQL
Editor → **Copy** → tempel ke kueri → **Run**. (Bisa juga lewat `psql` atau
Supabase CLI, tapi SQL Editor cukup untuk penyiapan.)

Setiap migrasi **idempoten** — menjalankannya dua kali tidak merusak data.
`CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS` + `CREATE POLICY`, dan
`INSERT ... ON CONFLICT DO UPDATE` dipakai konsisten.

Setelah migrasi `0002`, bucket privat `berkas-surat` dan `tanda-tangan`
otomatis ada (lihat **Storage** di Dashboard; keduanya berstatus *Private*).

### 4a. Jalankan migrasi otomatis (alternatif SQL Editor)

Bila `DATABASE_URL` sudah diisi di `.env.local`, seluruh migrasi dapat
dijalankan dari terminal — tanpa menyalin berkas satu per satu:

```bash
npm run supabase:migrate
```

Skrip `scripts/migrate.mjs` menjalankan berkas `0001` → `0006` berurutan,
satu transaksi per berkas, dan mencatatnya di tabel `public._migrasi_log`
sehingga berkas yang sudah berhasil tidak dijalankan dua kali. Kegagalan satu
berkas membatalkan berkas itu saja (rollback) dan menghentikan proses.

| Opsi | Arti |
|---|---|
| `npm run supabase:migrate` | jalankan migrasi yang belum terpasang |
| `npm run supabase:migrate -- --force` | jalankan ulang semuanya |
| `npm run supabase:migrate -- --only 0003_rpc.sql` | jalankan satu berkas |

### 4b. Periksa migrasi tanpa proyek Supabase

Sebelum menyentuh proyek sungguhan, migrasi bisa dijalankan di **PGlite**
(Postgres versi WASM) — tanpa Docker, tanpa `psql`:

```bash
npm run check:migrasi
```

Perintah ini mengeksekusi seluruh berkas migrasi terhadap tiruan objek
bawaan Supabase (`auth.users`, `auth.uid()`, `storage.buckets`,
`storage.objects`, peran `anon`/`authenticated`/`service_role`), lalu
melaporkan jumlah tabel, fungsi, policy RLS, dan baris seed. Kalau ada
galat SQL, perintah ini menangkapnya di baris yang sama seperti yang akan
muncul di proyek sungguhan.

## 5. Seed akun demo

Baris pengguna sudah ada di tabel `users` (dari `0004`), tetapi akun **Auth**
belum. Skrip ini membuatnya dan menyelaraskan `users.auth_id`:

```bash
npm run seed:supabase
```

Keluarannya kira-kira:

```
Menyiapkan 15 akun demo pada https://xxxx.supabase.co

  OK  admin           admin@distan.go.id
  OK  petugas_surat   petugas1@distan.go.id
  ...
Selesai. Dibuat: 15, diperbarui: 0, gagal: 0.
```

Skrip idempoten — menjalankannya lagi aman (akun lama hanya diperbarui kata
sandinya). Kata sandi demo ada di `src/lib/demo-akun.json`; **tidak pernah**
disimpan di database.

Daftar akun:

| Peran | Email | Kata sandi |
|---|---|---|
| Admin | `admin@distan.go.id` | `admin123` |
| Petugas Surat | `petugas1@distan.go.id` | `petugas123` |
| Petugas Surat | `petugas2@distan.go.id` | `petugas123` |
| Sekretaris | `sekretaris@distan.go.id` | `sekretaris123` |
| Kepala Dinas | `kadis@distan.go.id` | `kadis123` |
| Kepala Bidang | `kabid.peternakan@distan.go.id` | `kabid123` |
| Kepala Bidang | `kabid.tph@distan.go.id` | `kabid123` |
| Kepala Bidang | `kabid.sarpras@distan.go.id` | `kabid123` |
| Kepala Bidang | `kabid.perkebunan@distan.go.id` | `kabid123` |
| Kepala Bidang | `kabid.penyuluhan@distan.go.id` | `kabid123` |
| Staf Pelaksana | `staf.peternakan@distan.go.id` | `staf123` |
| Staf Pelaksana | `staf.tph@distan.go.id` | `staf123` |
| Staf Pelaksana | `staf.sarpras@distan.go.id` | `staf123` |
| Staf Pelaksana | `staf.perkebunan1@distan.go.id` | `staf123` |
| Staf Pelaksana | `staf.penyuluhan@distan.go.id` | `staf123` |

## 6. Jalankan aplikasi

```bash
npm install
npm run dev
```

Buka <http://localhost:3000>. Halaman login akan menampilkan **Mode Supabase**
(bukan Mode Demo) bila `.env.local` terbaca. Login dengan salah satu akun di
atas.

## 7. Uji cepat

Urutannya mengikuti alur bisnis nyata — cocok untuk rekaman skripsi:

1. **Petugas Surat** (`petugas1@distan.go.id`) → **Surat Masuk → Catat Surat**.
   Nomor agenda harus terisi otomatis dan **unik**.
2. **Kepala Dinas** (`kadis@distan.go.id`) → **Disposisi** → beri disposisi ke
   satu dan dua bidang, isi tenggat.
3. **Kepala Bidang** (`kabid.tph@distan.go.id`) → **Tindak Lanjut** → terima
   disposisi (paraf), teruskan ke staf, atau tindak lanjuti langsung.
4. **Staf Pelaksana** (`staf.tph@distan.go.id`) → **Tugas Saya** → simpan
   progres → lapor hasil.
5. **Sekretaris** (`sekretaris@distan.go.id`) → catatan koordinasi lintas bidang.
6. **Admin** (`admin@distan.go.id`) → **Data Master** & **Pengguna**. Admin
   **tidak boleh** bisa membuka isi kartu disposisi — itu ditegakkan RLS,
   bukan sekadar menu yang disembunyikan.

Uji otorisasi wajib (bukti skripsi):

| Uji | Harapan |
|---|---|
| Paksa `userRole=admin` di cookie tanpa login | tetap ditolak (cookie bukan lagi penentu akses) |
| Buka `/disposisi/<id>` sebagai admin | 403 |
| Buka `/admin/pengguna` sebagai petugas surat | 403 |
| Dua tab mencatat surat masuk bersamaan | nomor agenda unik, berurutan, tanpa duplikat |
| Login di dua browser berbeda | data sama dan saling sinkron |

Uji di atas dapat dijalankan otomatis dari terminal:

```bash
npm run test:rls       # alur 6 peran + aturan RLS (21 pemeriksaan)
npm run test:storage   # aturan RLS bucket Storage (4 pemeriksaan)
```

Kedua skrip memakai session Auth sungguhan (anon key + JWT pengguna), bukan
service role, sehingga yang diuji benar-benar aturan di Postgres. Semua data
yang dibuat skrip dihapus kembali di akhir.

> **Catatan Policy Storage.** Berkas `0002_rls.sql` harus terpasang **versi
> terbaru** di database. Bila unggah tanda tangan ditolak dengan
> *"new row violates row-level security policy"* padahal berkas surat berhasil
> diunggah, berarti policy di database masih versi lama. Tempel isi berkas
> `supabase/perbaiki-policy-storage.sql` ke SQL Editor lalu **Run** (aman,
> idempoten), atau jalankan ulang `0002_rls.sql` secara utuh.

### Mengosongkan data surat

Setelah selesai menguji, kosongkan tabel surat (data pengguna & master tetap
utuh). Buka **SQL Editor → New query**, tempel isi berkas
`supabase/reset_data_surat.sql`, lalu **Run**.

---

## 8. Menjalankan pengingat tanpa pg_cron

Route server berikut menjalankan pengingat batas waktu dengan service_role:

```bash
curl -H "x-cron-secret: $CRON_SECRET" http://localhost:3000/api/cron/reminder
```

Jawabannya `{"sukses":true,"data":{"reminder":2,"overdue":0}}`. Route ini yang
dipakai bila `pg_cron` tidak aktif, dan bisa dijadwalkan dari Vercel Cron /
GitHub Actions / cron sistem.

---

## 9. Pemecahan masalah

| Gejala | Penyebab | Solusi |
|---|---|---|
| Login: "Email atau kata sandi salah" | Akun Auth belum dibuat | Jalankan `npm run seed:supabase` |
| Login: "Akun tidak aktif" | `users.aktif = false` | Admin → Pengguna → aktifkan |
| Halaman login masih **Mode Demo** | `NEXT_PUBLIC_SUPABASE_URL` kosong / belum restart | Isi `.env.local`, restart `npm run dev` |
| Semua RPC gagal dengan `42501` | `auth_id` belum terisi | Jalankan `npm run seed:supabase` |
| `relation "public.xxx" does not exist` | Migrasi belum lengkap | Jalankan `0001`–`0006` berurutan |
| `column "x" of relation "y" does not exist` | Versi lama `reset_data_surat.sql` masih dipakai | Pakai berkas di `supabase/reset_data_surat.sql` |
| Berkas PDF tidak tampil | Objek belum ada di bucket / `berkas_path` kosong | Unggah ulang berkas dari UI; `berkas_path` kosong memakai "Format Acuan Dinas" |
| `permission denied for table users` | Melanggil RLS langsung dari browser | Semua tulisan harus lewat RPC `rpc_*` |
| Pengingat tidak pernah muncul | `pg_cron` belum aktif atau `CRON_SECRET` kosong | Aktifkan `pg_cron`, atau panggil route `/api/cron/reminder` |
| `Failed to fetch` saat menyimpan | Kredensial salah / proyek mati | Cek `SUPABASE_URL` & `ANON_KEY` di Dashboard |
| `npm run supabase:migrate` → `ENOTFOUND db.xxxx.supabase.co` | Jaringan tanpa IPv6 | Pakai host pooler: `aws-0-<region>.pooler.supabase.com` |
| `npm run supabase:migrate` → `password authentication failed` | Password salah / belum di-URL-encode | Samakan dengan password database di Dashboard |
| Migrasi berhenti di tengah | Galat SQL pada berkas tersebut | Lihat pesan galat, perbaiki, ulangi `npm run supabase:migrate` (otomatis melewati yang sudah berhasil) |
| Unggah tanda tangan ditolak, berkas surat diterima | Policy Storage versi lama di database | Tempel `supabase/perbaiki-policy-storage.sql` ke SQL Editor → Run |
| `npm run test:rls` GAGAL "tidak ditemukan di schema cache" | Cache skema PostgREST belum dimuat ulang | Tunggu sebentar, lalu ulangi; bila tetap, jalankan `NOTIFY pgrst, 'reload schema';` di SQL Editor |

Pemeriksaan cepat SQL bila ragu pada skema:

```bash
npm run check:migrasi                   # eksekusi seluruh migrasi di PGlite (tanpa Supabase)
python scripts/check-sql.py            # sintaks Postgres
python scripts/check-sql-semantics.py   # nama tabel/kolom/fungsi
```

---

## 10. Berkas penting

| Berkas | Isi |
|---|---|
| `supabase/migrations/*.sql` | skema, RLS, RPC, seed (jalankan berurutan) |
| `supabase/reset_data_surat.sql` | kosongkan data surat |
| `supabase/perbaiki-policy-storage.sql` | perbaikan policy RLS bucket Storage (satu kali jalan) |
| `scripts/migrate.mjs` | jalankan migrasi ke proyek sungguhan (`npm run supabase:migrate`) |
| `scripts/cek-migrasi-pglite.mjs` | periksa migrasi secara lokal tanpa Supabase (`npm run check:migrasi`) |
| `scripts/seed-supabase.mjs` | buat akun Auth + selaraskan `auth_id` |
| `scripts/uji-rls.mjs` | skenario uji §7 + aturan RLS (`npm run test:rls`) |
| `scripts/uji-storage.mjs` | uji aturan RLS bucket Storage (`npm run test:storage`) |
| `src/lib/demo-akun.json` | daftar akun demo (sumber kata sandi) |
| `src/lib/supabase/server.ts` | klien server + `getSupabaseAdmin()` (service_role) |
| `src/app/api/files/[...path]/route.ts` | streaming berkas privat setelah cek visibilitas |
| `src/app/api/cron/reminder/route.ts` | pemicu pengingat batas waktu |
| `.env.example` | templat konfigurasi (tanpa nilai rahasia) |
