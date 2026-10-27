import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from './config';

/**
 * Klien Supabase untuk Server Component / Route Handler / Server Action.
 * Di Next.js 16 `cookies()` bersifat async.
 * Mengembalikan `null` bila Supabase belum dikonfigurasi (Mode Demo).
 */
export async function getSupabaseServer(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured()) return null;

  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Penulisan cookie gagal bila konteks hanya-baca (mis. Server
          // Component). Refresh token ditangani oleh proxy.ts.
        }
      },
    },
  });
}

/**
 * Klien dengan service_role — HANYA untuk operasi server tepercaya
 * (seed, reset password, penerbitan signed URL). Jangan pernah dipakai
 * pada jalur yang dipanggil pengguna, karena service_role melewati RLS.
 */
export async function getSupabaseAdmin(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured()) return null;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;

  const { createClient } = await import('@supabase/supabase-js');
  return createClient(SUPABASE_URL, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
