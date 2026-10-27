// =============================================================================
// cek-migrasi-pglite.mjs — Menjalankan migrasi di PGlite (Postgres WASM).
//
// Tujuannya: membuktikan seluruh berkas di supabase/migrations benar-benar
// DIEKSEKUSI Postgres, tanpa butuh proyek Supabase, Docker, atau psql.
// Berguna sebagai pemeriksaan cepat sebelum migrasi ke proyek sungguhan.
//
// Yang diperiksa:
//   * setiap berkas migrasi dijalankan tanpa galat
//   * jumlah tabel & fungsi di schema public
//   * jumlah policy RLS
//   * jumlah baris seed pada tabel utama
//
// Jalankan: npm run check:migrasi
// =============================================================================

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { citext } from '@electric-sql/pglite/contrib/citext';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';

const AKAR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIR_MIGRASI = resolve(AKAR, 'supabase/migrations');

// Objek bawaan Supabase yang tidak ada di PGlite; dibuat tiruan agar migrasi
// bisa dieksekusi apa adanya.
const TIRUAN = `
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

CREATE SCHEMA IF NOT EXISTS storage;
CREATE TABLE IF NOT EXISTS storage.buckets (
  id text PRIMARY KEY, name text NOT NULL, public boolean NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS storage.objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text, name text, owner uuid
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
END
$$;
`;

const db = new PGlite({ extensions: { citext, pgcrypto } });

console.log('Menjalankan migrasi di PGlite (Postgres WASM)…\n');
await db.exec(TIRUAN);

const berkas = readdirSync(DIR_MIGRASI)
  .filter((f) => f.endsWith('.sql'))
  .sort();

let gagal = 0;
for (const nama of berkas) {
  const sql = readFileSync(resolve(DIR_MIGRASI, nama), 'utf8');
  try {
    await db.exec(sql);
    console.log(`  OK     ${nama}`);
  } catch (galat) {
    gagal += 1;
    console.error(`  GAGAL  ${nama}: ${galat.message}`);
    break;
  }
}

if (gagal > 0) {
  await db.close();
  process.exit(1);
}

const [{ rows: tabel }, { rows: fungsi }, { rows: policy }, { rows: seed }] = await Promise.all([
  db.query(`SELECT count(*)::int AS n FROM information_schema.tables
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`),
  db.query(`SELECT count(*)::int AS n FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'public'`),
  db.query(`SELECT count(*)::int AS n FROM pg_policies WHERE schemaname = 'public'`),
  db.query(`SELECT
              (SELECT count(*) FROM public.users)          AS pengguna,
              (SELECT count(*) FROM public.unit_kerja)     AS unit_kerja,
              (SELECT count(*) FROM public.surat_masuk)    AS surat_masuk,
              (SELECT count(*) FROM public.surat_keluar)   AS surat_keluar,
              (SELECT count(*) FROM public.arsip_digital)  AS arsip`),
]);

console.log('\nRingkasan:');
console.log(`  Tabel public : ${tabel[0].n}`);
console.log(`  Fungsi public: ${fungsi[0].n}`);
console.log(`  Policy RLS   : ${policy[0].n}`);
console.log(
  `  Seed         : ${seed[0].pengguna} pengguna, ${seed[0].unit_kerja} unit kerja, ` +
    `${seed[0].surat_masuk} surat masuk, ${seed[0].surat_keluar} surat keluar, ${seed[0].arsip} arsip`
);
console.log('\nSemua migrasi dapat dieksekusi. Aman untuk `npm run supabase:migrate`.');

await db.close();
