'use client';
import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { USER_ROLE_LABELS } from '@/lib/types';
import { Bell, ChevronDown, LogOut, User as UserIcon } from 'lucide-react';

export default function Navbar() {
  const { state, logout, getUnreadCount, dispatch, resetToInitial } = useStore();
  const router = useRouter();
  const [showNotif, setShowNotif] = useState(false);
  const [showUser, setShowUser] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotif(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setShowUser(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const user = state.currentUser;
  if (!user) return null;

  const unreadCount = getUnreadCount();
  const myNotifs = state.notifikasi
    .filter((n) => n.userId === user.id)
    .slice(0, 8);

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} menit lalu`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} jam lalu`;
    const days = Math.floor(hours / 24);
    return `${days} hari lalu`;
  };

  const handleNotifClick = (notifId: string, url?: string) => {
    dispatch({ type: 'MARK_NOTIFIKASI_READ', payload: notifId });
    setShowNotif(false);
    if (url) router.push(url);
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="navbar">
      <div className="navbar-left">
        <div className="navbar-breadcrumb">
          <span>Sistem Persuratan</span>
          <span>/</span>
          <strong>{USER_ROLE_LABELS[user.role]}</strong>
        </div>
      </div>

      <div className="navbar-right">
        {/* Notification bell */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            className="navbar-icon-btn"
            onClick={() => { setShowNotif(!showNotif); setShowUser(false); }}
            aria-label="Notifikasi"
          >
            <Bell size={20} />
            {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
          </button>

          {showNotif && (
            <div className="notif-panel">
              <div className="notif-header">
                <h3>Notifikasi</h3>
                <Link href="/notifikasi" onClick={() => setShowNotif(false)}>
                  <span style={{ fontSize: 13, color: 'var(--primary-600)' }}>Lihat Semua</span>
                </Link>
              </div>
              <div className="notif-list">
                {myNotifs.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
                    Tidak ada notifikasi
                  </div>
                ) : (
                  myNotifs.map((n) => (
                    <div
                      key={n.id}
                      className={`notif-item ${!n.dibaca ? 'unread' : ''}`}
                      onClick={() => handleNotifClick(n.id, n.tautanUrl)}
                    >
                      <div className="notif-dot" />
                      <div className="notif-content">
                        <div className="notif-title">{n.judul}</div>
                        <div className="notif-message">{n.pesan}</div>
                        <div className="notif-time">{formatTime(n.createdAt)}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User dropdown */}
        <div ref={userRef} style={{ position: 'relative' }}>
          <button
            className="navbar-user-btn"
            onClick={() => { setShowUser(!showUser); setShowNotif(false); }}
          >
            <div className="navbar-user-avatar">{getInitials(user.nama)}</div>
            <span className="navbar-user-name ellipsis" style={{ maxWidth: '120px' }} title={user.nama}>
              {user.nama}
            </span>
            <ChevronDown size={14} />
          </button>

          {showUser && (
            <div className="user-dropdown">
              <div className="user-dropdown-header">
                <div className="name">{user.nama}</div>
                <div className="email">{user.email}</div>
              </div>
              <button className="user-dropdown-item" onClick={() => { setShowUser(false); }}>
                <UserIcon size={16} />
                Profil Saya
              </button>
              <button 
                className="user-dropdown-item warning" 
                onClick={() => {
                  if (window.confirm('Reset semua data ke posisi awal mock-data?')) {
                    state.currentUser && resetToInitial();
                  }
                }}
              >
                <LogOut size={16} />
                Reset Data Demo
              </button>
              <button className="user-dropdown-item danger" onClick={handleLogout}>
                <LogOut size={16} />
                Keluar
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
