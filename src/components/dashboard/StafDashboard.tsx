'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { JENIS_INSTRUKSI_LABELS, SIFAT_SURAT_LABELS } from '@/lib/types';
import { ListTodo, CheckCircle, ArrowRight, AlertCircle, RefreshCw, Bell } from 'lucide-react';
import { BadgeSifat, ChipStatus, PenandaBatasWaktu } from '@/components/ui';

export default function StafDashboard() {
  const { state, getScopedDisposisi } = useStore();
  const user = state.currentUser;
  
  const [filterStatus, setFilterStatus] = useState<string>('semua');
  const [filterSifat, setFilterSifat] = useState<string>('semua');

  if (!user) return null;

  const myDisposisi = getScopedDisposisi();
  const myPenugasan = state.penugasan.filter(p => p.stafId === user.id && myDisposisi.some(d => d.id === p.disposisiId));
  const aktif = myPenugasan.filter(p => p.status === 'ditugaskan' || p.status === 'dikerjakan').length;
  const selesai = myPenugasan.filter(p => p.status === 'selesai').length;
  const dikembalikan = myPenugasan.filter(p => p.status === 'dikembalikan').length;

  const myNotifs = state.notifikasi.filter(n => n.userId === user.id);
  const unreadNotifs = myNotifs.filter(n => !n.dibaca).length;



  const filteredPenugasan = myPenugasan.filter(p => {
    const disp = myDisposisi.find(d => d.id === p.disposisiId);
    const sm = disp ? state.suratMasuk.find(s => s.id === disp.suratMasukId) : null;
    
    if (filterStatus !== 'semua' && p.status !== filterStatus) return false;
    if (filterSifat !== 'semua' && sm?.sifat !== filterSifat) return false;
    return true;
  });

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Dashboard Tugas Saya</h1>
          <p>Daftar disposisi lanjutan yang ditugaskan kepada Anda</p>
        </div>
      </div>

      {/* Ringkasan Notifikasi */}
      {unreadNotifs > 0 && (
        <div style={{ background: 'var(--primary-50)', border: '1px solid var(--primary-200)', borderRadius: 8, padding: '12px 16px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Bell size={18} style={{ color: 'var(--primary-600)' }} />
          <div style={{ flex: 1, fontSize: 14 }}>
            Anda memiliki <strong>{unreadNotifs}</strong> notifikasi baru yang belum dibaca.
          </div>
          <Link href="/notifikasi" className="btn btn-sm btn-primary">Lihat Notifikasi</Link>
        </div>
      )}

      {/* 1. Antrian Tindakan (Perlu tindakan Anda) */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h2 style={{ fontSize: 16 }}>Perlu tindakan Anda</h2>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {aktif === 0 && dikembalikan === 0 ? (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <CheckCircle size={40} style={{ color: 'var(--success)', marginBottom: 12 }} />
              <p style={{ color: 'var(--text-muted)' }}>Hebat! Anda tidak memiliki penugasan yang perlu ditindaklanjuti.</p>
            </div>
          ) : (
            <table className="data-table compact-table">
              <tbody>
                {/* Dikembalikan */}
                {myPenugasan.filter(p => p.status === 'dikembalikan').length > 0 && (
                  <tr>
                    <td colSpan={5} style={{ background: 'var(--rahasia-tint)', fontSize: 13, fontWeight: 600, color: 'var(--rahasia)' }}>
                      Laporan dikembalikan — perlu revisi ({dikembalikan})
                    </td>
                  </tr>
                )}
                {myPenugasan.filter(p => p.status === 'dikembalikan').map(p => {
                  const disp = myDisposisi.find(d => d.id === p.disposisiId);
                  const sm = disp ? state.suratMasuk.find(s => s.id === disp.suratMasukId) : null;
                  return (
                    <tr key={`kembali-${p.id}`} className="actionable">
                      <td style={{ width: '120px', fontFamily: 'var(--font-serif)', color: 'var(--text-secondary)' }}>{sm?.nomorAgenda}</td>
                      <td style={{ fontWeight: 500 }}>{sm?.perihal}</td>
                      <td style={{ width: '100px' }}>
                        {sm?.sifat && <BadgeSifat sifat={sm.sifat} />}
                      </td>
                      <td style={{ width: '140px', color: 'var(--text-muted)', fontSize: 13 }}>{disp ? JENIS_INSTRUKSI_LABELS[disp.instruksi] : '-'}</td>
                      <td style={{ width: '100px', textAlign: 'right' }}>
                        <Link href={`/disposisi/${p.disposisiId}`} className="btn btn-sm btn-secondary">Revisi</Link>
                      </td>
                    </tr>
                  );
                })}

                {/* Tugas Aktif (ditugaskan, dikerjakan) */}
                {myPenugasan.filter(p => p.status === 'ditugaskan' || p.status === 'dikerjakan').length > 0 && (
                  <tr>
                    <td colSpan={5} style={{ background: 'var(--gray-50)', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Sedang dikerjakan ({aktif})
                    </td>
                  </tr>
                )}
                {myPenugasan.filter(p => p.status === 'ditugaskan' || p.status === 'dikerjakan').map(p => {
                  const disp = myDisposisi.find(d => d.id === p.disposisiId);
                  const sm = disp ? state.suratMasuk.find(s => s.id === disp.suratMasukId) : null;
                  return (
                    <tr key={`aktif-${p.id}`} className="actionable">
                      <td style={{ width: '120px', fontFamily: 'var(--font-serif)', color: 'var(--text-secondary)' }}>{sm?.nomorAgenda}</td>
                      <td style={{ fontWeight: 500 }}>{sm?.perihal}</td>
                      <td style={{ width: '100px' }}>
                        {sm?.sifat && <BadgeSifat sifat={sm.sifat} />}
                      </td>
                      <td style={{ width: '140px', color: 'var(--text-muted)', fontSize: 13 }}>{disp ? JENIS_INSTRUKSI_LABELS[disp.instruksi] : '-'}</td>
                      <td style={{ width: '100px', textAlign: 'right' }}>
                        <Link href={`/disposisi/${p.disposisiId}`} className="btn btn-sm btn-secondary">Proses</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 2. Statistik Grid */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card warning">
          <div className="stat-icon warning"><RefreshCw size={24} /></div>
          <div className="stat-content">
            <div className="stat-label">Tugas Aktif</div>
            <div className="stat-value">{aktif}</div>
          </div>
        </div>
        <div className="stat-card danger">
          <div className="stat-icon danger"><AlertCircle size={24} /></div>
          <div className="stat-content">
            <div className="stat-label">Dikembalikan</div>
            <div className="stat-value">{dikembalikan}</div>
          </div>
        </div>
        <div className="stat-card success">
          <div className="stat-icon success"><CheckCircle size={24} /></div>
          <div className="stat-content">
            <div className="stat-label">Selesai</div>
            <div className="stat-value">{selesai}</div>
          </div>
        </div>
      </div>

      {/* 3. Daftar Penugasan (Semua) */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 15 }}>Semua Penugasan</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <select className="form-control" style={{ width: 140, fontSize: 13, padding: '4px 8px' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="semua">Semua Status</option>
              <option value="ditugaskan">Ditugaskan</option>
              <option value="dikerjakan">Dikerjakan</option>
              <option value="dikembalikan">Dikembalikan</option>
              <option value="selesai">Selesai</option>
            </select>
            <select className="form-control" style={{ width: 140, fontSize: 13, padding: '4px 8px' }} value={filterSifat} onChange={e => setFilterSifat(e.target.value)}>
              <option value="semua">Semua Sifat</option>
              <option value="biasa">Biasa</option>
              <option value="penting">Penting</option>
              <option value="segera">Segera</option>
            </select>
          </div>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <table className="data-table compact-table">
            <thead>
              <tr>
                <th>Perihal Surat</th>
                <th>Sifat</th>
                <th>Instruksi</th>
                <th>Batas Waktu</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredPenugasan.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="empty-state" style={{ padding: '40px 0' }}>
                      <AlertCircle size={40} style={{ color: 'var(--gray-300)', marginBottom: 12 }} />
                      <p style={{ color: 'var(--text-muted)' }}>Tidak ada penugasan yang sesuai filter.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPenugasan.map(p => {
                  const disp = myDisposisi.find(d => d.id === p.disposisiId);
                  const sm = disp ? state.suratMasuk.find(s => s.id === disp.suratMasukId) : null;
                  const isTerlambat = disp && disp.tenggat && new Date(disp.tenggat) < new Date() && disp.status !== 'selesai';
                  return (
                    <tr key={p.id}>
                      <td>
                        <Link href={`/disposisi/${p.disposisiId}`} style={{ fontWeight: 500, fontSize: 13 }}>{sm?.perihal?.slice(0, 50)}</Link>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sm?.asalSurat} • {sm?.nomorAgenda}</div>
                      </td>
                      <td>
                        {sm?.sifat && <BadgeSifat sifat={sm.sifat} />}
                      </td>
                      <td style={{ fontSize: 13 }}>{disp ? JENIS_INSTRUKSI_LABELS[disp.instruksi] : '-'}</td>
                      <td style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
                        {disp?.tenggat ? <PenandaBatasWaktu tanggal={disp.tenggat} sekarang={new Date()} /> : '-'}
                      </td>
                      <td><ChipStatus jenis="disposisi" status={p.status} compact /></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

