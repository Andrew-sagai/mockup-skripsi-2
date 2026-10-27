import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from '@/lib/supabase/config';

type Role =
  | 'admin'
  | 'petugas_surat'
  | 'sekretaris'
  | 'kepala_dinas'
  | 'kepala_bidang'
  | 'staf_pelaksana';

// Definisi akses rute berdasarkan role — hanya untuk navigasi (UX).
// Penentu akses data yang sesungguhnya adalah Row Level Security di Postgres.
const routePermissions: Record<string, Role[]> = {
  '/dashboard': ['admin', 'petugas_surat', 'sekretaris', 'kepala_dinas', 'kepala_bidang', 'staf_pelaksana'],
  '/surat-masuk': ['petugas_surat', 'sekretaris', 'kepala_dinas', 'kepala_bidang', 'staf_pelaksana'],
  '/disposisi': ['petugas_surat', 'sekretaris', 'kepala_dinas', 'kepala_bidang', 'staf_pelaksana'],
  '/tindak-lanjut': ['kepala_bidang'],
  '/tugas-saya': ['staf_pelaksana'],
  '/paraf-ttd': ['sekretaris', 'kepala_dinas'],
  '/surat-keluar': ['petugas_surat', 'sekretaris', 'kepala_dinas', 'kepala_bidang', 'staf_pelaksana'],
  '/arsip': ['petugas_surat', 'sekretaris', 'kepala_dinas', 'kepala_bidang', 'staf_pelaksana'],
  '/pelacakan': ['petugas_surat', 'sekretaris', 'kepala_dinas', 'kepala_bidang', 'staf_pelaksana'],
  '/notifikasi': ['petugas_surat', 'sekretaris', 'kepala_dinas', 'kepala_bidang', 'staf_pelaksana'],
  '/laporan': ['petugas_surat', 'sekretaris', 'kepala_dinas', 'kepala_bidang', 'staf_pelaksana'],
  '/profil': ['admin', 'petugas_surat', 'sekretaris', 'kepala_dinas', 'kepala_bidang', 'staf_pelaksana'],
  '/admin': ['admin'],
};

function redirectTo(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  return NextResponse.redirect(url);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') ||
    pathname === '/login' ||
    pathname === '/katalog' ||
    pathname === '/403'
  ) {
    return NextResponse.next();
  }

  if (pathname === '/') {
    return NextResponse.next();
  }

  const rootPath = `/${pathname.split('/')[1]}`;
  const allowedRoles = routePermissions[rootPath];

  // ── Mode Demo: belum ada Supabase, pakai cookie peran versi lama ─────────
  if (!isSupabaseConfigured()) {
    const role = request.cookies.get('userRole')?.value as Role | undefined;
    if (!role) return redirectTo(request, '/login');
    if (allowedRoles && !allowedRoles.includes(role)) return redirectTo(request, '/403');
    return NextResponse.next();
  }

  // ── Mode Supabase: session JWT yang sesungguhnya ─────────────────────────
  let response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getUser() memverifikasi ke server Auth — getSession() hanya baca cookie.
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return redirectTo(request, '/login');
  }

  // Peran hanya untuk navigasi; nilainya diambil dari baris `users` milik
  // pengguna yang sedang login. RLS tetap menjadi pengunci data sebenarnya.
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('auth_id', data.user.id)
    .maybeSingle();

  const role = profile?.role as Role | undefined;
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return redirectTo(request, '/403');
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)'],
};
