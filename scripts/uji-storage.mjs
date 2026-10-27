// =============================================================================
// uji-storage.mjs — Menguji aturan RLS pada bucket Storage privat.
//
// memakai session JWT pengguna sungguhan (bukan service role), sehingga yang
// diuji benar-benar policy di storage.objects.
//
// Yang diuji:
//   1. Unggah berkas surat ke folder yang diizinkan (masuk/keluar/laporan)
//   2. Unggah ke path di luar pola → harus DITOLAK
//   3. Unggah tanda tangan milik sendiri → harus DITERIMA
//   4. Unggah tanda tangan milik pengguna lain → harus DITOLAK
//
// Jalankan: npm run test:storage
// =============================================================================

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const AKAR = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Baca berkas .env.local secara sederhana (KEY=VALUE per baris). */
function bacaEnv(path) {
  if (!path) return {};
  let isi;
  try {
    isi = readFileSync(path, 'utf8');
  } catch {
    return {};
  }
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

const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!URL || !ANON) {
  console.error('Gagal: NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY belum diisi.');
  process.exit(1);
}

let lulus = 0;
let gagal = 0;
function cek(nama, ekspektasi, aktual) {
  const ok = JSON.stringify(ekspektasi) === JSON.stringify(aktual);
  if (ok) lulus += 1;
  else gagal += 1;
  console.log(`  ${ok ? 'LULUS' : 'GAGAL'}  ${nama}`);
  if (!ok) console.log(`          diharapkan: ${JSON.stringify(ekspektasi)} | aktual: ${JSON.stringify(aktual)}`);
}

async function masuk(email, password) {
  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Login ${email}: ${error.message}`);
  return c;
}

// PDF kecil yang sah untuk uji unggah.
const pdf = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
    '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
    '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\n' +
    'trailer<</Root 1 0 R>>\n%%EOF'
);

const petugas = await masuk('petugas1@distan.go.id', 'petugas123');
const idPengguna = 'u-2'; // petugas1

console.log('=== Unggah berkas surat ===');
const objek = `masuk/${crypto.randomUUID()}/uji-storage.pdf`;
const up = await petugas.storage.from('berkas-surat').upload(objek, pdf, {
  contentType: 'application/pdf',
  upsert: false,
});
cek('path folder yang diizinkan diterima', null, up.error?.message ?? null);

const upBuruk = await petugas.storage.from('berkas-surat').upload('masuk/lain/uji-storage.pdf', pdf, {
  contentType: 'application/pdf',
  upsert: false,
});
cek('path di luar pola ditolak', true, upBuruk.error !== null);

console.log('\n=== Unggah tanda tangan ===');
const ttdSendiri = await petugas.storage
  .from('tanda-tangan')
  .upload(`ttd/${idPengguna}.png`, pdf, { contentType: 'image/png', upsert: true });
cek('tanda tangan milik sendiri diterima', null, ttdSendiri.error?.message ?? null);

const ttdLain = await petugas.storage
  .from('tanda-tangan')
  .upload('ttd/u-5.png', pdf, { contentType: 'image/png', upsert: true });
cek('tanda tangan milik pengguna lain ditolak', true, ttdLain.error !== null);

console.log('\n=== Bersihkan berkas uji ===');
await petugas.storage.from('berkas-surat').remove([objek]);
await petugas.storage.from('tanda-tangan').remove([`ttd/${idPengguna}.png`]);
console.log('  berkas uji dihapus.');

console.log(`\nRingkasan: lulus ${lulus}, gagal ${gagal}.`);
process.exit(gagal > 0 ? 1 : 0);
