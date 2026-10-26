'use client';
import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore } from '@/lib/store';
import { getMenuItems } from '@/lib/rbac';
import { USER_ROLE_LABELS } from '@/lib/types';
import {
  LayoutDashboard, MailOpen, FileCheck, Send, Archive,
  Search, Bell, BarChart3, Users, Database, ScrollText,
  Menu, X, LogOut, ListChecks, ClipboardList, FilePen
} from 'lucide-react';

const iconMap: Record<string, React.ReactNode> = {
  LayoutDashboard: <LayoutDashboard />,
  MailOpen: <MailOpen />,
  FileCheck: <FileCheck />,
  ListChecks: <ListChecks />,
  ClipboardList: <ClipboardList />,
  FilePen: <FilePen />,
  Send: <Send />,
  Archive: <Archive />,
  Search: <Search />,
  Bell: <Bell />,
  BarChart3: <BarChart3 />,
  Users: <Users />,
  Database: <Database />,
  ScrollText: <ScrollText />,
};

function resolveActiveHref(pathname: string, items: { href: string }[]): string | null {
  const matches = items.filter(
    (item) => pathname === item.href || pathname.startsWith(item.href + '/')
  );
  if (matches.length === 0) return null;
  return matches.reduce((longest, current) =>
    current.href.length > longest.href.length ? current : longest
  ).href;
}

function SidebarNavItem({
  href, label, icon, active, badge, onClick
}: {
  href: string; label: string; icon: string; active: boolean; badge?: number; onClick: () => void;
}) {
  return (
    <Link
      href={href}
      className={`sidebar-link ${active ? 'active' : ''} cursor-pointer focus-visible-ring`}
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
    >
      {iconMap[icon]}
      <span>{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="sidebar-badge">{badge}</span>
      )}
    </Link>
  );
}

export default function Sidebar() {
  const { state, logout, getUnreadCount } = useStore();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const user = state.currentUser;
  if (!user) return null;

  const menuItems = getMenuItems(user.role);
  const unreadCount = getUnreadCount();

  const pendingParafTtdCount = useMemo(() => {
    if (!user) return 0;
    if (user.role === 'sekretaris') {
      return state.suratKeluar.filter((s) => s.status === 'menunggu_paraf').length;
    }
    if (user.role === 'kepala_dinas') {
      return state.suratKeluar.filter((s) => s.status === 'menunggu_ttd').length;
    }
    return 0;
  }, [state.suratKeluar, user.role]);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };

  const mainMenus = menuItems.filter(m => !['pengguna', 'data-master', 'log-aktivitas', 'laporan-admin'].includes(m.id));
  const adminMenus = menuItems.filter(m => ['pengguna', 'data-master', 'log-aktivitas', 'laporan-admin'].includes(m.id));
  const activeHref = resolveActiveHref(pathname, menuItems);

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="sidebar-mobile-toggle"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <img src="/logo.png" alt="Logo Minahasa Selatan" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div className="sidebar-title">
            <h1>e-Surat Distan</h1>
            <span>Kab. Minahasa Selatan</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Menu Utama</div>
          {mainMenus.map((item) => (
            <SidebarNavItem
              key={item.id}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={activeHref === item.href}
              badge={
                item.id === 'notifikasi'
                  ? unreadCount
                  : item.id === 'paraf-ttd'
                  ? pendingParafTtdCount
                  : undefined
              }
              onClick={() => setMobileOpen(false)}
            />
          ))}

          {adminMenus.length > 0 && (
            <>
              <div className="sidebar-section-label">Administrasi</div>
              {adminMenus.map((item) => (
                <SidebarNavItem
                  key={item.id}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  active={activeHref === item.href}
                  onClick={() => setMobileOpen(false)}
                />
              ))}
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{getInitials(user.nama)}</div>
            <div className="sidebar-user-info" title={user.nama}>
              <div className="sidebar-user-name ellipsis" title={user.nama}>{user.nama}</div>
              <div className="sidebar-user-role">{USER_ROLE_LABELS[user.role]}</div>
            </div>
          </div>
          <button
            className="btn btn-secondary"
            style={{ width: '100%', justifyContent: 'center', marginTop: '12px' }}
            onClick={logout}
          >
            <LogOut size={18} />
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            zIndex: 90, display: 'none'
          }}
        />
      )}
    </>
  );
}
