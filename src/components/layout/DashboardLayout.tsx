'use client';
import React, { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useStore } from '@/lib/store';
import { routePermissions } from '@/lib/rbac';
import { checkRemindersAndOverdue } from '@/lib/reminders';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { state, isHydrated, dispatch, generateId } = useStore();
  const router = useRouter();
  const pathname = usePathname();
  // Ref untuk mencegah reminder check berjalan lebih dari sekali per mount
  const reminderChecked = useRef(false);

  useEffect(() => {
    // Jangan redirect sebelum localStorage selesai dibaca di render pertama —
    // tanpa guard ini user yang punya sesi valid akan di-redirect ke /login
    // karena state.currentUser masih null saat hydration belum selesai.
    if (!isHydrated) return;

    if (!state.currentUser) {
      router.push('/login');
      return;
    }

    // Route guard client-side
    const rootPath = `/${pathname.split('/')[1]}`;
    const allowedRoles = routePermissions[rootPath];
    if (allowedRoles && !allowedRoles.includes(state.currentUser.role)) {
      router.push('/403');
    }
  }, [state.currentUser, isHydrated, router, pathname]);

  // ── Trigger reminder & overdue check saat user login (sekali per mount) ──
  // Simulasi client-side untuk pilot — di produksi ganti dengan cron/scheduler backend.
  // Referensi: Proposal poin 13(d)(e), Bab 4 subbab Notifikasi Otomatis.
  useEffect(() => {
    if (!isHydrated || !state.currentUser) return;
    if (reminderChecked.current) return;
    reminderChecked.current = true;

    const { updatedDisposisi, newNotifikasi } = checkRemindersAndOverdue(state);

    // Dispatch notifikasi baru
    newNotifikasi.forEach(n => {
      dispatch({ type: 'ADD_NOTIFIKASI', payload: { ...n, id: `n-${generateId('rem')}` } });
    });

    // Update field reminderSentAt / overdueSentAt di disposisi terkait
    updatedDisposisi.forEach(u => {
      dispatch({ type: 'UPDATE_DISPOSISI', payload: u } as any);
    });
  }, [isHydrated, state.currentUser]);

  // Tampilkan null selama hydration berlangsung atau currentUser belum ada.
  // Ini mencegah flash redirect dan rendering layout tanpa user.
  if (!isHydrated || !state.currentUser) return null;

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar />
        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  );
}
