// ============================================================
// STATUS — Kosakata Kanonik Status, Sifat, dan Batas Waktu
// Sumber kebenaran tunggal untuk label, warna, dan ikon chip.
// ============================================================
import type {
  StatusSuratMasuk,
  StatusSuratKeluar,
  StatusDisposisi,
  SifatSurat,
} from './types';

// --- Tone Semantik ---
export type Tone = 'netral' | 'info' | 'segera' | 'sukses' | 'bahaya';

export interface StatusDef {
  label: string;
  tone: Tone;
  /** Nama ikon lucide-react (PascalCase) */
  icon: string;
}

// --- Surat Masuk ---
export const STATUS_SURAT_MASUK: Record<StatusSuratMasuk, StatusDef> = {
  diagenda:              { label: 'Diagenda',              tone: 'netral', icon: 'BookOpen' },
  menunggu_disposisi:    { label: 'Menunggu Disposisi',    tone: 'info',   icon: 'Clock' },
  didisposisikan:        { label: 'Didisposisikan',        tone: 'info',   icon: 'Send' },
  diterima_bidang:       { label: 'Diterima Bidang',       tone: 'info',   icon: 'Inbox' },
  diteruskan_ke_staf:    { label: 'Diteruskan ke Staf',    tone: 'segera', icon: 'Forward' },
  menunggu_pemeriksaan:  { label: 'Menunggu Pemeriksaan',  tone: 'segera', icon: 'ClipboardCheck' },
  selesai:               { label: 'Selesai',               tone: 'sukses', icon: 'CheckCircle2' },
};

// --- Disposisi ---
export const STATUS_DISPOSISI: Record<StatusDisposisi, StatusDef> = {
  menunggu_disposisi:    { label: 'Menunggu Disposisi',    tone: 'info',   icon: 'Clock' },
  didisposisikan:        { label: 'Didisposisikan',        tone: 'info',   icon: 'Send' },
  diterima_bidang:       { label: 'Diterima Bidang',       tone: 'info',   icon: 'Inbox' },
  diteruskan_ke_staf:    { label: 'Diteruskan ke Staf',    tone: 'segera', icon: 'Forward' },
  menunggu_pemeriksaan:  { label: 'Menunggu Pemeriksaan',  tone: 'segera', icon: 'ClipboardCheck' },
  selesai:               { label: 'Selesai',               tone: 'sukses', icon: 'CheckCircle2' },
  dikembalikan:          { label: 'Dikembalikan',          tone: 'bahaya', icon: 'RotateCcw' },
};

// --- Surat Keluar ---
export const STATUS_SURAT_KELUAR: Record<StatusSuratKeluar, StatusDef> = {
  draf:                  { label: 'Draf',                  tone: 'netral', icon: 'FilePen' },
  menunggu_paraf:        { label: 'Menunggu Paraf',        tone: 'info',   icon: 'Stamp' },
  perlu_revisi:          { label: 'Perlu Revisi',          tone: 'bahaya', icon: 'RotateCcw' },
  menunggu_ttd:          { label: 'Menunggu Tanda Tangan', tone: 'segera', icon: 'PenLine' },
  ditandatangani:        { label: 'Ditandatangani',        tone: 'sukses', icon: 'BadgeCheck' },
  nomor_diterbitkan:     { label: 'Nomor Diterbitkan',     tone: 'sukses', icon: 'Hash' },
  terkirim:              { label: 'Terkirim',              tone: 'sukses', icon: 'MailCheck' },
};

// --- Sifat Surat (Badge) ---
export interface SifatDef {
  label: string;
  tone: Tone;
  icon: string | null;
}

export const SIFAT_DEFS: Record<SifatSurat, SifatDef> = {
  biasa:   { label: 'Biasa',              tone: 'netral', icon: null },
  umum:    { label: 'Umum/Pemberitahuan', tone: 'netral', icon: null },
  penting: { label: 'Penting',            tone: 'segera', icon: 'CircleAlert' },
  segera:  { label: 'Segera',             tone: 'segera', icon: 'Timer' },
  rahasia: { label: 'Rahasia',            tone: 'bahaya', icon: 'Lock' },
};

// --- Batas Waktu ---
export type KeadaanTenggat = 'normal' | 'mendekati' | 'terlambat';

export interface HasilTenggat {
  keadaan: KeadaanTenggat;
  /** Label tampil, misal "12 Okt 2026" */
  label: string;
}

const HARI_MS = 86_400_000;

/**
 * Hitung keadaan batas waktu relatif terhadap hari ini.
 * Ambang "mendekati" = 2 hari sebelum tenggat.
 */
export function hitungTenggat(
  tanggalTenggat: string | Date,
  sekarang: Date = new Date(),
): HasilTenggat {
  const tenggat = typeof tanggalTenggat === 'string'
    ? new Date(tanggalTenggat)
    : tanggalTenggat;

  const selisihMs = tenggat.getTime() - sekarang.getTime();
  const selisihHari = selisihMs / HARI_MS;

  let keadaan: KeadaanTenggat;
  if (selisihHari < 0) {
    keadaan = 'terlambat';
  } else if (selisihHari <= 2) {
    keadaan = 'mendekati';
  } else {
    keadaan = 'normal';
  }

  const label = tenggat.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return { keadaan, label };
}

// --- Resolusi ikon dinamis ---
export type JenisStatus = 'suratMasuk' | 'disposisi' | 'suratKeluar';

const MAPS: Record<JenisStatus, Record<string, StatusDef>> = {
  suratMasuk: STATUS_SURAT_MASUK,
  disposisi: STATUS_DISPOSISI,
  suratKeluar: STATUS_SURAT_KELUAR,
};

export function resolveStatus(jenis: JenisStatus, status: string): StatusDef {
  return MAPS[jenis]?.[status] ?? { label: status, tone: 'netral', icon: 'Circle' };
}
