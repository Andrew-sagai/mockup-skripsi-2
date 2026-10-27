'use client';

import { GalatData, sb } from './supabase';

const BUCKET_BERKAS = 'berkas-surat';
const BUCKET_TTD = 'tanda-tangan';

const MAKS_UKURAN = 10 * 1024 * 1024; // 10 MB
const MAKS_TTD = 2 * 1024 * 1024; // 2 MB

function idUnik(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function namaAman(nama: string): string {
  return nama.replace(/[^\w.\-]+/g, '_').slice(-120) || 'berkas.pdf';
}

/** Validasi berkas unggahan: PDF, maksimal 10 MB. */
export function validasiBerkas(file: File | null | undefined, wajib: boolean, label = 'Berkas'): string {
  if (!file) {
    if (wajib) throw new GalatData(`${label} wajib diunggah.`);
    return '';
  }
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    throw new GalatData('Format berkas harus PDF.');
  }
  if (file.size > MAKS_UKURAN) {
    throw new GalatData('Ukuran berkas maksimal 10MB.');
  }
  return file.name;
}

/**
 * Unggah berkas ke bucket privat `berkas-surat` dan kembalikan path-nya.
 * Path disimpan di kolom `berkas_path` dan dibaca lewat route /api/files.
 */
export async function unggahBerkas(file: File, folder: 'masuk' | 'keluar' | 'laporan'): Promise<string> {
  const path = `${BUCKET_BERKAS}/${folder}/${idUnik()}/${namaAman(file.name)}`;
  const { error } = await sb().storage.from(BUCKET_BERKAS).upload(path.slice(BUCKET_BERKAS.length + 1), file, {
    contentType: 'application/pdf',
    upsert: false,
  });
  if (error) {
    throw new GalatData(`Gagal mengunggah berkas: ${error.message}`);
  }
  return path;
}

/** Path objek tanda tangan milik seorang pengguna (deterministik). */
export function pathTandaTangan(userId: string): string {
  return `${BUCKET_TTD}/ttd/${namaAman(userId)}.png`;
}

/**
 * Unggah gambar tanda tangan ke bucket `tanda-tangan`.
 * Dipakai untuk tanda tangan milik pengguna tertentu (bisa diunggah admin).
 */
export async function unggahTandaTangan(dataUrl: string, userId: string): Promise<string> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  if (blob.size > MAKS_TTD) {
    throw new GalatData('Ukuran gambar tanda tangan maksimal 2MB.');
  }
  const objek = `ttd/${namaAman(userId)}.png`;
  const { error } = await sb().storage.from(BUCKET_TTD).upload(objek, blob, {
    contentType: 'image/png',
    upsert: true,
  });
  if (error) {
    throw new GalatData(`Gagal menyimpan tanda tangan: ${error.message}`);
  }
  return `${BUCKET_TTD}/${objek}`;
}

/** Hapus berkas dari bucket `berkas-surat`. */
export async function hapusBerkas(path: string): Promise<void> {
  if (!path) return;
  const objek = path.startsWith(`${BUCKET_BERKAS}/`)
    ? path.slice(BUCKET_BERKAS.length + 1)
    : path;
  const { error } = await sb().storage.from(BUCKET_BERKAS).remove([objek]);
  if (error) {
    throw new GalatData(`Gagal menghapus berkas: ${error.message}`);
  }
}

/** Hapus gambar tanda tangan dari bucket `tanda-tangan`. */
export async function hapusBerkasTandaTangan(path: string): Promise<void> {
  if (!path) return;
  const objek = path.startsWith(`${BUCKET_TTD}/`) ? path.slice(BUCKET_TTD.length + 1) : path;
  const { error } = await sb().storage.from(BUCKET_TTD).remove([objek]);
  if (error) {
    throw new GalatData(`Gagal menghapus tanda tangan: ${error.message}`);
  }
}

/**
 * Ubah path Storage menjadi URL yang bisa dibuka peramban.
 * Route /api/files memeriksa visibilitas lewat RLS sebelum mengalirkan berkas.
 * Path yang bukan Storage (mis. '/docs/...' pada Mode Demo) dibiarkan apa adanya.
 */
export function urlBerkas(path?: string | null): string {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  if (!path.startsWith(`${BUCKET_BERKAS}/`) && !path.startsWith(`${BUCKET_TTD}/`)) return path;
  return `/api/files/${path.split('/').map(encodeURIComponent).join('/')}`;
}
