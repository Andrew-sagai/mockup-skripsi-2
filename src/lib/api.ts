'use client';
// ============================================================
// API UTAMA — dispatcher dua mode
//
// Mode Demo  : seluruh data & mutasi tetap di browser (localStorage),
//              memakai implementasi lama di ./api.legacy.ts.
// Mode Supabase: Postgres sebagai sumber kebenaran; mutasi lewat RPC
//              SECURITY DEFINER sehingga otorisasi ditegakkan di server.
//
// Bentuk pemanggilan tidak berubah: seluruh fungsi di sini `async`.
// ============================================================
import { useMemo } from 'react';
import { useStore } from './store';
import { useLegacyBusinessLogic } from './api.legacy';
import { supabaseAktif } from './data/supabase';
import type { Konteks } from './data/mutasi';
import * as mutasi from './data/mutasi';
import type {
  InstruksiDisposisi,
  JenisInstruksi,
  KategoriDataMaster,
  SifatSurat,
  SuratKeluar,
  SuratMasuk,
  UserRole,
} from './types';

export function useBusinessLogic() {
  const store = useStore();
  const legacy = useLegacyBusinessLogic();
  const modeSupabase = supabaseAktif();

  const ctx = useMemo<Konteks>(
    () => ({
      penggunaId: store.state.currentUser?.id ?? '',
      authId: store.authUser?.id ?? store.state.currentUser?.authId ?? '',
      email: store.authUser?.email ?? store.state.currentUser?.email ?? '',
      muatUlang: store.refresh,
    }),
    [store.state.currentUser, store.authUser, store.refresh]
  );

  // ── Surat masuk ─────────────────────────────────────────
  const apiCatatSuratMasuk = async (
    data: Partial<SuratMasuk>,
    file: File | null
  ): Promise<string> => {
    if (modeSupabase) return mutasi.catatSuratMasuk(ctx, data, file);
    return legacy.apiCatatSuratMasuk(data, file);
  };

  // ── Disposisi ───────────────────────────────────────────
  const apiBuatDisposisi = async (suratMasukId: string): Promise<string> => {
    if (modeSupabase) return mutasi.buatDisposisi(ctx, suratMasukId);
    return legacy.apiBuatDisposisi(suratMasukId);
  };

  const apiBeriDisposisi = async (
    dispId: string,
    instruksi: JenisInstruksi,
    bidangTujuanIds: string[],
    catatan: string,
    tenggat: string,
    instruksiLainnya?: string,
    instruksiList?: InstruksiDisposisi[],
    sifat?: SifatSurat
  ): Promise<void> => {
    if (modeSupabase)
      return mutasi.beriDisposisi(
        ctx,
        dispId,
        instruksi,
        bidangTujuanIds,
        catatan,
        tenggat,
        instruksiLainnya,
        instruksiList,
        sifat
      );
    return legacy.apiBeriDisposisi(
      dispId,
      instruksi,
      bidangTujuanIds,
      catatan,
      tenggat,
      instruksiLainnya,
      instruksiList,
      sifat
    );
  };

  const apiTerimaDisposisi = async (dispId: string): Promise<void> => {
    if (modeSupabase) return mutasi.terimaDisposisi(ctx, dispId);
    return legacy.apiTerimaDisposisi(dispId);
  };

  const apiTeruskanKeStaf = async (
    dispId: string,
    stafId: string,
    catatanPenugasan: string
  ): Promise<void> => {
    if (modeSupabase) return mutasi.teruskanKeStaf(ctx, dispId, stafId, catatanPenugasan);
    return legacy.apiTeruskanKeStaf(dispId, stafId, catatanPenugasan);
  };

  const apiTindakLanjutLangsung = async (
    dispId: string,
    uraianHasil: string,
    file: File | null,
    perluSuratJawaban: boolean = false
  ): Promise<void> => {
    if (modeSupabase)
      return mutasi.tindakLanjutLangsung(ctx, dispId, uraianHasil, file, perluSuratJawaban);
    return legacy.apiTindakLanjutLangsung(dispId, uraianHasil, file, perluSuratJawaban);
  };

  const apiSimpanProgres = async (dispId: string, catatanProgres: string): Promise<void> => {
    if (modeSupabase) return mutasi.simpanProgres(ctx, dispId, catatanProgres);
    return legacy.apiSimpanProgres(dispId, catatanProgres);
  };

  const apiLaporkanHasil = async (
    dispId: string,
    uraianHasil: string,
    file: File | null
  ): Promise<void> => {
    if (modeSupabase) return mutasi.laporkanHasil(ctx, dispId, uraianHasil, file);
    return legacy.apiLaporkanHasil(dispId, uraianHasil, file);
  };

  const apiPeriksaLaporan = async (
    tlId: string,
    setuju: boolean,
    catatan: string,
    perluSuratJawaban: boolean = false
  ): Promise<void> => {
    if (modeSupabase)
      return mutasi.periksaLaporan(ctx, tlId, setuju, catatan, perluSuratJawaban);
    return legacy.apiPeriksaLaporan(tlId, setuju, catatan, perluSuratJawaban);
  };

  const apiBeriCatatanSekdis = async (dispId: string, catatan: string): Promise<void> => {
    if (modeSupabase) return mutasi.beriCatatanSekdis(ctx, dispId, catatan);
    return legacy.apiBeriCatatanSekdis(dispId, catatan);
  };

  const apiBubuhkanParaf = async (dispId: string): Promise<void> => {
    if (modeSupabase) return mutasi.bubuhkanParaf(ctx, dispId);
    return legacy.apiBubuhkanParaf(dispId);
  };

  const apiTidakPerluDisposisi = async (dispId: string, catatan: string): Promise<void> => {
    if (modeSupabase) return mutasi.tidakPerluDisposisi(ctx, dispId, catatan);
    return legacy.apiTidakPerluDisposisi(dispId, catatan);
  };

  // ── Surat keluar ────────────────────────────────────────
  const apiAjukanSuratKeluar = async (
    data_: Partial<SuratKeluar>,
    asDraft: boolean = false
  ): Promise<string> => {
    if (modeSupabase) return mutasi.ajukanSuratKeluar(ctx, data_, asDraft);
    return legacy.apiAjukanSuratKeluar(data_, asDraft);
  };

  const apiParafKoordinasi = async (
    skId: string,
    setuju: boolean,
    catatan: string
  ): Promise<void> => {
    if (modeSupabase) return mutasi.parafKoordinasi(ctx, skId, setuju, catatan);
    return legacy.apiParafKoordinasi(skId, setuju, catatan);
  };

  const apiTandatanganSurat = async (skId: string, passwordConfirm: string): Promise<void> => {
    if (modeSupabase) return mutasi.tandatanganSurat(ctx, skId, passwordConfirm);
    return legacy.apiTandatanganSurat(skId, passwordConfirm);
  };

  const apiTolakSuratKeluar = async (skId: string, catatan: string): Promise<void> => {
    if (modeSupabase) return mutasi.tolakSuratKeluar(ctx, skId, catatan);
    return legacy.apiTolakSuratKeluar(skId, catatan);
  };

  const apiTerbitkanNomorSurat = async (skId: string): Promise<string> => {
    if (modeSupabase) return mutasi.terbitkanNomorSurat(ctx, skId);
    return legacy.apiTerbitkanNomorSurat(skId);
  };

  const apiDokumentasikanDanKirimSuratKeluar = async (
    skId: string,
    tanggalKirim: string,
    file: File | null
  ): Promise<void> => {
    if (modeSupabase) return mutasi.kirimSuratKeluar(ctx, skId, tanggalKirim, file);
    return legacy.apiDokumentasikanDanKirimSuratKeluar(skId, tanggalKirim, file);
  };

  const apiBuktiTerima = async (
    skId: string,
    tanggalDiterima: string,
    namaPenerima: string
  ): Promise<void> => {
    if (modeSupabase) return mutasi.buktiTerima(ctx, skId, tanggalDiterima, namaPenerima);
    return legacy.apiBuktiTerima(skId, tanggalDiterima, namaPenerima);
  };

  // ── Arsip ───────────────────────────────────────────────
  const apiVerifikasiArsip = async (arsipId: string): Promise<void> => {
    if (modeSupabase) return mutasi.verifikasiArsip(ctx, arsipId);
    return legacy.apiVerifikasiArsip(arsipId);
  };

  const apiKoreksiMetadataArsip = async (
    arsipId: string,
    perihalBaru: string | null,
    klasifikasiIdBaru: string | null,
    alasan: string
  ): Promise<void> => {
    if (modeSupabase)
      return mutasi.koreksiMetadataArsip(ctx, arsipId,perihalBaru, klasifikasiIdBaru, alasan);
    return legacy.apiKoreksiMetadataArsip(arsipId, perihalBaru, klasifikasiIdBaru, alasan);
  };

  // ── Pengguna ────────────────────────────────────────────
  const apiTambahPengguna = async (
    nama: string,
    email: string,
    role: UserRole,
    unitKerjaId?: string | null,
    dummyPassword?: string
  ): Promise<void> => {
    if (modeSupabase) return mutasi.tambahPengguna(ctx, nama, email, role, unitKerjaId, dummyPassword);
    return legacy.apiTambahPengguna(nama, email, role, unitKerjaId, dummyPassword);
  };

  const apiUbahPengguna = async (
    userId: string,
    payload: { nama: string; email: string; role: UserRole; unitKerjaId?: string | null }
  ): Promise<void> => {
    if (modeSupabase) return mutasi.ubahPengguna(ctx, userId, payload);
    return legacy.apiUbahPengguna(userId, payload);
  };

  const apiTogglePengguna = async (userId: string): Promise<void> => {
    if (modeSupabase) return mutasi.togglePengguna(ctx, userId);
    return legacy.apiTogglePengguna(userId);
  };

  const apiResetPassword = async (targetUserId: string, newPassword?: string): Promise<string> => {
    if (modeSupabase) return mutasi.resetPassword(ctx, targetUserId, newPassword);
    return legacy.apiResetPassword(targetUserId, newPassword);
  };

  // ── Tanda tangan digital ────────────────────────────────
  const apiUploadTandaTangan = async (userId: string, dataUrl: string): Promise<void> => {
    if (modeSupabase) return mutasi.uploadTandaTangan(ctx, userId, dataUrl);
    return legacy.apiUploadTandaTangan(userId, dataUrl);
  };

  const apiHapusTandaTangan = async (userId: string): Promise<void> => {
    if (modeSupabase) return mutasi.hapusTandaTangan(ctx, userId);
    return legacy.apiHapusTandaTangan(userId);
  };

  // ── Data master ─────────────────────────────────────────
  const apiTambahUnitKerja = async (
    kode: string,
    nama: string,
    labelLembar?: string,
    urutanLembar?: number,
    jenis: 'sekretariat' | 'bidang' = 'bidang'
  ): Promise<void> => {
    if (modeSupabase)
      return mutasi.tambahUnitKerja(ctx, kode, nama, labelLembar, urutanLembar, jenis);
    return legacy.apiTambahUnitKerja(kode, nama, labelLembar, urutanLembar, jenis);
  };

  const apiUbahUnitKerja = async (
    id: string,
    payload: { nama: string; kode?: string; labelLembar?: string; urutanLembar?: number }
  ): Promise<void> => {
    if (modeSupabase) return mutasi.ubahUnitKerja(ctx, id, payload);
    return legacy.apiUbahUnitKerja(id, payload);
  };

  const apiToggleUnitKerja = async (id: string): Promise<void> => {
    if (modeSupabase) return mutasi.toggleUnitKerja(ctx, id);
    return legacy.apiToggleUnitKerja(id);
  };

  const apiHapusUnitKerja = async (id: string): Promise<void> => {
    if (modeSupabase) return mutasi.hapusUnitKerja(ctx, id);
    return legacy.apiHapusUnitKerja(id);
  };

  const apiTambahKlasifikasi = async (
    kode: string,
    nama: string,
    uraian?: string,
    unitKerjaId?: string | null
  ): Promise<void> => {
    if (modeSupabase) return mutasi.tambahKlasifikasi(ctx, kode, nama, uraian, unitKerjaId);
    return legacy.apiTambahKlasifikasi(kode, nama, uraian, unitKerjaId);
  };

  const apiUbahKlasifikasi = async (
    id: string,
    payload: { nama: string; kode?: string; uraian?: string; unitKerjaId?: string | null }
  ): Promise<void> => {
    if (modeSupabase) return mutasi.ubahKlasifikasi(ctx, id, payload);
    return legacy.apiUbahKlasifikasi(id, payload);
  };

  const apiToggleKlasifikasi = async (id: string): Promise<void> => {
    if (modeSupabase) return mutasi.toggleKlasifikasi(ctx, id);
    return legacy.apiToggleKlasifikasi(id);
  };

  const apiTambahDataMaster = async (
    kategori: KategoriDataMaster,
    kode: string,
    label: string,
    keterangan?: string,
    urutan?: number,
    meta?: Record<string, any>
  ): Promise<string> => {
    if (modeSupabase)
      return mutasi.tambahDataMaster(ctx, kategori, kode, label, keterangan, urutan, meta);
    return legacy.apiTambahDataMaster(kategori, kode, label, keterangan, urutan, meta);
  };

  const apiUbahDataMaster = async (
    id: string,
    payload: {
      kode?: string;
      label?: string;
      keterangan?: string;
      urutan?: number;
      meta?: Record<string, any>;
    }
  ): Promise<void> => {
    if (modeSupabase) return mutasi.ubahDataMaster(ctx, id, payload);
    return legacy.apiUbahDataMaster(id, payload);
  };

  const apiToggleDataMaster = async (id: string): Promise<void> => {
    if (modeSupabase) return mutasi.toggleDataMaster(ctx, id);
    return legacy.apiToggleDataMaster(id);
  };

  // ── Utilitas ────────────────────────────────────────────
  /**
   * Pengingat batas waktu. Pada mode Supabase dijalankan otomatis oleh
   * pg_cron (rpc_proses_pengingat_batas_waktu), sehingga fungsi ini
   * tidak melakukan apa pun di sisi klien.
   */
  const apiTriggerPengingatBatasWaktu = async (): Promise<void> => {
    if (modeSupabase) return;
    return legacy.apiTriggerPengingatBatasWaktu();
  };

  const apiResetDataSurat = async (): Promise<void> => {
    if (modeSupabase) return mutasi.resetDataSurat(ctx);
    return legacy.apiResetDataSurat();
  };

  return {
    apiCatatSuratMasuk,
    apiBuatDisposisi,
    apiBeriDisposisi,
    apiTerimaDisposisi,
    apiParafPenerimaanDisposisi: apiTerimaDisposisi,
    apiTeruskanKeStaf,
    apiTindakLanjutLangsung,
    apiSimpanProgres,
    apiLaporkanHasil,
    apiPeriksaLaporan,
    apiAjukanSuratKeluar,
    apiParafKoordinasi,
    apiTandatanganSurat,
    apiTolakSuratKeluar,
    apiTerbitkanNomorSurat,
    apiDokumentasikanDanKirimSuratKeluar,
    apiBuktiTerima,
    apiKoreksiMetadataArsip,
    apiVerifikasiArsip,
    apiTambahPengguna,
    apiUbahPengguna,
    apiTogglePengguna,
    apiResetPassword,
    apiUploadTandaTangan,
    apiHapusTandaTangan,
    apiTambahUnitKerja,
    apiUbahUnitKerja,
    apiToggleUnitKerja,
    apiHapusUnitKerja,
    apiTambahKlasifikasi,
    apiUbahKlasifikasi,
    apiToggleKlasifikasi,
    apiTambahDataMaster,
    apiUbahDataMaster,
    apiToggleDataMaster,
    apiBeriCatatanSekdis,
    apiBubuhkanParaf,
    apiTidakPerluDisposisi,
    apiTriggerPengingatBatasWaktu,
    apiResetDataSurat,
  };
}

export const useApi = useBusinessLogic;
