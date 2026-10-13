/**
 * hitungIzinZona — Sumber kebenaran tunggal untuk matriks akses zona
 * Bagian 3 prompt Kartu Disposisi Digital.
 *
 * PENTING: Fungsi ini tidak boleh diduplikasi di sisi klien.
 * Semua pengecekan akses harus memanggil fungsi ini (atau guard yang
 * memanfaatkan nilai kembaliannya).
 */

import type { UserRole, StatusDisposisi } from '../types';

// ─── Zona ────────────────────────────────────────────────────────────────────

export type Zona =
  | 'Z1'   // Kop instansi
  | 'Z2'   // Judul lembar disposisi
  | 'Z3'   // Surat dari / No. / Tgl. Surat
  | 'Z4'   // Diterima tgl / No. Agenda / Sifat
  | 'Z5'   // Perihal
  | 'Z6'   // Diteruskan Kepada Sdr (kotak centang tujuan)
  | 'Z7'   // Dengan hormat harap + Tenggat
  | 'Z8'   // Catatan Kepala Dinas
  | 'Z9'   // Paraf dan Tanggal
  | 'Z10'  // Blok KEPALA DINAS (otomatis dari profil)
  | 'Z11'  // Catatan Koordinasi (Sekretaris)
  | 'Z12'  // Tanda Terima Bidang (per baris)
  | 'Z13'  // Keputusan Tindak Lanjut / Penugasan
  | 'Z14'  // Laporan Tindak Lanjut (Staf)
  | 'Z15'  // Pemeriksaan Hasil (Kepala Bidang)
  | 'Z16'; // Riwayat Kartu

export type IzinZona = 'isi' | 'baca' | 'sembunyi';

export type MapIzinZona = Record<Zona, IzinZona>;

// ─── Context ──────────────────────────────────────────────────────────────────

export interface KonteksIzin {
  /** Peran pengguna saat ini */
  peran: UserRole;
  /** Unit kerja ID pengguna saat ini */
  unitKerjaId: string | null;
  /** Status kartu disposisi saat ini */
  statusKartu: StatusDisposisi;
  /**
   * Apakah disposisi ini bersifat koordinasi (K5):
   *  (a) Sekretaris dicentang, atau
   *  (b) >=2 Kepala Bidang dicentang, atau
   *  (c) "Koordinasi/Konfirmasi" dicentang bersama >=1 tujuan
   */
  adalahKoordinasi: boolean;
  /**
   * Apakah bidang pengguna termasuk dalam daftar tujuan disposisi
   * (untuk Kepala Bidang & Staf)
   */
  bidangIniAdalahTujuan: boolean;
  /**
   * Apakah pengguna adalah staf yang memiliki penugasan aktif pada disposisi ini
   */
  punyaPenugasan: boolean;
}

// ─── Fungsi utama ─────────────────────────────────────────────────────────────

/**
 * Menghitung hak akses per zona berdasarkan peran, status, dan konteks disposisi.
 *
 * @param konteks - Konteks pengguna dan kartu disposisi
 * @returns Peta zona -> 'isi' | 'baca' | 'sembunyi'
 */
export function hitungIzinZona(konteks: KonteksIzin): MapIzinZona {
  const {
    peran,
    statusKartu,
    adalahKoordinasi,
    bidangIniAdalahTujuan,
    punyaPenugasan,
  } = konteks;

  // Default: semua zona tersembunyi
  const izin: MapIzinZona = {
    Z1: 'sembunyi', Z2: 'sembunyi', Z3: 'sembunyi', Z4: 'sembunyi',
    Z5: 'sembunyi', Z6: 'sembunyi', Z7: 'sembunyi', Z8: 'sembunyi',
    Z9: 'sembunyi', Z10: 'sembunyi', Z11: 'sembunyi', Z12: 'sembunyi',
    Z13: 'sembunyi', Z14: 'sembunyi', Z15: 'sembunyi', Z16: 'sembunyi',
  };

  // Admin TIDAK boleh melihat isi kartu (Bab proposal butir 14a, 15a)
  if (peran === 'admin') {
    return izin; // Semua tersembunyi — 403 di halaman kartu
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────
  const isDraf = statusKartu === 'menunggu_disposisi';
  const sudahDisposisi = !['menunggu_disposisi'].includes(statusKartu);
  const sudahDiterimaBidang = ['diterima_bidang', 'diteruskan_ke_staf', 'menunggu_pemeriksaan', 'selesai'].includes(statusKartu);

  // ─── Z1 Kop ──────────────────────────────────────────────────────────────
  izin.Z1 = 'baca';

  // ─── Z2 Judul ────────────────────────────────────────────────────────────
  izin.Z2 = 'baca';

  // ─── Z3, Z4, Z5 Identitas surat ─────────────────────────────────────────
  if (peran === 'petugas_surat') {
    izin.Z3 = isDraf ? 'isi' : 'baca';
    izin.Z4 = isDraf ? 'isi' : 'baca';
    izin.Z5 = isDraf ? 'isi' : 'baca';
  } else {
    izin.Z3 = 'baca';
    izin.Z4 = 'baca';
    izin.Z5 = 'baca';
  }

  // ─── Z6, Z7, Z8, Z9 Disposisi Kepala Dinas ───────────────────────────────
  if (peran === 'kepala_dinas') {
    const bolehIsiDisposisi = statusKartu === 'menunggu_disposisi';
    izin.Z6 = bolehIsiDisposisi ? 'isi' : 'baca';
    izin.Z7 = bolehIsiDisposisi ? 'isi' : 'baca';
    izin.Z8 = bolehIsiDisposisi ? 'isi' : 'baca';
    izin.Z9 = bolehIsiDisposisi ? 'isi' : 'baca';
  } else if (peran === 'petugas_surat' || peran === 'sekretaris') {
    izin.Z6 = sudahDisposisi ? 'baca' : 'sembunyi';
    izin.Z7 = sudahDisposisi ? 'baca' : 'sembunyi';
    izin.Z8 = sudahDisposisi ? 'baca' : 'sembunyi';
    izin.Z9 = sudahDisposisi ? 'baca' : 'sembunyi';
  } else if (peran === 'kepala_bidang' && bidangIniAdalahTujuan) {
    izin.Z6 = sudahDisposisi ? 'baca' : 'sembunyi';
    izin.Z7 = sudahDisposisi ? 'baca' : 'sembunyi';
    izin.Z8 = sudahDisposisi ? 'baca' : 'sembunyi';
    izin.Z9 = sudahDisposisi ? 'baca' : 'sembunyi';
  } else if (peran === 'staf_pelaksana' && punyaPenugasan) {
    izin.Z6 = sudahDisposisi ? 'baca' : 'sembunyi';
    izin.Z7 = sudahDisposisi ? 'baca' : 'sembunyi';
    izin.Z8 = sudahDisposisi ? 'baca' : 'sembunyi';
    izin.Z9 = sudahDisposisi ? 'baca' : 'sembunyi';
  }

  // ─── Z10 Blok KEPALA DINAS ───────────────────────────────────────────────
  izin.Z10 = 'baca';

  // ─── Z11 Catatan Koordinasi (Sekretaris) ─────────────────────────────────
  if (peran === 'sekretaris') {
    const bolehIsiKoordinasi =
      adalahKoordinasi &&
      ['didisposisikan', 'diterima_bidang', 'diteruskan_ke_staf', 'menunggu_pemeriksaan'].includes(statusKartu);
    izin.Z11 = adalahKoordinasi
      ? (bolehIsiKoordinasi ? 'isi' : 'baca')
      : 'sembunyi';
  } else if (sudahDisposisi && adalahKoordinasi &&
    (peran === 'kepala_bidang' || peran === 'kepala_dinas' || peran === 'petugas_surat')) {
    izin.Z11 = 'baca';
  }

  // ─── Z12 Tanda Terima Bidang ──────────────────────────────────────────────
  if (peran === 'kepala_bidang' && sudahDisposisi) {
    izin.Z12 = bidangIniAdalahTujuan ? 'isi' : 'baca';
  } else if (sudahDisposisi && (peran === 'sekretaris' || peran === 'kepala_dinas' || peran === 'petugas_surat')) {
    izin.Z12 = 'baca';
  }

  // ─── Z13 Keputusan Tindak Lanjut / Penugasan Staf ────────────────────────
  if (peran === 'kepala_bidang' && bidangIniAdalahTujuan && sudahDiterimaBidang) {
    izin.Z13 = 'isi';
  } else if (peran === 'staf_pelaksana' && punyaPenugasan && sudahDiterimaBidang) {
    izin.Z13 = 'baca';
  } else if ((peran === 'kepala_dinas' || peran === 'sekretaris') && sudahDiterimaBidang) {
    izin.Z13 = 'baca';
  }

  // ─── Z14 Laporan Tindak Lanjut ────────────────────────────────────────────
  if (peran === 'staf_pelaksana' && punyaPenugasan) {
    izin.Z14 = 'isi';
  } else if (peran === 'kepala_bidang' && bidangIniAdalahTujuan && statusKartu !== 'menunggu_disposisi') {
    izin.Z14 = 'baca';
  } else if ((peran === 'kepala_dinas' || peran === 'sekretaris') && statusKartu !== 'menunggu_disposisi') {
    izin.Z14 = 'baca';
  }

  // ─── Z15 Pemeriksaan Hasil ────────────────────────────────────────────────
  if (peran === 'kepala_bidang' && bidangIniAdalahTujuan && statusKartu === 'menunggu_pemeriksaan') {
    izin.Z15 = 'isi';
  } else if (peran === 'staf_pelaksana' && punyaPenugasan && ['menunggu_pemeriksaan', 'selesai'].includes(statusKartu)) {
    izin.Z15 = 'baca';
  } else if ((peran === 'kepala_dinas' || peran === 'sekretaris') && statusKartu !== 'menunggu_disposisi') {
    izin.Z15 = 'baca';
  }

  // ─── Z16 Riwayat Kartu ───────────────────────────────────────────────────
  const bolehLihatRiwayat =
    peran === 'petugas_surat' ||
    peran === 'sekretaris' ||
    peran === 'kepala_dinas' ||
    (peran === 'kepala_bidang' && bidangIniAdalahTujuan) ||
    (peran === 'staf_pelaksana' && punyaPenugasan);
  if (bolehLihatRiwayat) izin.Z16 = 'baca';

  return izin;
}

// ─── Helpers untuk UI ─────────────────────────────────────────────────────────

export const WARNA_PERAN: Record<UserRole, string> = {
  admin:            '#667085',
  petugas_surat:    '#175CD3',
  sekretaris:       '#0F766E',
  kepala_dinas:     '#15803D',
  kepala_bidang:    '#B45309',
  staf_pelaksana:   '#6941C6',
};

export const LABEL_PEMILIK_ZONA: Partial<Record<Zona, UserRole | 'sistem'>> = {
  Z1:  'sistem',
  Z2:  'sistem',
  Z3:  'petugas_surat',
  Z4:  'petugas_surat',
  Z5:  'petugas_surat',
  Z6:  'kepala_dinas',
  Z7:  'kepala_dinas',
  Z8:  'kepala_dinas',
  Z9:  'kepala_dinas',
  Z10: 'sistem',
  Z11: 'sekretaris',
  Z12: 'kepala_bidang',
  Z13: 'kepala_bidang',
  Z14: 'staf_pelaksana',
  Z15: 'kepala_bidang',
  Z16: 'sistem',
};

export type PeranAtauSistem = UserRole | 'sistem';

export const NAMA_PERAN_PENDEK: Record<PeranAtauSistem, string> = {
  admin:            'Administrator',
  petugas_surat:    'Petugas',
  sekretaris:       'Sekretaris',
  kepala_dinas:     'Kepala Dinas',
  kepala_bidang:    'Kepala Bidang',
  staf_pelaksana:   'Staf',
  sistem:           'Sistem',
};
