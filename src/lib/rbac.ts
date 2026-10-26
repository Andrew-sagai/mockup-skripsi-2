// ============================================================
// RBAC — Role-Based Access Control
// ============================================================
import { UserRole } from './types';

export const routePermissions: Record<string, UserRole[]> = {
  '/dashboard': ['admin', 'petugas_surat', 'sekretaris', 'kepala_dinas', 'kepala_bidang', 'staf_pelaksana'],
  '/surat-masuk': ['petugas_surat', 'sekretaris', 'kepala_dinas', 'kepala_bidang', 'staf_pelaksana'],
  '/disposisi': ['petugas_surat', 'sekretaris', 'kepala_dinas', 'kepala_bidang', 'staf_pelaksana'],
  '/tindak-lanjut': ['kepala_bidang'],
  '/tugas-saya': ['staf_pelaksana'],
  '/paraf-ttd': ['sekretaris', 'kepala_dinas'],
  '/surat-keluar': ['petugas_surat', 'sekretaris', 'kepala_dinas', 'kepala_bidang', 'staf_pelaksana'],
  '/arsip': ['petugas_surat', 'sekretaris', 'kepala_dinas', 'kepala_bidang', 'staf_pelaksana'],         // Admin TIDAK punya akses (Tabel 7-9)
  '/pelacakan': ['petugas_surat', 'sekretaris', 'kepala_dinas', 'kepala_bidang', 'staf_pelaksana'],     // Admin TIDAK punya akses
  '/notifikasi': ['petugas_surat', 'sekretaris', 'kepala_dinas', 'kepala_bidang', 'staf_pelaksana'],   // Admin TIDAK punya akses
  '/laporan': ['petugas_surat', 'sekretaris', 'kepala_dinas', 'kepala_bidang', 'staf_pelaksana'],
  '/profil': ['admin', 'petugas_surat', 'sekretaris', 'kepala_dinas', 'kepala_bidang', 'staf_pelaksana'],
  '/admin': ['admin'],
};

export type Permission =
  | 'dashboard:view'
  | 'users:manage'
  | 'master:manage'
  | 'surat_masuk:create'
  | 'surat_masuk:view'
  | 'surat_masuk:view_all'
  | 'disposisi:create'
  | 'disposisi:give'
  | 'disposisi:receive'
  | 'disposisi:forward'
  | 'disposisi:followup'
  | 'disposisi:review'
  | 'disposisi:coordinate'
  | 'surat_keluar:create'
  | 'surat_keluar:view'
  | 'surat_keluar:paraf'
  | 'surat_keluar:sign'
  | 'surat_keluar:document'
  | 'surat_keluar:number'
  | 'arsip:view'
  | 'arsip:manage'
  | 'pelacakan:view'
  | 'notifikasi:view'
  | 'laporan:view'
  | 'laporan:admin'
  | 'laporan:full'
  | 'log:view';

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    'dashboard:view',
    'users:manage',
    'master:manage',
    'laporan:admin',
    'log:view',
  ],
  petugas_surat: [
    'dashboard:view',
    'surat_masuk:create',
    'surat_masuk:view',
    'surat_masuk:view_all',
    'disposisi:create',
    'surat_keluar:create',
    'surat_keluar:view',
    'surat_keluar:document',
    'surat_keluar:number',
    'arsip:view',
    'arsip:manage',
    'pelacakan:view',
    'notifikasi:view',
    'laporan:view',
  ],
  sekretaris: [
    'dashboard:view',
    'surat_masuk:view',
    'surat_masuk:view_all',
    'surat_keluar:view',
    'surat_keluar:paraf',
    'disposisi:coordinate',
    'arsip:view',
    'pelacakan:view',
    'notifikasi:view',
    'laporan:view',
  ],
  kepala_dinas: [
    'dashboard:view',
    'surat_masuk:view',
    'surat_masuk:view_all',
    'disposisi:give',
    'surat_keluar:view',
    'surat_keluar:sign',
    'arsip:view',
    'pelacakan:view',
    'notifikasi:view',
    'laporan:view',
    'laporan:full',
  ],
  kepala_bidang: [
    'dashboard:view',
    'surat_masuk:view',
    'disposisi:receive',
    'disposisi:forward',
    'disposisi:followup',
    'disposisi:review',
    'surat_keluar:view',
    'surat_keluar:create',
    'arsip:view',
    'pelacakan:view',
    'notifikasi:view',
    'laporan:view',
  ],
  staf_pelaksana: [
    'dashboard:view',
    'surat_masuk:view',
    'disposisi:followup',
    'surat_keluar:view',
    'arsip:view',
    'pelacakan:view',
    'notifikasi:view',
    'laporan:view',
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function getPermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export interface MenuItem {
  id: string;
  label: string;
  icon: string;
  href: string;
  permission?: Permission;
  children?: MenuItem[];
}

export function getMenuItems(role: UserRole): MenuItem[] {
  const allMenus: MenuItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', href: '/dashboard', permission: 'dashboard:view' },
    { id: 'surat-masuk', label: 'Surat Masuk', icon: 'MailOpen', href: '/surat-masuk' },
    { id: 'disposisi', label: 'Disposisi', icon: 'FileCheck', href: '/disposisi' },
    { id: 'tindak-lanjut', label: 'Tindak Lanjut', icon: 'ListChecks', href: '/tindak-lanjut' },
    { id: 'tugas-saya', label: 'Tugas Saya', icon: 'ClipboardList', href: '/tugas-saya' },
    { id: 'paraf-ttd', label: 'Paraf & Tanda Tangan', icon: 'FilePen', href: '/paraf-ttd' },
    { id: 'surat-keluar', label: 'Surat Keluar', icon: 'Send', href: '/surat-keluar' },
    { id: 'arsip', label: 'Arsip Digital', icon: 'Archive', href: '/arsip', permission: 'arsip:view' },
    { id: 'pelacakan', label: 'Pelacakan Status', icon: 'Search', href: '/pelacakan', permission: 'pelacakan:view' },
    { id: 'notifikasi', label: 'Notifikasi', icon: 'Bell', href: '/notifikasi', permission: 'notifikasi:view' },
    { id: 'laporan', label: 'Laporan', icon: 'BarChart3', href: '/laporan', permission: 'laporan:view' },
    { id: 'pengguna', label: 'Kelola Pengguna', icon: 'Users', href: '/admin/pengguna', permission: 'users:manage' },
    { id: 'data-master', label: 'Data Master', icon: 'Database', href: '/admin/data-master', permission: 'master:manage' },
    { id: 'log-aktivitas', label: 'Log Aktivitas', icon: 'ScrollText', href: '/admin/log', permission: 'log:view' },
    { id: 'laporan-admin', label: 'Laporan', icon: 'BarChart3', href: '/admin/laporan', permission: 'laporan:admin' },
  ];

  const roleMenus: Record<UserRole, string[]> = {
    admin: ['dashboard', 'pengguna', 'data-master', 'log-aktivitas', 'laporan-admin'],
    petugas_surat: ['dashboard', 'surat-masuk', 'surat-keluar', 'disposisi', 'arsip', 'pelacakan', 'notifikasi', 'laporan'],
    sekretaris: ['dashboard', 'paraf-ttd', 'surat-keluar', 'disposisi', 'pelacakan', 'arsip', 'notifikasi', 'laporan'],
    kepala_dinas: ['dashboard', 'paraf-ttd', 'disposisi', 'surat-keluar', 'pelacakan', 'arsip', 'notifikasi', 'laporan'],
    kepala_bidang: ['dashboard', 'disposisi', 'tindak-lanjut', 'pelacakan', 'arsip', 'notifikasi', 'laporan'],
    staf_pelaksana: ['dashboard', 'tugas-saya', 'pelacakan', 'arsip', 'notifikasi', 'laporan'],
  };

  const allowedIds = roleMenus[role] || [];
  return allMenus.filter(menu => allowedIds.includes(menu.id));
}
