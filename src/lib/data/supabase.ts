'use client';

import { getSupabaseBrowser } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Galat yang aman ditampilkan ke pengguna (pesan Bahasa Indonesia). */
export class GalatData extends Error {
  readonly kode?: string;
  constructor(pesan: string, kode?: string) {
    super(pesan);
    this.name = 'GalatData';
    this.kode = kode;
  }
}

/** Klien browser; melempar GalatData bila Supabase belum dikonfigurasi. */
export function sb(): SupabaseClient {
  const client = getSupabaseBrowser();
  if (!client) {
    throw new GalatData(
      'Supabase belum dikonfigurasi. Isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY pada berkas .env.local lalu jal ulang `npm run dev`.'
    );
  }
  return client;
}

export function supabaseAktif(): boolean {
  return isSupabaseConfigured();
}

/**
 * Terjemahkan galat PostgREST/Postgres menjadi pesan Bahasa Indonesia
 * yang sama dengan pesan pada versi prototipe.
 */
function pesanGalat(error: { message?: string; code?: string; details?: string; hint?: string }): string {
  const asli = (error.message || '').trim();

  if (error.code === '42501') {
    return 'Akses ditolak: Anda tidak memiliki wewenang untuk aksi ini.';
  }
  if (error.code === 'PGRST116') {
    return 'Data tidak ditemukan.';
  }
  if (/row-level security/i.test(asli)) {
    return 'Akses ditolak: Anda tidak memiliki wewenang untuk aksi ini.';
  }
  if (/duplicate key value/i.test(asli)) {
    return 'Data sudah terdaftar. Periksa kembali isian yang unik.';
  }
  if (/violates foreign key/i.test(asli)) {
    return 'Data masih terhubung dengan data lain sehingga tidak dapat dihapus.';
  }
  if (/Failed to fetch|NetworkError|fetch failed/i.test(asli)) {
    return 'Gagal terhubung ke server. Periksa koneksi internet Anda dan coba lagi.';
  }
  return asli || 'Terjadi kesalahan yang tidak terduga.';
}

/** Panggil RPC Postgres dan kembalikan hasilnya. */
export async function rpc<T = unknown>(namaFungsi: string, params: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await sb().rpc(namaFungsi, params);
  if (error) {
    throw new GalatData(pesanGalat(error), error.code);
  }
  return (data ?? null) as T;
}

/** Ambil baris dari sebuah tabel; RLS menyaring otomatis. */
export async function ambil<T = any>(
  tabel: string,
  opsi: { select?: string; order?: { kolom: string; arah?: 'asc' | 'desc' }[]; eq?: Record<string, unknown> } = {}
): Promise<T[]> {
  let q = sb().from(tabel).select(opsi.select || '*');
  if (opsi.eq) {
    for (const [kolom, nilai] of Object.entries(opsi.eq)) {
      q = q.eq(kolom, nilai as any);
    }
  }
  if (opsi.order?.length) {
    // `order()` milik supabase-js menerima satu kolom beserta opsinya, bukan
    // daftar spesifikasi. Pengurutan beberapa kolom karena itu dirangkai.
    for (const o of opsi.order) {
      q = q.order(o.kolom, { ascending: (o.arah ?? 'asc') !== 'desc' });
    }
  }
  const { data, error } = await q;
  if (error) {
    throw new GalatData(pesanGalat(error), error.code);
  }
  return (data ?? []) as T[];
}

/** Ambil satu baris; `null` bila tidak ada. */
export async function ambilSatu<T = any>(
  tabel: string,
  select: string,
  eq: Record<string, unknown>
): Promise<T | null> {
  let q = sb().from(tabel).select(select);
  for (const [kolom, nilai] of Object.entries(eq)) {
    q = q.eq(kolom, nilai as any);
  }
  const { data, error } = await q.maybeSingle();
  if (error) {
    throw new GalatData(pesanGalat(error), error.code);
  }
  return (data ?? null) as T | null;
}
