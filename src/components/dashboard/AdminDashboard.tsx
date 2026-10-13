'use client';
import React from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { USER_ROLE_LABELS, UserRole } from '@/lib/types';
import {
  Users, Building2, FolderTree, AlertTriangle, ArrowRight, ShieldAlert, UserX
} from 'lucide-react';

export default function AdminDashboard() {
  const { state } = useStore();

  const activeUsers   = state.users.filter((u) => u.aktif).length;
  const inactiveUsers = state.users.filter((u) => !u.aktif).length;
  const totalUnits    = state.unitKerja.filter((u) => u.aktif).length;
  const totalKlas     = state.klasifikasi.filter((k) => k.aktif).length;
  const failedNotifs  = state.notifikasi.filter((n) => n.statusKirim === 'gagal').length;

  // Hitungan per peran (aktif dan total)
  const roleCounts = state.users.reduce((acc, u) => {
    if (!acc[u.role]) acc[u.role] = { aktif: 0, nonaktif: 0 };
    if (u.aktif) acc[u.role].aktif += 1;
    else acc[u.role].nonaktif += 1;
    return acc;
  }, {} as Record<UserRole, { aktif: number; nonaktif: number }>);

  // 8 pengguna terbaru berdasar createdAt
  const recentUsers = [...state.users]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);

  // 6 log terbaru
  const recentLogs = [...state.log]
    .sort((a, b) => new Date(b.waktu).getTime() - new Date(a.waktu).getTime())
    .slice(0, 6);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Dashboard Administrator</h1>
          <p>Kelola pengguna, data master, dan pantau aktivitas sistem</p>
        </div>
      </div>

      {/* ─── Banner Peringatan (AT-12, AT-15) ─────────────────── */}
      {failedNotifs > 0 && (
        <div
          className="admin-banner-warning"
          role="alert"
          id="banner-notifikasi-gagal"
          style={{ marginBottom: 20 }}
        >
          <ShieldAlert size={18} aria-hidden="true" />
          <div>
            <strong>Peringatan Sistem:</strong> Terdapat {failedNotifs} notifikasi email yang
            gagal terkirim. Periksa dan kirim ulang melalui{' '}
            <Link href="/admin/log" style={{ color: 'inherit', textDecoration: 'underline' }}>
              Log Aktivitas
            </Link>
            .
          </div>
        </div>
      )}

      {/* ─── Statistik Ringkas ─────────────────────────────────── */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card primary" id="stat-pengguna-aktif">
          <div className="stat-icon primary"><Users size={24} aria-hidden="true" /></div>
          <div className="stat-content">
            <div className="stat-label">Pengguna Aktif</div>
            <div className="stat-value">{activeUsers}</div>
          </div>
        </div>
        <div className="stat-card warning" id="stat-pengguna-nonaktif">
          <div className="stat-icon warning"><UserX size={24} aria-hidden="true" /></div>
          <div className="stat-content">
            <div className="stat-label">Nonaktif</div>
            <div className="stat-value">{inactiveUsers}</div>
          </div>
        </div>
        <div className="stat-card primary" id="stat-unit-kerja">
          <div className="stat-icon primary"><Building2 size={24} aria-hidden="true" /></div>
          <div className="stat-content">
            <div className="stat-label">Unit Kerja</div>
            <div className="stat-value">{totalUnits}</div>
          </div>
        </div>
        <div className="stat-card primary" id="stat-klasifikasi">
          <div className="stat-icon primary"><FolderTree size={24} aria-hidden="true" /></div>
          <div className="stat-content">
            <div className="stat-label">Kode Klasifikasi</div>
            <div className="stat-value">{totalKlas}</div>
          </div>
        </div>
      </div>

      <div className="two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

        {/* ─── Distribusi Peran ──────────────────────────────── */}
        <div className="card" id="card-distribusi-peran">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 14 }}>Distribusi Peran</h2>
            <Link href="/admin/pengguna" className="btn btn-sm btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              Kelola <ArrowRight size={13} aria-hidden="true" />
            </Link>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <table className="data-table compact-table">
              <thead>
                <tr>
                  <th>Peran</th>
                  <th style={{ textAlign: 'right' }}>Aktif</th>
                  <th style={{ textAlign: 'right' }}>Nonaktif</th>
                </tr>
              </thead>
              <tbody>
                {(Object.entries(roleCounts) as [UserRole, { aktif: number; nonaktif: number }][]).map(([role, counts]) => (
                  <tr key={role}>
                    <td style={{ fontSize: 13 }}>{USER_ROLE_LABELS[role]}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums', fontSize: 13 }}>
                      {counts.aktif}
                    </td>
                    <td style={{ textAlign: 'right', fontSize: 13, color: counts.nonaktif > 0 ? 'var(--rahasia)' : 'var(--tinta-redup)' }}>
                      {counts.nonaktif}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ─── Status Data Master ────────────────────────────── */}
        <div className="card" id="card-status-master">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 14 }}>Status Data Master</h2>
            <Link href="/admin/data-master" className="btn btn-sm btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              Kelola <ArrowRight size={13} aria-hidden="true" />
            </Link>
          </div>
          <div className="card-body">
            <div className="admin-master-row">
              <Building2 size={16} aria-hidden="true" style={{ color: 'var(--pinus)' }} />
              <span>Unit Kerja aktif</span>
              <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{totalUnits}</strong>
            </div>
            <div className="admin-master-row">
              <FolderTree size={16} aria-hidden="true" style={{ color: 'var(--pinus)' }} />
              <span>Kode Klasifikasi aktif</span>
              <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{totalKlas}</strong>
            </div>
            <div className="admin-master-row">
              <Users size={16} aria-hidden="true" style={{ color: 'var(--pinus)' }} />
              <span>Total akun terdaftar</span>
              <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{state.users.length}</strong>
            </div>
            {state.unitKerja.filter((u) => !u.aktif).length > 0 && (
              <div className="admin-master-row admin-master-row-warn">
                <AlertTriangle size={15} aria-hidden="true" />
                <span>Unit Kerja nonaktif</span>
                <strong style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {state.unitKerja.filter((u) => !u.aktif).length}
                </strong>
              </div>
            )}
          </div>
        </div>

        {/* ─── Pengguna Terbaru ──────────────────────────────── */}
        <div className="card" id="card-pengguna-terbaru">
          <div className="card-header">
            <h2 style={{ fontSize: 14 }}>Pengguna Terbaru</h2>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <table className="data-table compact-table">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Peran</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{u.nama}</div>
                      <div style={{ fontSize: 11, color: 'var(--tinta-redup)' }}>{u.email}</div>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--tinta-redup)' }}>
                      {USER_ROLE_LABELS[u.role]}
                    </td>
                    <td>
                      <span className={`chip ${u.aktif ? 'chip-sukses' : 'chip-netral'}`} style={{ fontSize: 11 }}>
                        {u.aktif ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ─── Log Aktivitas Ringkas ─────────────────────────── */}
        <div className="card" id="card-log-ringkas">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 14 }}>Log Aktivitas Terbaru</h2>
            <Link href="/admin/log" className="btn btn-sm btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              Lihat semua <ArrowRight size={13} aria-hidden="true" />
            </Link>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {recentLogs.length === 0 ? (
              <p style={{ padding: '20px 24px', color: 'var(--tinta-redup)', fontSize: 13 }}>Belum ada aktivitas.</p>
            ) : (
              recentLogs.map((l) => {
                const user = state.users.find((u) => u.id === l.userId);
                return (
                  <div
                    key={l.id}
                    style={{
                      padding: '10px 24px', borderBottom: '1px solid var(--garis)',
                      display: 'flex', gap: 10, alignItems: 'flex-start'
                    }}
                  >
                    <div style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: 'var(--pinus)', marginTop: 6, flexShrink: 0
                    }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{l.aksi}</div>
                      <div style={{ fontSize: 12, color: 'var(--tinta-redup)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {l.detail}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--tinta-redup)', marginTop: 2 }}>
                        {user?.nama} •{' '}
                        {new Date(l.waktu).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
