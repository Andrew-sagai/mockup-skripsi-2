import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Menjalankan pengingat batas waktu disposisi.
 *
 * Pemanggil yang sah hanya penjadwal (pg_cron / Vercel Cron) yang menyertakan
 * `CRON_SECRET` pada header `x-cron-secret`. Route ini memakai service_role
 * karena `rpc_proses_pengingat_batas_waktu` menolak eksekusi oleh peran
 * pengguna biasa.
 *
 * Vercel Cron mengirim rahasia lewat header `Authorization: Bearer <CRON_SECRET>`,
 * jadi keduanya diterima di sini agar route bisa dipanggil langsung dari
 * dashboard Vercel tanpa pengatur tambahan.
 */
async function jalankan(request: NextRequest) {
  const secret = process.env.CRON_SECRET ?? '';
  if (!secret) {
    return NextResponse.json(
      { galat: 'CRON_SECRET belum diisi pada .env.local. Route pengingat dinonaktifkan.' },
      { status: 503 }
    );
  }

  const headerKustom = request.headers.get('x-cron-secret') ?? '';
  const bearer = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  const diberikan = headerKustom || bearer;
  if (diberikan !== secret) {
    return NextResponse.json({ galat: 'Akses ditolak.' }, { status: 401 });
  }

  const admin = await getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { galat: 'SUPABASE_SERVICE_ROLE_KEY belum diisi pada .env.local.' },
      { status: 503 }
    );
  }

  const { data, error } = await admin.rpc('rpc_proses_pengingat_batas_waktu', {
    p_now: new Date().toISOString(),
  });

  if (error) {
    return NextResponse.json({ galat: error.message }, { status: 500 });
  }

  return NextResponse.json({ sukses: true, data });
}

export async function GET(request: NextRequest) {
  return jalankan(request);
}

export async function POST(request: NextRequest) {
  return jalankan(request);
}
