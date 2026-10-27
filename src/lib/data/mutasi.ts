'use client';

import type {
  JenisInstruksi,
  KategoriDataMaster,
  SifatSurat,
  SuratKeluar,
  SuratMasuk,
  UserRole,
} from '@/lib/types';
import { GalatData, rpc, sb } from './supabase';
import { unggahBerkas, unggahTandaTangan, hapusBerkasTandaTangan, pathTandaTangan, validasiBerkas } from './berkas';

/** Konteks yang dibutuhkan setiap mutasi: identitas pelaku + muat ulang cache. */
export interface Konteks {
  /** id domain pengguna yang sedang masuk (bukan auth.users.id) */
  penggunaId: string;
  /** auth.users.id pengguna yang sedang masuk */
  authId: string;
  /** email pengguna yang sedang masuk */
  email: string;
  /** muat ulang seluruh data ke cache aplikasi */
  muatUlang: () => Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Surat masuk
// ─────────────────────────────────────────────────────────────────────────────

export async function catatSuratMasuk(
  ctx: Konteks,
  data: Partial<SuratMasuk>,
  file: File | null
): Promise<string> {
  validasiBerkas(file, false, 'Berkas surat masuk');

  let berkasPath = '';
  if (file) {
    berkasPath = await unggahBerkas(file, 'masuk');
  }

  const hasil = await rpc<{ id: string; nomorAgenda: string; nomorUrut: number }>(
    'rpc_catat_surat_masuk',
    {
      p_nomor_urut: (data as any).nomorUrut ?? null,
      p_nomor_berkas: (data as any).nomorBerkas ?? null,
      p_nomor_petunjuk: (data as any).nomorPetunjuk ?? null,
      p_nomor_paket: (data as any).nomorPaket ?? null,
      p_tanggal_terima: data.tanggalTerima ?? null,
      p_asal_surat: data.asalSurat ?? null,
      p_nomor_surat_asal: data.nomorSuratAsal ?? null,
      p_tanggal_surat_asal: data.tanggalSuratAsal ?? null,
      p_perihal: data.perihal ?? null,
      p_klasifikasi_id: data.klasifikasiId ?? null,
      p_jenis_surat_id: data.jenisSuratId ?? null,
      p_sifat: data.sifat ?? 'biasa',
      p_batas_waktu_surat: (data as any).batasWaktuSurat ?? null,
      p_berkas_path: berkasPath,
    }
  );
  await ctx.muatUlang();
  return hasil.id;
}

export async function buatDisposisi(ctx: Konteks, suratMasukId: string): Promise<string> {
  const hasil = await rpc<{ id: string }>('rpc_buat_disposisi', { p_surat_masuk_id: suratMasukId });
  await ctx.muatUlang();
  return hasil.id;
}

// ─────────────────────────────────────────────────────────────────────────────
// Disposisi
// ─────────────────────────────────────────────────────────────────────────────

export async function beriDisposisi(
  ctx: Konteks,
  dispId: string,
  instruksi: JenisInstruksi,
  bidangTujuanIds: string[],
  catatan: string,
  tenggat: string,
  instruksiLainnya?: string,
  instruksiList?: { jenis: JenisInstruksi; teks?: string }[],
  sifat?: SifatSurat
): Promise<void> {
  await rpc('rpc_beri_disposisi', {
    p_disp_id: dispId,
    p_instruksi: instruksi,
    p_bidang_tujuan_ids: bidangTujuanIds,
    p_catatan: catatan ?? '',
    p_tenggat: tenggat || null,
    p_instruksi_lainnya: instruksiLainnya ?? null,
    p_instruksi_list: instruksiList ?? null,
    p_sifat: sifat ?? null,
  });
  await ctx.muatUlang();
}

export async function terimaDisposisi(ctx: Konteks, dispId: string): Promise<void> {
  await rpc('rpc_terima_disposisi', { p_disp_id: dispId });
  await ctx.muatUlang();
}

export async function teruskanKeStaf(
  ctx: Konteks,
  dispId: string,
  stafId: string,
  catatanPenugasan: string
): Promise<void> {
  await rpc('rpc_teruskan_ke_staf', {
    p_disp_id: dispId,
    p_staf_id: stafId,
    p_catatan_penugasan: catatanPenugasan ?? '',
  });
  await ctx.muatUlang();
}

export async function tindakLanjutLangsung(
  ctx: Konteks,
  dispId: string,
  uraianHasil: string,
  file: File | null,
  perluSuratJawaban: boolean
): Promise<void> {
  validasiBerkas(file, false, 'Berkas laporan');
  let berkasPath = '';
  if (file) {
    berkasPath = await unggahBerkas(file, 'laporan');
  }
  await rpc('rpc_tindak_lanjut_langsung', {
    p_disp_id: dispId,
    p_uraian_hasil: uraianHasil,
    p_berkas_path: berkasPath || null,
    p_perlu_surat_jawaban: perluSuratJawaban,
  });
  await ctx.muatUlang();
}

export async function simpanProgres(
  ctx: Konteks,
  dispId: string,
  catatanProgres: string
): Promise<void> {
  await rpc('rpc_simpan_progres', {
    p_disp_id: dispId,
    p_catatan_progres: catatanProgres ?? '',
  });
  await ctx.muatUlang();
}

export async function laporkanHasil(
  ctx: Konteks,
  dispId: string,
  uraianHasil: string,
  file: File | null
): Promise<void> {
  validasiBerkas(file, false, 'Berkas laporan');
  let berkasPath = '';
  if (file) {
    berkasPath = await unggahBerkas(file, 'laporan');
  }
  await rpc('rpc_laporkan_hasil', {
    p_disp_id: dispId,
    p_uraian_hasil: uraianHasil,
    p_berkas_path: berkasPath || null,
  });
  await ctx.muatUlang();
}

export async function periksaLaporan(
  ctx: Konteks,
  tlId: string,
  setuju: boolean,
  catatan: string,
  perluSuratJawaban: boolean
): Promise<void> {
  await rpc('rpc_periksa_laporan', {
    p_tl_id: tlId,
    p_setuju: setuju,
    p_catatan: catatan ?? '',
    p_perlu_surat_jawaban: perluSuratJawaban,
  });
  await ctx.muatUlang();
}

export async function beriCatatanSekdis(ctx: Konteks, dispId: string, catatan: string): Promise<void> {
  await rpc('rpc_beri_catatan_sekdis', { p_disp_id: dispId, p_catatan: catatan });
  await ctx.muatUlang();
}

export async function bubuhkanParaf(ctx: Konteks, dispId: string): Promise<void> {
  await rpc('rpc_bubuhkan_paraf', { p_disp_id: dispId });
  await ctx.muatUlang();
}

export async function tidakPerluDisposisi(ctx: Konteks, dispId: string, catatan: string): Promise<void> {
  await rpc('rpc_tidak_perlu_disposisi', { p_disp_id: dispId, p_catatan: catatan });
  await ctx.muatUlang();
}

// ─────────────────────────────────────────────────────────────────────────────
// Surat keluar
// ─────────────────────────────────────────────────────────────────────────────

export async function ajukanSuratKeluar(
  ctx: Konteks,
  data: Partial<SuratKeluar>,
  asDraft: boolean
): Promise<string> {
  const hasil = await rpc<{ id: string }>('rpc_ajukan_surat_keluar', {
    p_id: data.id ?? null,
    p_perihal: data.perihal ?? null,
    p_tujuan: data.tujuan ?? null,
    p_klasifikasi_id: data.klasifikasiId ?? null,
    p_jenis_surat_id: data.jenisSuratId ?? null,
    p_sifat: data.sifat ?? 'biasa',
    p_isi_ringkas: data.isiRingkas ?? null,
    p_as_draf: asDraft,
    p_surat_masuk_id: data.suratMasukAsalId ?? data.refSuratMasukId ?? null,
  });
  await ctx.muatUlang();
  return hasil.id;
}

export async function parafKoordinasi(
  ctx: Konteks,
  skId: string,
  setuju: boolean,
  catatan: string
): Promise<void> {
  await rpc('rpc_paraf_koordinasi', {
    p_sk_id: skId,
    p_setuju: setuju,
    p_catatan: catatan ?? '',
  });
  await ctx.muatUlang();
}

/**
 * Tanda tangan surat oleh Kepala Dinas.
 * Konfirmasi kata sandi diverifikasi ulang lewat Supabase Auth sebelum RPC dipanggil,
 * karena RPC tidak pernah menerima kata sandi.
 */
export async function tandatanganSurat(
  ctx: Konteks,
  skId: string,
  passwordConfirm: string
): Promise<void> {
  const client = sb();
  const { error } = await client.auth.signInWithPassword({
    email: ctx.email,
    password: passwordConfirm,
  });
  if (error) {
    throw new GalatData('Autentikasi gagal. Password salah.');
  }
  await rpc('rpc_tandatangan_surat', { p_sk_id: skId });
  await ctx.muatUlang();
}

export async function tolakSuratKeluar(ctx: Konteks, skId: string, catatan: string): Promise<void> {
  await rpc('rpc_tolak_surat_keluar', { p_sk_id: skId, p_catatan: catatan });
  await ctx.muatUlang();
}

export async function terbitkanNomorSurat(ctx: Konteks, skId: string): Promise<string> {
  const hasil = await rpc<{ nomorSurat: string; nomorUrut: number; idempoten?: boolean }>(
    'rpc_terbitkan_nomor_surat',
    { p_sk_id: skId }
  );
  await ctx.muatUlang();
  return hasil.nomorSurat;
}

export async function kirimSuratKeluar(
  ctx: Konteks,
  skId: string,
  tanggalKirim: string,
  file: File | null
): Promise<void> {
  validasiBerkas(file, false, 'Berkas surat keluar');
  let berkasPath = '';
  if (file) {
    berkasPath = await unggahBerkas(file, 'keluar');
  }
  await rpc('rpc_kirim_surat_keluar', {
    p_sk_id: skId,
    p_tanggal_kirim: tanggalKirim,
    p_berkas_path: berkasPath || null,
  });
  await ctx.muatUlang();
}

export async function buktiTerima(
  ctx: Konteks,
  skId: string,
  tanggalDiterima: string,
  namaPenerima: string
): Promise<void> {
  await rpc('rpc_bukti_terima', {
    p_sk_id: skId,
    p_tanggal_diterima: tanggalDiterima,
    p_nama_penerima: namaPenerima,
  });
  await ctx.muatUlang();
}

// ─────────────────────────────────────────────────────────────────────────────
// Arsip
// ─────────────────────────────────────────────────────────────────────────────

export async function verifikasiArsip(ctx: Konteks, arsipId: string): Promise<void> {
  await rpc('rpc_verifikasi_arsip', { p_arsip_id: arsipId });
  await ctx.muatUlang();
}

export async function koreksiMetadataArsip(
  ctx: Konteks,
  arsipId: string,
  perihalBaru: string | null,
  klasifikasiIdBaru: string | null,
  alasan: string
): Promise<void> {
  await rpc('rpc_koreksi_metadata_arsip', {
    p_arsip_id: arsipId,
    p_perihal_baru: perihalBaru,
    p_klasifikasi_id_baru: klasifikasiIdBaru,
    p_alasan: alasan,
  });
  await ctx.muatUlang();
}

// ─────────────────────────────────────────────────────────────────────────────
// Pengguna (Admin)
// ─────────────────────────────────────────────────────────────────────────────

export async function tambahPengguna(
  ctx: Konteks,
  nama: string,
  email: string,
  role: UserRole,
  unitKerjaId?: string | null,
  kataSandi?: string
): Promise<void> {
  const hasil = await rpc<{ id: string }>('rpc_tambah_pengguna', {
    p_nama: nama,
    p_email: email,
    p_role: role,
    p_unit_kerja_id: unitKerjaId ?? null,
  });

  // Akun Auth dibuat lewat Route Handler (butuh service_role).
  const res = await fetch('/api/admin/akun', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      domainUserId: hasil.id,
      email,
      password: kataSandi || 'Password123!',
    }),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    throw new GalatData(
      detail?.galat || 'Akun berhasil dibuat, tetapi akun Auth gagal disiapkan. Jalankan ulang skrip seed.'
    );
  }
  await ctx.muatUlang();
}

export async function ubahPengguna(
  ctx: Konteks,
  userId: string,
  data: { nama: string; email: string; role: UserRole; unitKerjaId?: string | null }
): Promise<void> {
  await rpc('rpc_ubah_pengguna', {
    p_user_id: userId,
    p_nama: data.nama,
    p_email: data.email,
    p_role: data.role,
    p_unit_kerja_id: data.unitKerjaId ?? null,
  });
  await ctx.muatUlang();
}

export async function togglePengguna(ctx: Konteks, userId: string): Promise<void> {
  await rpc('rpc_toggle_pengguna', { p_user_id: userId });
  await ctx.muatUlang();
}

export async function resetPassword(
  ctx: Konteks,
  targetUserId: string,
  newPassword?: string
): Promise<string> {
  const kataSandi = newPassword || 'Password123!';
  const res = await fetch('/api/admin/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: targetUserId, password: kataSandi }),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    throw new GalatData(detail?.galat || 'Gagal mengatur ulang kata sandi.');
  }
  await ctx.muatUlang();
  return kataSandi;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tanda tangan digital
// ─────────────────────────────────────────────────────────────────────────────

export async function uploadTandaTangan(ctx: Konteks, userId: string, dataUrl: string): Promise<void> {
  if (!dataUrl) {
    throw new GalatData('Berkas gambar tanda tangan tidak boleh kosong.');
  }
  const path = await unggahTandaTangan(dataUrl, userId);
  await rpc('rpc_set_tanda_tangan', { p_user_id: userId, p_path: path });
  await ctx.muatUlang();
}

export async function hapusTandaTangan(ctx: Konteks, userId: string): Promise<void> {
  await rpc('rpc_set_tanda_tangan', { p_user_id: userId, p_path: '' });
  await hapusBerkasTandaTangan(pathTandaTangan(userId));
  await ctx.muatUlang();
}

// ─────────────────────────────────────────────────────────────────────────────
// Data master
// ─────────────────────────────────────────────────────────────────────────────

export async function tambahUnitKerja(
  ctx: Konteks,
  kode: string,
  nama: string,
  labelLembar?: string,
  urutanLembar?: number,
  jenis: 'sekretariat' | 'bidang' = 'bidang'
): Promise<void> {
  await rpc('rpc_tambah_unit_kerja', {
    p_kode: kode,
    p_nama: nama,
    p_label_lembar: labelLembar ?? null,
    p_urutan_lembar: urutanLembar ?? null,
    p_jenis: jenis,
  });
  await ctx.muatUlang();
}

export async function ubahUnitKerja(
  ctx: Konteks,
  id: string,
  data: { nama: string; kode?: string; labelLembar?: string; urutanLembar?: number }
): Promise<void> {
  await rpc('rpc_ubah_unit_kerja', {
    p_id: id,
    p_nama: data.nama,
    p_label_lembar: data.labelLembar ?? null,
    p_urutan_lembar: data.urutanLembar ?? null,
    p_kode: data.kode ?? null,
  });
  await ctx.muatUlang();
}

export async function toggleUnitKerja(ctx: Konteks, id: string): Promise<void> {
  await rpc('rpc_toggle_unit_kerja', { p_id: id });
  await ctx.muatUlang();
}

export async function hapusUnitKerja(ctx: Konteks, id: string): Promise<void> {
  await rpc('rpc_hapus_unit_kerja', { p_id: id });
  await ctx.muatUlang();
}

export async function tambahKlasifikasi(
  ctx: Konteks,
  kode: string,
  nama: string,
  uraian?: string,
  unitKerjaId?: string | null
): Promise<void> {
  await rpc('rpc_tambah_klasifikasi', {
    p_kode: kode,
    p_nama: nama,
    p_uraian: uraian ?? null,
    p_unit_kerja_id: unitKerjaId ?? null,
  });
  await ctx.muatUlang();
}

export async function ubahKlasifikasi(
  ctx: Konteks,
  id: string,
  data: { nama: string; kode?: string; uraian?: string; unitKerjaId?: string | null }
): Promise<void> {
  await rpc('rpc_ubah_klasifikasi', {
    p_id: id,
    p_nama: data.nama,
    p_uraian: data.uraian ?? null,
    p_kode: data.kode ?? null,
    p_unit_kerja_id: data.unitKerjaId ?? null,
  });
  await ctx.muatUlang();
}

export async function toggleKlasifikasi(ctx: Konteks, id: string): Promise<void> {
  await rpc('rpc_toggle_klasifikasi', { p_id: id });
  await ctx.muatUlang();
}

export async function tambahDataMaster(
  ctx: Konteks,
  kategori: KategoriDataMaster,
  kode: string,
  label: string,
  keterangan?: string,
  urutan?: number,
  meta?: Record<string, any>
): Promise<string> {
  const hasil = await rpc<{ id: string }>('rpc_tambah_data_master', {
    p_kategori: kategori,
    p_kode: kode,
    p_label: label,
    p_keterangan: keterangan ?? null,
    p_urutan: urutan ?? null,
    p_meta: meta ?? null,
  });
  await ctx.muatUlang();
  return hasil.id;
}

export async function ubahDataMaster(
  ctx: Konteks,
  id: string,
  data: {
    kode?: string;
    label?: string;
    keterangan?: string;
    urutan?: number;
    meta?: Record<string, any>;
  }
): Promise<void> {
  await rpc('rpc_ubah_data_master', {
    p_id: id,
    p_kode: data.kode ?? null,
    p_label: data.label ?? null,
    p_keterangan: data.keterangan ?? null,
    p_urutan: data.urutan ?? null,
    p_meta: data.meta ?? null,
  });
  await ctx.muatUlang();
}

export async function toggleDataMaster(ctx: Konteks, id: string): Promise<void> {
  await rpc('rpc_toggle_data_master', { p_id: id });
  await ctx.muatUlang();
}

// ─────────────────────────────────────────────────────────────────────────────
// Notifikasi & utilitas
// ─────────────────────────────────────────────────────────────────────────────

export async function tandaiNotifikasiDibaca(ctx: Konteks, notifikasiId?: string): Promise<void> {
  await rpc('rpc_tandai_notifikasi_dibaca', { p_notifikasi_id: notifikasiId ?? null });
  await ctx.muatUlang();
}

export async function resetDataSurat(ctx: Konteks): Promise<void> {
  await rpc('rpc_reset_data_surat');
  await ctx.muatUlang();
}
