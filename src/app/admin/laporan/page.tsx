'use client';
import React, { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useStore } from '@/lib/store';
import { USER_ROLE_LABELS } from '@/lib/types';
import { Toast } from '@/components/ui';
import { Download, Users, Activity } from 'lucide-react';

export default function LaporanAdminPage() {
  const { state } = useStore();
  const [toastPesan, setToastPesan] = useState<string | null>(null);

  const handleDownload = () => {
    setToastPesan('Fitur unduh laporan akan tersedia pada versi produksi. (Simulasi)');
  };

  return (
    <DashboardLayout>
      <div className="animate-fadeIn">
        <div className="page-header">
          <div className="page-header-left">
            <h1>Laporan Administrator</h1>
            <p>Rekapitulasi akun pengguna dan log aktivitas sistem</p>
          </div>
          <button className="btn btn-primary" onClick={handleDownload}>
            <Download size={16} /> Unduh Laporan Lengkap
          </button>
        </div>

        <div className="two-col">
          <div className="card">
            <div className="card-header">
              <h2><Users size={18} style={{ display: 'inline', marginRight: 8 }} /> Rekapitulasi Pengguna</h2>
            </div>
            <div className="card-body">
              <table className="data-table">
                <thead>
                  <tr><th>Peran</th><th>Total Akun</th><th>Aktif</th></tr>
                </thead>
                <tbody>
                  {Object.entries(USER_ROLE_LABELS).map(([roleKey, roleName]) => {
                    const usersInRole = state.users.filter(u => u.role === roleKey);
                    const activeCount = usersInRole.filter(u => u.aktif).length;
                    return (
                      <tr key={roleKey}>
                        <td style={{ fontWeight: 500 }}>{roleName}</td>
                        <td>{usersInRole.length}</td>
                        <td><span className="badge badge-success">{activeCount}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2><Activity size={18} style={{ display: 'inline', marginRight: 8 }} /> Ringkasan Log Aktivitas</h2>
            </div>
            <div className="card-body">
              <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
                Menampilkan 10 aktivitas sistem terakhir.
              </p>
              <table className="data-table">
                <thead>
                  <tr><th>Waktu</th><th>Aksi</th><th>Pengguna</th></tr>
                </thead>
                <tbody>
                  {state.log.slice(0, 10).map(l => {
                    const u = state.users.find(x => x.id === l.userId);
                    return (
                      <tr key={l.id}>
                        <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                          {new Date(l.waktu).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ fontSize: 13 }}>{l.aksi}</td>
                        <td style={{ fontSize: 13 }}>{u?.nama || 'Sistem'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <Toast pesan={toastPesan} tingkat="info" onTutup={() => setToastPesan(null)} />
      </div>
    </DashboardLayout>
  );
}
