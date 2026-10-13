'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useStore } from '@/lib/store';
import { Bell, Check, CheckCheck, AlertTriangle, AlertCircle, Info } from 'lucide-react';

export default function NotifikasiPage() {
  const { state, dispatch } = useStore();
  const user = state.currentUser;
  
  const [filterBaca, setFilterBaca] = useState('semua');
  const [filterTingkat, setFilterTingkat] = useState('semua');
  const [error, setError] = useState('');

  const notifs = state.notifikasi.filter(n => n.userId === user?.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const unread = notifs.filter(n => !n.dibaca).length;

  const handleMarkRead = (id: string) => {
    dispatch({ type: 'MARK_NOTIFIKASI_READ', payload: id });
  };

  const handleMarkAllRead = () => {
    notifs.filter(n => !n.dibaca).forEach(n => {
      dispatch({ type: 'MARK_NOTIFIKASI_READ', payload: n.id });
    });
  };

  const formatTime = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) + ' ' +
      date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  const filteredNotifs = notifs.filter(n => {
    if (filterBaca === 'belum_dibaca' && n.dibaca) return false;
    if (filterTingkat !== 'semua' && (n.tingkat || 'info') !== filterTingkat) return false;
    return true;
  });

  const getTingkatIcon = (tingkat?: string) => {
    if (tingkat === 'bahaya') return <AlertCircle size={20} color="var(--danger)" />;
    if (tingkat === 'peringatan') return <AlertTriangle size={20} color="var(--warning)" />;
    return <Info size={20} color="var(--primary-500)" />;
  };

  if (error) {
    return (
      <DashboardLayout>
        <div className="empty-state">
          <AlertCircle size={48} style={{ color: 'var(--danger)' }} />
          <h3>Galat Muat</h3>
          <p>{error}</p>
          <button className="btn btn-secondary" onClick={() => setError('')}>Coba Lagi</button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="animate-fadeIn">
        <div className="page-header" style={{ flexWrap: 'wrap', gap: 16 }}>
          <div className="page-header-left">
            <h1>Notifikasi</h1>
            <p>{unread > 0 ? `${unread} notifikasi belum dibaca` : 'Semua notifikasi telah dibaca'}</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <select className="form-control" style={{ width: 150 }} value={filterBaca} onChange={e => setFilterBaca(e.target.value)}>
              <option value="semua">Semua Status</option>
              <option value="belum_dibaca">Belum Dibaca</option>
            </select>
            <select className="form-control" style={{ width: 150 }} value={filterTingkat} onChange={e => setFilterTingkat(e.target.value)}>
              <option value="semua">Semua Tingkat</option>
              <option value="info">Informasi</option>
              <option value="peringatan">Peringatan</option>
              <option value="bahaya">Bahaya</option>
            </select>
            {unread > 0 && (
              <button className="btn btn-secondary" onClick={handleMarkAllRead}>
                <CheckCheck size={16} /> Tandai Semua Dibaca
              </button>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-body" style={{ padding: 0 }}>
            {filteredNotifs.length === 0 ? (
              <div className="empty-state"><Bell size={48} /><h3>Tidak ada notifikasi</h3></div>
            ) : filteredNotifs.map(n => (
              <div key={n.id} style={{
                padding: '16px 24px', borderBottom: '1px solid var(--gray-100)',
                background: !n.dibaca ? (n.tingkat === 'bahaya' ? '#fef2f2' : n.tingkat === 'peringatan' ? '#fffbeb' : 'var(--primary-50)') : 'transparent',
                display: 'flex', alignItems: 'flex-start', gap: 14,
                transition: 'background 0.2s',
              }}>
                <div style={{ marginTop: 2 }}>
                  {getTingkatIcon(n.tingkat)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                    {n.judul}
                    {n.isRahasia && <span className="badge badge-danger" style={{ marginLeft: 8, fontSize: 10 }}>RAHASIA</span>}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {n.isRahasia ? n.pesan.replace(/".*?"/g, '"[RAHASIA]"') : n.pesan}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{formatTime(n.createdAt)}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {n.tautanUrl && (
                    <Link href={n.tautanUrl} className="btn btn-sm btn-primary">Lihat Objek</Link>
                  )}
                  {!n.dibaca && (
                    <button className="btn btn-sm btn-ghost" onClick={() => handleMarkRead(n.id)} title="Tandai dibaca">
                      <Check size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
