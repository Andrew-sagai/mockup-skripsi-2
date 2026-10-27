// =============================================================================
// migrate.mjs — Menjalankan migrasi Postgres ke proyek Supabase.
//
// Alternative yang lebih umum: tempel tiap berkas ke SQL Editor satu per satu.
// Skrip ini melakukan hal yang sama secara otomatis dan berurutan, sehingga
// tidak ada berkas yang terlewat.
//
// ENV yang dibutuhkan (isi di .env.local):
//   DATABASE_URL  — connection string Postgres proyek Supabase
//
// Jalankan:
//   npm run supabase:migrate              # jalankan yang belum terpasang
//   npm run supabase:migrate -- --force   # jalankan ulang semuanya
//   npm run supabase:migrate -- --only 0003_rpc.sql
// =============================================================================

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const AKAR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIR_MIGRASI = resolve(AKAR, 'supabase/migrations');

/** Baca berkas .env.local / .env secara sederhana (KEY=VALUE per baris). */
function bacaEnv(path) {
  if (!existsSync(path)) return {};
  const isi = readFileSync(path, 'utf8');
  const hasil = {};
  for (const baris of isi.split(/\r?\n/)) {
    const bersih = baris.trim();
    if (!bersih || bersih.startsWith('#')) continue;
    const idx = bersih.indexOf('=');
    if (idx < 0) continue;
    const kunci = bersih.slice(0, idx).trim();
    let nilai = bersih.slice(idx + 1).trim();
    if (
      (nilai.startsWith('"') && nilai.endsWith('"')) ||
      (nilai.startsWith("'") && nilai.endsWith("'"))
    ) {
      nilai = nilai.slice(1, -1);
    }
    hasil[kunci] = nilai;
  }
  return hasil;
}

const env = {
  ...bacaEnv(resolve(AKAR, '.env.local')),
  ...bacaEnv(resolve(AKAR, '.env')),
  ...process.env,
};

const argumen = process.argv.slice(2);
const paksa = argumen.includes('--force');
const idxOnly = argumen.indexOf('--only');
const hanya = idxOnly >= 0 ? argumen[idxOnly + 1] : null;

const DATABASE_URL = env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error(
    'Gagal: DATABASE_URL belum diisi.\n' +
      'Isi DATABASE_URL pada berkas .env.local di akar proyek, lalu jalankan ulang.\n' +
      'Connection string diambil dari Dashboard → Project Settings → Database → Connection string (URI).\n' +
      'Ganti <PASSWORD> dengan password database proyek Anda (huruf besar/kecil harus persis).'
  );
  process.exit(1);
}

if (!/^postgres(ql)?:\/\//i.test(DATABASE_URL)) {
  console.error(
    'Gagal: DATABASE_URL bukan connection string Postgres.\n' +
      `Nilai sekarang diawali "${DATABASE_URL.slice(0, 24)}…"\n` +
      'Isi dengan URI dari Dashboard → Project Settings → Database → Connection string (URI),\n' +
      'misal: postgresql://postgres.xxxx:password@db.xxxx.supabase.co:5432/postgres'
  );
  process.exit(1);
}

if (!existsSync(DIR_MIGRASI)) {
  console.error(`Gagal: direktori migrasi tidak ditemukan: ${DIR_MIGRASI}`);
  process.exit(1);
}

// Urutan = urutan nama berkas (0001, 0002, ... 0006).
const berkas = readdirSync(DIR_MIGRASI)
  .filter((f) => f.endsWith('.sql'))
  .sort();

if (hanya && !berkas.includes(hanya)) {
  console.error(`Gagal: berkas "${hanya}" tidak ada di ${DIR_MIGRASI}.`);
  console.error(`Tersedia: ${berkas.join(', ')}`);
  process.exit(1);
}

const client = new pg.Client({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
} catch (galat) {
  console.error('Gagal terhubung ke database:\n' + galat.message);
  console.error(
    '\nPeriksa DATABASE_URL. Catatan:\n' +
      '  - Connection string mode "Session pooler" (port 5432) paling aman untuk migrasi.\n' +
      '  - Password harus URL-encoded bila mengandung karakter khusus (@ : / ? #).\n' +
      '  - Bila muncul "ENOTFOUND db.xxx.supabase.co", pakai host pooler:\n' +
      '    aws-0-<region>.pooler.supabase.com'
  );
  process.exit(1);
}

// ── Tabel pencatat migrasi yang sudah jalan ────────────────────────────────
await client.query(`
  CREATE TABLE IF NOT EXISTS public._migrasi_log (
    nama       text primary key,
    applied_at timestamptz NOT NULL DEFAULT now()
  );
`);

const { rows: sudahJalan } = await client.query(
  'SELECT nama FROM public._migrasi_log'
);
const sudah = new Set(sudahJalan.map((r) => r.nama));

console.log(`Menerapkan ${berkas.length} migrasi ke ${redakUrl(DATABASE_URL)}\n`);

let dijalankan = 0;
let dilewati = 0;
let gagal = 0;

for (const nama of berkas) {
  if (hanya && nama !== hanya) continue;

  if (sudah.has(nama) && !paksa) {
    console.log(`  LEWAT  ${nama} (sudah pernah dijalankan)`);
    dilewati += 1;
    continue;
  }

  const sql = readFileSync(resolve(DIR_MIGRASI, nama), 'utf8');
  try {
    await client.query('BEGIN');
    // Satu berkas = satu transaksi. `pg` mengirimnya sebagai simple query,
    // sehingga seluruh pernyataan di berkas (termasuk body fungsi `$$`)
    // dieksekusi berurutan oleh Postgres.
    await client.query(sql);
    await client.query(
      `INSERT INTO public._migrasi_log (nama) VALUES ($1)
       ON CONFLICT (nama) DO UPDATE SET applied_at = now()`,
      [nama]
    );
    await client.query('COMMIT');
    console.log(`  OK     ${nama}`);
    dijalankan += 1;
  } catch (galat) {
    await client.query('ROLLBACK').catch(() => {});
    gagal += 1;
    console.error(`  GAGAL  ${nama}: ${galat.message}`);
    if (galat.position) {
      console.error(`         posisi karakter ${galat.position}`);
    }
    console.error('         Berkas lain tidak dijalankan. Perbaiki lalu ulangi.');
    break;
  }
}

await client.end();

console.log(
  `\nSelesai. Dijalankan: ${dijalankan}, dilewati: ${dilewati}, gagal: ${gagal}.`
);
if (gagal > 0) process.exit(1);

/** Samakan tampilan URL agar password tidak bocor ke terminal/log. */
function redakUrl(url) {
  try {
    const u = new URL(url);
    if (u.password) u.password = '********';
    return u.toString();
  } catch {
    return '(url tidak terbaca)';
  }
}
