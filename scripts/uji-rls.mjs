// =============================================================================
// uji-rls.mjs — Skenario uji §7 dari PANDUAN-SUPABASE.md.
//
// Menjalankan alur bisnis nyata memakai session Supabase Auth sungguhan
// (selalu lewat anon key + JWT pengguna, bukan service role), sehingga yang
// diuji benar-benar aturan RLS di Postgres — bukan penyaringan di UI.
//
// Yang diuji:
//   1. Penomoran agenda saat dua pencatatan berjalan bersamaan
//   2. Pembuatan kartu disposisi hanya oleh petugas surat
//   3. Visibilitas disposisi per peran (admin TIDAK boleh membaca)
//   4. Penugasan ke staf dan pembatasan antar bidang
//   5. Notifikasi masuk ke kotak masuk yang tepat
//
// Semua data uji dibuat dan dibersihkan kembali di akhir.
//
// Jalankan: npm run test:rls
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
const SVC = env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !ANON || !SVC) {
  console.error(
    'Gagal: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, dan\n' +
      'SUPABASE_SERVICE_ROLE_KEY belum diisi pada .env.local.'
  );
  process.exit(1);
}

// service role hanya untuk pembersihan data uji.
const admin = createClient(URL, SVC, { auth: { persistSession: false } });
const mulai = new Date(Date.now() - 60000).toISOString();

let lulus = 0;
let gagal = 0;

function cek(nama, ekspektasi, aktual) {
  const ok = JSON.stringify(ekspektasi) === JSON.stringify(aktual);
  if (ok) lulus += 1;
  else gagal += 1;
  console.log(`  ${ok ? 'LULUS' : 'GAGAL'}  ${nama}`);
  if (!ok) {
    console.log(`          diharapkan: ${JSON.stringify(ekspektasi)} | aktual: ${JSON.stringify(aktual)}`);
  }
}

/** Masuk sebagai pengguna nyata; klien membawa session JWT. */
async function masuk(email, password) {
  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Login ${email}: ${error.message}`);
  return c;
}

const stamp = Date.now().toString(36).slice(-6);
const isiSurat = (nama) => ({
  p_asal_surat: 'Uji RLS',
  p_nomor_surat_asal: `UJI-${nama}-${stamp}`,
  p_tanggal_surat_asal: '2026-10-01',
  p_tanggal_terima: '2026-10-27',
  p_perihal: `Uji RLS ${nama} ${stamp}`,
  p_klasifikasi_id: 'kl-1',
  p_jenis_surat_id: 'js-1',
  p_sifat: 'biasa',
});

const P = {};
let smIds = [];
let disposisiIds = [];

try {
  console.log('=== 1. Login semua peran ===');
  P.admin = await masuk('admin@distan.go.id', 'admin123');
  P.petugas = await masuk('petugas1@distan.go.id', 'petugas123');
  P.kadis = await masuk('kadis@distan.go.id', 'kadis123');
  P.kabidTph = await masuk('kabid.tph@distan.go.id', 'kabid123');
  P.kabidPerk = await masuk('kabid.perkebunan@distan.go.id', 'kabid123');
  P.sekretaris = await masuk('sekretaris@distan.go.id', 'sekretaris123');
  P.stafTph = await masuk('staf.tph@distan.go.id', 'staf123');
  console.log(`  ${Object.keys(P).length} peran berhasil login.\n`);

  console.log('=== 2. Penomoran agenda: dua pencatatan simultan ===');
  const [r1, r2] = await Promise.all([
    P.petugas.rpc('rpc_catat_surat_masuk', isiSurat('A')),
    P.petugas.rpc('rpc_catat_surat_masuk', isiSurat('B')),
  ]);
  cek('kedua pencatatan berhasil', [null, null], [r1.error?.message ?? null, r2.error?.message ?? null]);
  smIds.push(r1.data?.id, r2.data?.id);
  const ag = [Number(r1.data?.nomorAgenda), Number(r2.data?.nomorAgenda)].sort((a, b) => a - b);
  cek('nomor agenda unik', 2, new Set([r1.data?.nomorAgenda, r2.data?.nomorAgenda]).size);
  cek('nomor agenda berurutan (selisih 1)', 1, ag[1] - ag[0]);
  console.log(`          agenda: ${r1.data?.nomorAgenda} dan ${r2.data?.nomorAgenda}`);

  console.log('\n=== 3. Kartu disposisi dibuat petugas surat ===');
  for (const nama of ['C', 'D', 'E']) {
    const r = await P.petugas.rpc('rpc_catat_surat_masuk', isiSurat(nama));
    smIds.push(r.data?.id);
  }
  for (const smId of smIds.slice(2)) {
    const r = await P.petugas.rpc('rpc_buat_disposisi', { p_surat_masuk_id: smId });
    if (r.error) console.log(`          galat: ${r.error.message}`);
    disposisiIds.push(r.data?.id);
  }
  cek('tiga kartu disposisi dibuat', 3, disposisiIds.filter(Boolean).length);

  const salahPeran = await P.kadis.rpc('rpc_buat_disposisi', { p_surat_masuk_id: smIds[2] });
  cek('kadis tidak boleh membuat kartu disposisi', '42501', salahPeran.error?.code ?? null);

  console.log('\n=== 4. Disposisi oleh Kepala Dinas ===');
  const beri = async (idx, targets) =>
    P.kadis.rpc('rpc_beri_disposisi', {
      p_disp_id: disposisiIds[idx],
      p_instruksi: 'tindak_lanjuti',
      p_bidang_tujuan_ids: targets,
      p_catatan: 'Uji RLS',
      p_tenggat: '2026-11-30',
    });
  // C → uk-2 (perkebunan) ; D → uk-3 (TPH) ; E → uk-2 + uk-3 (lintas bidang)
  const hasilBeri = [await beri(0, ['uk-2']), await beri(1, ['uk-3']), await beri(2, ['uk-2', 'uk-3'])];
  cek('semua disposisi diberi tujuan', [null, null, null], hasilBeri.map((h) => h.error?.message ?? null));

  console.log('\n=== 5. Visibilitas disposisi per peran (RLS) ===');
  const hitung = async (c) => {
    const { data, error } = await c.from('disposisi').select('id');
    return error ? `ERR ${error.message}` : data.length;
  };
  const vis = {
    admin: await hitung(P.admin),
    petugas: await hitung(P.petugas),
    kadis: await hitung(P.kadis),
    kabidTph: await hitung(P.kabidTph),
    kabidPerk: await hitung(P.kabidPerk),
    sekretaris: await hitung(P.sekretaris),
    stafTph: await hitung(P.stafTph),
  };
  cek('admin TIDAK boleh melihat disposisi', 0, vis.admin);
  cek('petugas surat melihat semua disposisi', 3, vis.petugas);
  cek('kepala dinas melihat semua disposisi', 3, vis.kadis);
  cek('kabid TPH hanya melihat disposisi ke uk-3', 2, vis.kabidTph);
  cek('kabid perkebunan hanya melihat disposisi ke uk-2', 2, vis.kabidPerk);
  cek('sekretaris hanya melihat disposisi lintas bidang', 1, vis.sekretaris);
  cek('staf tanpa penugasan tidak melihat disposisi', 0, vis.stafTph);
  console.log('          ' + JSON.stringify(vis));

  console.log('\n=== 6. Penugasan ke staf ===');
  const rTerima = await P.kabidTph.rpc('rpc_terima_disposisi', { p_disp_id: disposisiIds[1] });
  cek('kabid TPH menerima disposisi', null, rTerima.error?.message ?? null);
  const rTugas = await P.kabidTph.rpc('rpc_teruskan_ke_staf', {
    p_disp_id: disposisiIds[1],
    p_staf_id: 'u-12',
    p_catatan_penugasan: 'Uji RLS',
  });
  cek('kabid TPH meneruskan ke staf TPH', null, rTugas.error?.message ?? null);
  cek('staf TPH melihat disposisi yang ditugaskan', 1, await hitung(P.stafTph));
  const { data: penugasan } = await P.stafTph.from('penugasan_staf').select('id');
  cek('staf hanya melihat penugasan miliknya', 1, penugasan?.length ?? 0);
  const { data: penugasanPerk } = await P.kabidPerk.from('penugasan_staf').select('id');
  cek('kabid perkebunan tidak melihat penugasan bidang lain', 0, penugasanPerk?.length ?? 0);

  console.log('\n=== 7. Admin tetap tidak boleh membaca isi disposisi ===');
  const { data: dispAdmin } = await P.admin.from('disposisi').select('*');
  cek('SELECT * disposisi oleh admin mengembalikan kosong', 0, dispAdmin?.length ?? 0);
  const { data: dispPetugas } = await P.petugas.from('disposisi').select('*');
  cek('petugas surat membaca isi disposisi', 3, dispPetugas?.length ?? 0);

  console.log('\n=== 8. Notifikasi masuk ke kotak masuk yang tepat ===');
  const { data: notif } = await admin.from('notifikasi').select('user_id').gte('created_at', mulai);
  cek('kadis menerima notifikasi surat perlu disposisi', true, (notif ?? []).some((n) => n.user_id === 'u-5'));
} finally {
  console.log('\n=== 9. Hapus data uji ===');
  const yatim = (await admin.from('surat_masuk').select('id').eq('asal_surat', 'Uji RLS')).data ?? [];
  const semuaSm = [...new Set([...smIds, ...yatim.map((s) => s.id)])].filter(Boolean);
  if (disposisiIds.length) await admin.from('disposisi').delete().in('id', disposisiIds);
  if (semuaSm.length) {
    await admin.from('arsip_digital').delete().in('surat_masuk_id', semuaSm);
    await admin.from('surat_masuk').delete().in('id', semuaSm);
  }
  await admin.from('notifikasi').delete().gte('created_at', mulai);
  await admin.from('riwayat_status').delete().gte('created_at', mulai);
  await admin.from('log_aktivitas').delete().gte('waktu', mulai);

  const { count: sisaSm } = await admin.from('surat_masuk').select('*', { count: 'exact', head: true });
  const { count: sisaDisp } = await admin.from('disposisi').select('*', { count: 'exact', head: true });
  const { count: sisaLog } = await admin.from('log_aktivitas').select('*', { count: 'exact', head: true });
  console.log(`  surat_masuk: ${sisaSm} | disposisi: ${sisaDisp} | log_aktivitas: ${sisaLog}`);
}

console.log(`\nRingkasan: lulus ${lulus}, gagal ${gagal}.`);
process.exit(gagal > 0 ? 1 : 0);
