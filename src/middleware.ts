import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Daftar role yang valid
type Role = 'admin' | 'petugas_surat' | 'sekretaris' | 'kepala_dinas' | 'kepala_bidang' | 'staf_pelaksana';

// Definisi akses rute berdasarkan role
const routePermissions: Record<string, Role[]> = {
  '/dashboard': ['admin', 'petugas_surat', 'sekretaris', 'kepala_dinas', 'kepala_bidang', 'staf_pelaksana'],
  '/surat-masuk': ['petugas_surat', 'sekretaris', 'kepala_dinas', 'kepala_bidang', 'staf_pelaksana'],
  '/disposisi': ['petugas_surat', 'sekretaris', 'kepala_dinas', 'kepala_bidang', 'staf_pelaksana'],
  '/tindak-lanjut': ['kepala_bidang'],
  '/tugas-saya': ['staf_pelaksana'],
  '/surat-keluar': ['petugas_surat', 'sekretaris', 'kepala_dinas', 'kepala_bidang', 'staf_pelaksana'],
  '/arsip': ['petugas_surat', 'sekretaris', 'kepala_dinas', 'kepala_bidang', 'staf_pelaksana'],
  '/pelacakan': ['petugas_surat', 'sekretaris', 'kepala_dinas', 'kepala_bidang', 'staf_pelaksana'],
  '/notifikasi': ['petugas_surat', 'sekretaris', 'kepala_dinas', 'kepala_bidang', 'staf_pelaksana'],
  '/laporan': ['petugas_surat', 'sekretaris', 'kepala_dinas', 'kepala_bidang', 'staf_pelaksana'],
  '/admin': ['admin'],
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Abaikan request ke file statis dan API internal Next.js
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

  // Jika route adalah root (/), biarkan page.tsx yang redirect ke /dashboard atau /login
  if (pathname === '/') {
    return NextResponse.next();
  }

  const roleCookie = request.cookies.get('userRole');
  const role = roleCookie?.value as Role | undefined;

  // Jika tidak ada role/belum login, arahkan ke login
  if (!role) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Cek izin berdasarkan root path (misal: /admin/pengguna -> /admin)
  const rootPath = `/${pathname.split('/')[1]}`;
  const allowedRoles = routePermissions[rootPath];

  // Jika rute dikontrol dan role tidak diizinkan, arahkan ke 403
  if (allowedRoles && !allowedRoles.includes(role)) {
    const url = request.nextUrl.clone();
    url.pathname = '/403';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
