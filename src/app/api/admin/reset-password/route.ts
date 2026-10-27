import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer, getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * Mengatur ulang kata sandi akun pengguna.
 *
 * Kata sandi tidak pernah disimpan di basis data — hanya di Supabase Auth.
 * Route ini memakai service_role karena `auth.admin` tidak tersedia untuk
 * peran pengguna biasa, dan karena itu punten selalu di server.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = String(body?.userId ?? '').trim();
    const password = String(body?.password ?? '').trim();

    if (!userId || !password) {
      return NextResponse.json(
        { galat: 'Parameter userId dan password wajib diisi.' },
        { status: 400 }
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { galat: 'Kata sandi minimal 6 karakter.' },
        { status: 400 }
      );
    }

    const supabase = await getSupabaseServer();
    if (!supabase) {
      return NextResponse.json(
        { galat: 'Supabase belum dikonfigurasi. Isi .env.local lalu jalankan ulang aplikasi.' },
        { status: 503 }
      );
    }

    const { data: sesi } = await supabase.auth.getUser();
    if (!sesi.user) {
      return NextResponse.json({ galat: 'Anda harus login.' }, { status: 401 });
    }
    const { data: pemanggil } = await supabase
      .from('users')
      .select('role')
      .eq('auth_id', sesi.user.id)
      .maybeSingle();
    if (!pemanggil || pemanggil.role !== 'admin') {
      return NextResponse.json(
        { galat: 'Akses ditolak: Anda tidak memiliki wewenang untuk aksi ini.' },
        { status: 403 }
      );
    }

    const admin = await getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json(
        { galat: 'SUPABASE_SERVICE_ROLE_KEY belum diisi pada .env.local.' },
        { status: 503 }
      );
    }

    const { data: target, error: errCari } = await admin
      .from('users')
      .select('id, nama, email, auth_id')
      .eq('id', userId)
      .maybeSingle();
    if (errCari) {
      return NextResponse.json({ galat: errCari.message }, { status: 500 });
    }
    if (!target) {
      return NextResponse.json({ galat: 'Pengguna tidak ditemukan.' }, { status: 404 });
    }
    if (!target.auth_id) {
      return NextResponse.json(
        { galat: 'Pengguna ini belum memiliki akun Auth. Jalankan ulang skrip seed.' },
        { status: 409 }
      );
    }

    const { error: errUbah } = await admin.auth.admin.updateUserById(target.auth_id, {
      password,
    });
    if (errUbah) {
      return NextResponse.json({ galat: errUbah.message }, { status: 400 });
    }

    return NextResponse.json({
      sukses: true,
      pesan: `Kata sandi untuk ${target.nama} berhasil diatur ulang.`,
      data: { id: target.id, email: target.email },
    });
  } catch (galat: any) {
    return NextResponse.json(
      { galat: galat?.message || 'Terjadi kesalahan internal server.' },
      { status: 500 }
    );
  }
}
