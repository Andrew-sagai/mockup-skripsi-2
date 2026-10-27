import { getBatasWaktuState } from '../src/lib/batas-waktu.ts';
import { getMenuItems } from '../src/lib/rbac.ts';
import { USER_ROLE_LABELS } from '../src/lib/types.ts';
import type { UserRole } from '../src/lib/types.ts';

function resolveActiveHref(pathname: string, items: { href: string }[]): string | null {
  const matches = items.filter(
    (item) => pathname === item.href || pathname.startsWith(item.href + '/')
  );
  if (matches.length === 0) return null;
  return matches.reduce((longest, current) =>
    current.href.length > longest.href.length ? current : longest
  ).href;
}

function runTests() {
  console.log("=== Menguji resolveActiveHref ===");
  const items = [
    { href: '/disposisi' },
    { href: '/disposisi/buat' },
    { href: '/tugas-saya' }
  ];
  console.assert(resolveActiveHref('/disposisi', items) === '/disposisi', 'Satu item aktif');
  console.assert(resolveActiveHref('/disposisi/buat/123', items) === '/disposisi/buat', 'Rute bersarang memilih href terpanjang');
  console.assert(resolveActiveHref('/tugas-saya', items) === '/tugas-saya', 'Rute lain');
  console.assert(resolveActiveHref('/not-found', items) === null, 'Tidak ada yang cocok');
  console.log("✔ Lulus: resolveActiveHref");

  console.log("\n=== Menguji getBatasWaktuState ===");
  const hariIni = new Date('2026-10-09T12:00:00Z');
  console.assert(getBatasWaktuState('2026-10-10', 'menunggu_pemeriksaan', hariIni) === 'normal', 'Belum lewat = normal');
  console.assert(getBatasWaktuState('2026-10-08', 'selesai', hariIni) === 'selesai', 'Status Selesai = selesai, walau lewat');
  console.assert(getBatasWaktuState('2026-10-08', 'diteruskan_staf', hariIni) === 'terlambat', 'Status belum selesai & lewat = terlambat');
  console.assert(getBatasWaktuState(null, 'diteruskan_staf', hariIni) === 'normal', 'Kosong = normal');
  console.log("✔ Lulus: getBatasWaktuState");

  console.log("\n=== Menguji Konfigurasi Menu ===");
  const roles = Object.keys(USER_ROLE_LABELS) as UserRole[];
  for (const role of roles) {
    const menus = getMenuItems(role);
    const seenHrefs = new Set();
    const seenIds = new Set();
    for (const menu of menus) {
      if (seenIds.has(menu.id)) throw new Error(`Role ${role} memiliki id ganda: ${menu.id}`);
      if (seenHrefs.has(menu.href)) throw new Error(`Role ${role} memiliki href ganda: ${menu.href}`);
      if (!menu.icon) throw new Error(`Role ${role} menu ${menu.id} tidak memiliki icon`);
      if (!menu.href) throw new Error(`Role ${role} menu ${menu.id} tidak memiliki href`);
      seenIds.add(menu.id);
      seenHrefs.add(menu.href);
    }
  }
  console.log("✔ Lulus: Konfigurasi Menu (key dan href unik, lengkap)");

  console.log("\nSemua pengujian berhasil.");
}

runTests();
