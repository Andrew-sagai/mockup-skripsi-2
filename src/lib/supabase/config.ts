// Konfigurasi Supabase.
//
// Tanpa NEXT_PUBLIC_SUPABASE_URL aplikasi berjalan dalam MODE DEMO:
// seluruh state tetap di localStorage seperti versi sebelumnya dan tidak ada
// error. Mode Supabase aktif otomatis begitu URL + anon key diisi di .env.local.

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export function isSupabaseConfigured(): boolean {
  return SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
}

export const MODE_DEMO = !isSupabaseConfigured();
