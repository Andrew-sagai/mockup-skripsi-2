import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer, getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * Membuat akun Supabase Auth untuk pengguna domain yang baru dibuat, lalu
 * menautkan `auth.users.id` ke baris `users`.
 *
 * Catatan: `service_role` hanya dipakai di route server ini — tidak pernah
 * di browser dan tidak pernah pada jalur yang membaca data milik pengguna.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const domainUserId = String(body?.domainUserId ?? '').trim();
    const email = String(body?.email ?? '').trim().toLowerCase();
    const password = String(body?.password ?? '').trim();

    if (!domainUserId || !email || !password) {
      return NextResponse.json(
        { galat: 'Parameter domainUserId, email, dan password wajib diisi.' },
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

    // Hanya Administrator yang boleh membuat akun.
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

    // Idempoten: kalau akun Auth dengan email ini sudah ada, pakai yang ada.
    let authId: string | null = null;
    const { data: daftar, error: errList } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (errList) {
      return NextResponse.json({ galat: errList.message }, { status: 500 });
    }
    const ada = daftar.users.find((u) => (u.email ?? '').toLowerCase() === email);
    if (ada) {
      authId = ada.id;
    } else {
      const { data: dibuat, error: errBuat } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (errBuat) {
        return NextResponse.json({ galat: errBuat.message }, { status: 400 });
      }
      authId = dibuat.user.id;
    }

    const { error: errTaut } = await admin
      .from('users')
      .update({ auth_id: authId, updated_at: new Date().toISOString() })
      .eq('id', domainUserId);
    if (errTaut) {
      return NextResponse.json({ galat: errTaut.message }, { status: 500 });
    }

    return NextResponse.json({
      sukses: true,
      pesan: 'Akun berhasil disiapkan.',
      data: { domainUserId, authId, email },
    });
  } catch (galat: any) {
    return NextResponse.json(
      { galat: galat?.message || 'Terjadi kesalahan internal server.' },
      { status: 500 }
    );
  }
}
