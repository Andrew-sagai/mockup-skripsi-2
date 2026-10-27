// =============================================================================
// seed-supabase.mjs — Membuat akun Supabase Auth untuk pengguna demo.
//
// Skrip ini idempoten: menjalankannya berkali-kali aman. Akun yang sudah ada
// hanya diperbarui kata sandinya, dan `users.auth_id` selalu diselaraskan.
//
// ENV yang dibutuhkan (isi di .env.local):
//   SUPABASE_URL              (atau NEXT_PUBLIC_SUPABASE_URL)
//   SUPABASE_SERVICE_ROLE_KEY
//
// Jalankan: npm run seed:supabase
// =============================================================================

import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const AKAR = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Baca berkas .env.local secara sederhana (KEY=VALUE per baris). */
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

const URL_SUPABASE = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const KUNCI_SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL_SUPABASE || !KUNCI_SERVICE) {
  console.error(
    'Gagal: SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY belum diisi.\n' +
      'Isi keduanya pada berkas .env.local di akar proyek, lalu jalankan ulang.'
  );
  process.exit(1);
}

const akun = JSON.parse(readFileSync(resolve(AKAR, 'src/lib/demo-akun.json'), 'utf8'));

const admin = createClient(URL_SUPABASE, KUNCI_SERVICE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

console.log(`Menyiapkan ${akun.length} akun demo pada ${URL_SUPABASE}\n`);

const { data: daftar, error: errList } = await admin.auth.admin.listUsers({
  page: 1,
  perPage: 1000,
});
if (errList) {
  console.error('Gagal membaca daftar akun Auth:', errList.message);
  process.exit(1);
}
const authByEmail = new Map(
  (daftar?.users ?? []).map((u) => [(u.email ?? '').toLowerCase(), u.id])
);

let dibuat = 0;
let diperbarui = 0;
let gagal = 0;

for (const a of akun) {
  const email = a.email.toLowerCase();
  try {
    // Supabase menolak kata sandi kurang dari 6 karakter — beri pesan jelas
    // alih-alih galat dari server.
    if (typeof a.password === 'string' && a.password.length < 6) {
      throw new Error(
        `kata sandi demo hanya ${a.password.length} karakter (minimal 6). ` +
          `Perbaiki src/lib/demo-akun.json.`
      );
    }
    let authId = authByEmail.get(email);

    if (authId) {
      // Akun sudah ada — samakan kata sandi agar demo selalu bisa login.
      const { error } = await admin.auth.admin.updateUserById(authId, {
        password: a.password,
        email_confirm: true,
      });
      if (error) throw error;
      diperbarui += 1;
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: a.password,
        email_confirm: true,
      });
      if (error) throw error;
      authId = data.user.id;
      authByEmail.set(email, authId);
      dibuat += 1;
    }

    // Selaraskan `users.auth_id` dengan baris domain.
    const { error: errTaut } = await admin
      .from('users')
      .update({ auth_id: authId, updated_at: new Date().toISOString() })
      .eq('id', a.id);
    if (errTaut) throw errTaut;

    console.log(`  OK  ${a.role.padEnd(16)} ${email}`);
  } catch (galat) {
    gagal += 1;
    console.error(`  GAGAL ${email}: ${galat.message}`);
  }
}

console.log(`\nSelesai. Dibuat: ${dibuat}, diperbarui: ${diperbarui}, gagal: ${gagal}.`);
if (gagal > 0) process.exit(1);
