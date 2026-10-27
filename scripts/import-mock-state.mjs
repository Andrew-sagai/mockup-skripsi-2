// =============================================================================
// import-mock-state.mjs — Impor state mockup lama (localStorage) ke Postgres.
//
//_opsional_: dipakai bila Anda punya data lama dari Mode Demo yang ingin
// dipindahkan ke Supabase. Data contoh bawaan sudah tersedia lewat migrasi
// `0005_seed_contoh.sql`, jadi skrip ini tidak wajib.
//
// CARA PAKAI
//   1. Di browser Mode Demo, buka Console dan jalankan:
//        copy(JSON.stringify(JSON.parse(localStorage.getItem('surat-dinas-state-v6'))))
//      lalu simpan hasilnya ke berkas `mock-state.json`.
//   2. Jalankan:
//        npm run import:mock -- mock-state.json
//
// Yang dikonversi:
//   - `disposisi[].bidangTujuan[]`  → tabel anak `disposisi_bidang_tujuan`
//   - `disposisi[].statusPerBidang` → DIBUANG (sudah jadi kolom status_proses)
//   - tanda tangan dataURL          → bucket Storage `tanda-tangan`
//   - berkas dataURL                → bucket Storage `berkas-surat`
//
// ENV yang dibutuhkan: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (lihat .env.local)
// =============================================================================

import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const AKAR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BUCKET_BERKAS = 'berkas-surat';
const BUCKET_TTD = 'tanda-tangan';

function bacaEnv(path) {
  if (!existsSync(path)) return {};
  const hasil = {};
  for (const baris of readFileSync(path, 'utf8').split(/\r?\n/)) {
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
      'Isi keduanya pada .env.local di akar proyek, lalu jalankan ulang.'
  );
  process.exit(1);
}

const berkasMasukan = process.argv[2];
if (!berkasMasukan) {
  console.error(
    'Pemakaian: node scripts/import-mock-state.mjs <berkas-json>\n' +
      'Contoh: node scripts/import-mock-state.mjs mock-state.json'
  );
  process.exit(1);
}

const pathMasukan = resolve(process.cwd(), berkasMasukan);
if (!existsSync(pathMasukan)) {
  console.error(`Berkas tidak ditemukan: ${pathMasukan}`);
  process.exit(1);
}

let state;
try {
  const mentah = JSON.parse(readFileSync(pathMasukan, 'utf8'));
  state = mentah?.state ?? mentah;
} catch (galat) {
  console.error(`Berkas bukan JSON yang valid: ${galat.message}`);
  process.exit(1);
}

if (!state || typeof state !== 'object') {
  console.error('Isi berkas tidak dikenali sebagai state aplikasi.');
  process.exit(1);
}

const admin = createClient(URL_SUPABASE, KUNCI_SERVICE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Utilitas pemetaan ───────────────────────────────────────────────────────

/** Ubah ke format tanggal 'YYYY-MM-DD' bila memungkinkan. */
function tgl(v) {
  if (!v) return null;
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

/** Ubah ke timestamptz ISO bila memungkinkan. */
function waktu(v) {
  if (!v) return null;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Buang kunci yang nilainya undefined (PostgREST menolak null tak-terduga). */
function bersihkan(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

/** Nilai status surat keluar versi lama → versi skema baru. */
const PETA_STATUS_SK = { draft: 'draf' };

function idAcak() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function namaBerkas(nama, ekstensi) {
  const dasar = (nama || 'berkas').replace(/[^\w.\-]+/g, '_').slice(-100);
  return dasar.toLowerCase().endsWith(ekstensi) ? dasar : `${dasar}${ekstensi}`;
}

/** Unggah dataURL ke bucket; kembalikan path objek atau null bila gagal. */
async function unggahDataUrl(bucket, objek, dataUrl) {
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const { error } = await admin.storage.from(bucket).upload(objek, blob, {
      contentType: blob.type || 'application/octet-stream',
      upsert: true,
    });
    if (error) throw new Error(error.message);
    return `${bucket}/${objek}`;
  } catch (galat) {
    console.warn(`  ! gagal unggah ${objek}: ${galat.message}`);
    return null;
  }
}

// ── Penyimpanan baris ───────────────────────────────────────────────────────

const ringkasan = { users: 0, suratMasuk: 0, disposisi: 0, bidangTujuan: 0, penugasan: 0, tindakLanjut: 0, suratKeluar: 0, persetujuan: 0, arsip: 0, notifikasi: 0, berkas: 0, ttd: 0 };

async function simpan(tabel, baris, onConflict = 'id') {
  if (!baris.length) return;
  for (let i = 0; i < baris.length; i += 200) {
    const potong = baris.slice(i, i + 200);
    const { error } = await admin.from(tabel).upsert(potong, { onConflict });
    if (error) {
      console.error(`  ! ${tabel}: ${error.message}`);
      process.exitCode = 1;
    }
  }
}

function catatLegacy(sumber, tabel, id, payload) {
  return {
    id: `imp-${sumber}-${tabel}-${id}`.replace(/[^\w-]+/g, '-').slice(0, 120),
    sumber,
    nama_tabel: tabel,
    id_legacy: String(id),
    payload: bersihkan(payload),
  };
}

// ── 1. Unit kerja ───────────────────────────────────────────────────────────
const unitKerja = (state.unitKerja ?? []).map((u) => ({
  id: String(u.id),
  kode: u.kode ?? null,
  nama: u.nama ?? '',
  jenis: u.jenis === 'sekretariat' ? 'sekretariat' : 'bidang',
  label_lembar: u.labelLembar ?? null,
  urutan_lembar: u.urutanLembar ?? null,
  aktif: u.aktif !== false,
  created_at: waktu(u.createdAt) ?? new Date().toISOString(),
  updated_at: new Date().toISOString(),
}));

const klasifikasi = (state.klasifikasi ?? []).map((k) => ({
  id: String(k.id),
  kode: k.kode ?? null,
  nama: k.nama ?? '',
  uraian: k.uraian ?? null,
  unit_kerja_id: k.unitKerjaId ?? null,
  aktif: k.aktif !== false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}));

const jenisSurat = (state.jenisSurat ?? []).map((j) => ({
  id: String(j.id),
  nama: j.nama ?? '',
  keterangan: j.keterangan ?? '',
  utama: j.utama === true,
  aktif: j.aktif !== false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}));

const dataMaster = (state.dataMaster ?? []).map((d) => ({
  id: String(d.id),
  kategori: d.kategori ?? 'sifat_surat',
  kode: d.kode ?? null,
  label: d.label ?? '',
  keterangan: d.keterangan ?? null,
  aktif: d.aktif !== false,
  urutan: d.urutan ?? 0,
  meta: d.meta ?? null,
  created_at: waktu(d.createdAt) ?? new Date().toISOString(),
  updated_at: new Date().toISOString(),
}));

// ── 2. Pengguna (tanpa menyentuh auth_id) ────────────────────────────────────
const barisUsers = (state.users ?? []).map((u) => ({
  id: String(u.id),
  nama: u.nama ?? '',
  email: u.email ?? '',
  role: u.role ?? 'staf_pelaksana',
  unit_kerja_id: u.unitKerjaId ?? null,
  nip: u.nip ?? null,
  jabatan: u.jabatan ?? null,
  url_tanda_tangan: null,
  aktif: u.aktif !== false,
  created_at: waktu(u.createdAt) ?? new Date().toISOString(),
  updated_at: new Date().toISOString(),
}));

// ── 3. Surat masuk ───────────────────────────────────────────────────────────
const barisSuratMasuk = [];
for (const s of state.suratMasuk ?? []) {
  let berkasPath = '';
  if (typeof s.berkasUrl === 'string' && s.berkasUrl.startsWith('data:')) {
    const objek = `masuk/${idAcak()}/${namaBerkas(s.id, '.pdf')}`;
    berkasPath = (await unggahDataUrl(BUCKET_BERKAS, objek, s.berkasUrl)) ?? '';
    if (berkasPath) ringkasan.berkas += 1;
  }
  barisSuratMasuk.push({
    id: String(s.id),
    nomor_agenda: String(s.nomorAgenda ?? s.id),
    nomor_urut: s.nomorUrut ?? null,
    nomor_berkas: s.nomorBerkas ?? null,
    nomor_petunjuk: s.nomorPetunjuk ?? null,
    nomor_paket: s.nomorPaket ?? null,
    tanggal_terima: tgl(s.tanggalTerima) ?? tgl(s.createdAt),
    asal_surat: s.asalSurat ?? '',
    nomor_surat_asal: s.nomorSuratAsal ?? '',
    tanggal_surat_asal: tgl(s.tanggalSuratAsal),
    perihal: s.perihal ?? '',
    klasifikasi_id: s.klasifikasiId ?? (klasifikasi[0]?.id ?? null),
    jenis_surat_id: s.jenisSuratId ?? null,
    sifat: s.sifat ?? 'biasa',
    batas_waktu_surat: tgl(s.batasWaktuSurat),
    berkas_path: berkasPath,
    status: s.status ?? 'diagenda',
    pencatat_id: s.pencatatId ?? (barisUsers[0]?.id ?? null),
    created_at: waktu(s.createdAt) ?? new Date().toISOString(),
    updated_at: waktu(s.updatedAt) ?? new Date().toISOString(),
  });
}

// ── 4. Disposisi + bidang tujuan ────────────────────────────────────────────
const barisDisposisi = [];
const barisBidangTujuan = [];
for (const d of state.disposisi ?? []) {
  barisDisposisi.push({
    id: String(d.id),
    surat_masuk_id: String(d.suratMasukId ?? ''),
    dibuat_oleh: d.dibuatOleh ?? null,
    instruksi: d.instruksi ?? 'lainnya',
    instruksi_lainnya: d.instruksiLainnya ?? null,
    instruksi_list: JSON.stringify(d.instruksiList ?? []),
    catatan_kepala: d.catatanKepala ?? null,
    catatan_kadin: d.catatanKadin ?? null,
    catatan_koordinasi: d.catatanKoordinasi ?? null,
    catatan_koordinasi_sekdin: d.catatanKoordinasiSekdin ?? null,
    tenggat: tgl(d.tenggat) ?? new Date().toISOString().slice(0, 10),
    status: d.status ?? 'menunggu_disposisi',
    keputusan_kd: d.keputusanKd ?? null,
    lintas_bidang: d.lintasBidang === true,
    sifat: d.sifat ?? null,
    paraf_kd_oleh: d.parafKdOleh ?? null,
    paraf_kd_at: waktu(d.parafKdAt),
    paraf_kd_ip: d.parafKdIp ?? null,
    paraf_kepala_waktu: waktu(d.parafKepalaWaktu),
    paraf_kadin_oleh: d.parafKadinOleh ?? null,
    paraf_kadin_waktu: waktu(d.parafKadinWaktu),
    ttd_nama_snapshot: d.ttdNamaSnapshot ?? null,
    ttd_nip_snapshot: d.ttdNipSnapshot ?? null,
    ttd_jabatan_snapshot: d.ttdJabatanSnapshot ?? null,
    snapshot_surat: d.snapshotSurat ? JSON.stringify(d.snapshotSurat) : null,
    perlu_surat_jawaban: d.perluSuratJawaban === true,
    reminder_sent_at: waktu(d.reminderSentAt),
    overdue_sent_at: waktu(d.overdueSentAt),
    created_at: waktu(d.createdAt) ?? new Date().toISOString(),
    updated_at: waktu(d.updatedAt) ?? new Date().toISOString(),
  });

  // `statusPerBidang` dibuang — status per bidang kini ada di `status_proses`.
  for (const t of d.bidangTujuan ?? []) {
    barisBidangTujuan.push({
      id: String(t.id),
      disposisi_id: String(d.id),
      tipe: t.tipe === 'sekretaris' ? 'sekretaris' : 'bidang',
      unit_kerja_id: t.unitKerjaId ?? (unitKerja[0]?.id ?? null),
      urutan: t.urutan ?? 0,
      kepala_bidang_id: t.kepalaBidangId ?? null,
      status_terima: t.statusTerima === 'diterima' ? 'diterima' : 'belum',
      waktu_terima: waktu(t.waktuTerima),
      nama_penerima_snapshot: t.namaPenerimaSnapshot ?? null,
      paraf_penerimaan_snapshot: t.parafPenerimaanSnapshot ?? null,
      waktu_paraf_penerimaan: waktu(t.waktuParafPenerimaan),
      status_proses: t.statusProses ?? null,
      diteruskan_ke: t.diteruskanKe ?? null,
      catatan_penugasan: t.catatanPenugasan ?? null,
      created_at: waktu(d.createdAt) ?? new Date().toISOString(),
      updated_at: waktu(d.updatedAt) ?? new Date().toISOString(),
    });
  }
}

// ── 5. Penugasan & tindak lanjut ────────────────────────────────────────────
const barisPenugasan = (state.penugasan ?? []).map((p) => ({
  id: String(p.id),
  disposisi_id: String(p.disposisiId ?? ''),
  staf_id: String(p.stafId ?? ''),
  kepala_bidang_id: String(p.kepalaBidangId ?? ''),
  catatan_penugasan: p.catatanPenugasan ?? '',
  catatan_progres: p.catatanProgres ?? null,
  status: p.status ?? 'ditugaskan',
  created_at: waktu(p.createdAt) ?? new Date().toISOString(),
  updated_at: new Date().toISOString(),
}));

const barisTindakLanjut = [];
for (const t of state.tindakLanjut ?? []) {
  let berkasPath = null;
  if (typeof t.berkasUrl === 'string' && t.berkasUrl.startsWith('data:')) {
    const objek = `laporan/${idAcak()}/${namaBerkas(t.id, '.pdf')}`;
    berkasPath = (await unggahDataUrl(BUCKET_BERKAS, objek, t.berkasUrl)) ?? null;
    if (berkasPath) ringkasan.berkas += 1;
  }
  barisTindakLanjut.push({
    id: String(t.id),
    disposisi_id: String(t.disposisiId ?? ''),
    penugasan_staf_id: t.penugasanStafId ?? null,
    pelaku_id: String(t.pelakuId ?? ''),
    uraian_hasil: t.uraianHasil ?? '',
    berkas_path: berkasPath,
    status: t.status ?? 'dilaporkan',
    catatan_pengembalian: t.catatanPengembalian ?? null,
    nomor_revisi: t.nomorRevisi ?? 1,
    created_at: waktu(t.createdAt) ?? new Date().toISOString(),
  });
}

// ── 6. Surat keluar + persetujuan ───────────────────────────────────────────
const barisSuratKeluar = [];
for (const s of state.suratKeluar ?? []) {
  let berkasPath = null;
  if (typeof s.berkasUrl === 'string' && s.berkasUrl.startsWith('data:')) {
    const objek = `keluar/${idAcak()}/${namaBerkas(s.id, '.pdf')}`;
    berkasPath = (await unggahDataUrl(BUCKET_BERKAS, objek, s.berkasUrl)) ?? null;
    if (berkasPath) ringkasan.berkas += 1;
  }
  barisSuratKeluar.push({
    id: String(s.id),
    nomor_urut: s.nomorUrut ?? null,
    nomor_berkas: s.nomorBerkas ?? null,
    nomor_petunjuk: s.nomorPetunjuk ?? null,
    nomor_paket: s.nomorPaket ?? null,
    sifat: s.sifat ?? null,
    nomor_surat: s.nomorSurat ?? null,
    perihal: s.perihal ?? '',
    tujuan: s.tujuan ?? '',
    klasifikasi_id: s.klasifikasiId ?? (klasifikasi[0]?.id ?? null),
    jenis_surat_id: s.jenisSuratId ?? null,
    isi_ringkas: s.isiRingkas ?? '',
    status: PETA_STATUS_SK[s.status] ?? s.status ?? 'draf',
    penyusun_id: String(s.penyusunId ?? (barisUsers[0]?.id ?? '')),
    tanggal_kirim: tgl(s.tanggalKirim),
    berkas_path: berkasPath,
    bukti_terima_tanggal: tgl(s.buktiTerimaTanggal),
    bukti_terima_nama: s.buktiTerimaNama ?? null,
    surat_masuk_asal_id: s.suratMasukAsalId ?? null,
    ref_surat_masuk_id: s.refSuratMasukId ?? null,
    ttd_nama_snapshot: s.ttdNamaSnapshot ?? null,
    ttd_nip_snapshot: s.ttdNipSnapshot ?? null,
    ttd_waktu_snapshot: waktu(s.ttdWaktuSnapshot),
    paraf_nama_snapshot: s.parafNamaSnapshot ?? null,
    paraf_waktu_snapshot: waktu(s.parafWaktuSnapshot),
    created_at: waktu(s.createdAt) ?? new Date().toISOString(),
    updated_at: waktu(s.updatedAt) ?? new Date().toISOString(),
  });
}

const barisPersetujuan = (state.persetujuan ?? []).map((p) => ({
  id: String(p.id),
  surat_keluar_id: String(p.suratKeluarId ?? ''),
  jenis: p.jenis ?? 'paraf_koordinasi',
  pelaku_id: String(p.pelakuId ?? ''),
  catatan: p.catatan ?? null,
  waktu: waktu(p.waktu) ?? new Date().toISOString(),
  nama_pelaku_snapshot: p.namaPelakuSnapshot ?? null,
  nip_pelaku_snapshot: p.nipPelakuSnapshot ?? null,
  jabatan_pelaku_snapshot: p.jabatanPelakuSnapshot ?? null,
}));

// ── 7. Arsip ─────────────────────────────────────────────────────────────────
const barisArsip = [];
for (const a of state.arsip ?? []) {
  let berkasPath = null;
  if (typeof a.berkasUrl === 'string' && a.berkasUrl.startsWith('data:')) {
    const objek = `laporan/${idAcak()}/${namaBerkas(a.id, '.pdf')}`;
    berkasPath = (await unggahDataUrl(BUCKET_BERKAS, objek, a.berkasUrl)) ?? null;
    if (berkasPath) ringkasan.berkas += 1;
  }
  barisArsip.push({
    id: String(a.id),
    surat_masuk_id: a.suratMasukId ?? null,
    surat_keluar_id: a.suratKeluarId ?? null,
    jenis_surat: a.jenisSurat === 'keluar' ? 'keluar' : 'masuk',
    kode_arsip: a.kodeArsip ?? String(a.id),
    berkas_path: berkasPath,
    perihal: a.perihal ?? '',
    nomor_surat: a.nomorSurat ?? '',
    tahun: a.tahun ?? new Date().getFullYear(),
    klasifikasi_id: a.klasifikasiId ?? null,
    jenis_surat_id: a.jenisSuratId ?? null,
    status_arsip: a.statusArsip ?? null,
    laporan_hasil: a.laporanHasil ?? null,
    tanggal_selesai: tgl(a.tanggalSelesai),
    surat_balasan_id: a.suratBalasanId ?? null,
    surat_balasan_nomor: a.suratBalasanNomor ?? null,
    surat_balasan_perihal: a.suratBalasanPerihal ?? null,
    is_surat_balasan: a.isSuratBalasan === true,
    created_at: waktu(a.createdAt) ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}

// ── 8. Notifikasi ───────────────────────────────────────────────────────────
const barisNotifikasi = (state.notifikasi ?? []).map((n) => ({
  id: String(n.id),
  user_id: String(n.userId ?? ''),
  judul: n.judul ?? '',
  pesan: n.pesan ?? '',
  tingkat: n.tingkat ?? 'info',
  dibaca: n.dibaca === true,
  tautan_url: n.tautanUrl ?? null,
  is_rahasia: n.isRahasia === true,
  kanal: n.kanal ?? null,
  status_kirim: n.statusKirim ?? null,
  pesan_galat: n.pesanGalat ?? null,
  created_at: waktu(n.createdAt) ?? new Date().toISOString(),
}));

// ── Simpan ───────────────────────────────────────────────────────────────────

console.log(`Mengimpor dari ${pathMasukan} ke ${URL_SUPABASE}\n`);

await simpan('unit_kerja', unitKerja);
await simpan('klasifikasi_surat', klasifikasi);
await simpan('jenis_surat', jenisSurat);
await simpan('data_master', dataMaster);
await simpan('users', barisUsers);
ringkasan.users = barisUsers.length;

await simpan('surat_masuk', barisSuratMasuk);
ringkasan.suratMasuk = barisSuratMasuk.length;

await simpan('disposisi', barisDisposisi);
ringkasan.disposisi = barisDisposisi.length;

await simpan('disposisi_bidang_tujuan', barisBidangTujuan, 'id');
ringkasan.bidangTujuan = barisBidangTujuan.length;

await simpan('penugasan_staf', barisPenugasan);
ringkasan.penugasan = barisPenugasan.length;

await simpan('tindak_lanjut', barisTindakLanjut);
ringkasan.tindakLanjut = barisTindakLanjut.length;

await simpan('surat_keluar', barisSuratKeluar);
ringkasan.suratKeluar = barisSuratKeluar.length;

await simpan('persetujuan_surat_keluar', barisPersetujuan);
ringkasan.persetujuan = barisPersetujuan.length;

await simpan('arsip_digital', barisArsip);
ringkasan.arsip = barisArsip.length;

await simpan('notifikasi', barisNotifikasi);
ringkasan.notifikasi = barisNotifikasi.length;

// Tanda tangan (dataURL) → Storage
for (const u of state.users ?? []) {
  const ttd = u.urlTandaTangan;
  if (typeof ttd !== 'string' || !ttd.startsWith('data:')) continue;
  const objek = `ttd/${String(u.id).replace(/[^\w.\-]+/g, '_')}.png`;
  const path = await unggahDataUrl(BUCKET_TTD, objek, ttd);
  if (!path) continue;
  const { error } = await admin.from('users').update({ url_tanda_tangan: path }).eq('id', String(u.id));
  if (error) console.error(`  ! users.url_tanda_tangan: ${error.message}`);
  else ringkasan.ttd += 1;
}

// Jejak impor
const jejak = [
  ...barisSuratMasuk.map((r) => catatLegacy('mock-state', 'surat_masuk', r.id, r)),
  ...barisDisposisi.map((r) => catatLegacy('mock-state', 'disposisi', r.id, r)),
  ...barisSuratKeluar.map((r) => catatLegacy('mock-state', 'surat_keluar', r.id, r)),
];
if (jejak.length) await simpan('import_legacy', jejak);

console.log('\nRingkasan impor:');
for (const [k, v] of Object.entries(ringkasan)) {
  console.log(`  ${k.padEnd(14)} ${v}`);
}
console.log('\nCatatan:');
console.log('  - `statusPerBidang` dibuang; status per bidang kini di kolom `status_proses`.');
console.log('  - Akun Auth tidak ikut diimpor. Jalankan `npm run seed:supabase` bila perlu.');
console.log('  - Pengguna tanpa akun Auth tidak bisa login, tetapi datanya tetap tersimpan.');

if (process.exitCode) {
  console.error('\nSebagian baris gagal disimpan — periksa galat di atas.');
  process.exit(1);
}
