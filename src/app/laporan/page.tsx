'use client';
import React, { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useStore } from '@/lib/store';
import {
  STATUS_SURAT_MASUK_LABELS, STATUS_SURAT_KELUAR_LABELS,
  SIFAT_SURAT_LABELS, USER_ROLE_LABELS
} from '@/lib/types';
import { BarChart3, Download, FileText, MailOpen, Send, FileCheck, Users, Clock } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { BadgeSifat, ChipStatus } from '@/components/ui';

const COLORS = ['#009166', '#ffc107', '#3b82f6', '#ef4444', '#8b5cf6', '#10b981'];

export default function LaporanPage() {
  const { state } = useStore();
  const user = state.currentUser;
  const [tab, setTab] = useState('utama');
  const [periode, setPeriode] = useState('bulanan');
  const [isTinjau, setIsTinjau] = useState(false);

  if (!user) return null;

  if (user.role === 'staf_pelaksana') {
    return (
      <DashboardLayout>
        <div className="empty-state">
          <h3>Akses Ditolak (403)</h3>
          <p>Staf Pelaksana tidak memiliki akses ke fitur laporan.</p>
        </div>
      </DashboardLayout>
    );
  }

  const role = user.role;

  // ─── Data bersama ─────────────────────────────────────────
  const allSM = state.suratMasuk;
  const allSK = state.suratKeluar;
  const allDisp = state.disposisi;

  // Filter per scope role
  const scopedSM = role === 'kepala_bidang'
    ? allSM.filter(s => allDisp.some(d =>
        d.suratMasukId === s.id && d.bidangTujuan.some(b => b.unitKerjaId === user.unitKerjaId)
      ))
    : allSM;

  const scopedDisp = role === 'kepala_bidang'
    ? allDisp.filter(d => d.bidangTujuan.some(b => b.unitKerjaId === user.unitKerjaId))
    : role === 'sekretaris'
      ? allDisp.filter(d => d.bidangTujuan.length > 1 || d.instruksi === 'koordinasi_konfirmasi')
      : allDisp;

  const scopedSK = role === 'sekretaris'
    ? allSK
    : role === 'kepala_dinas'
      ? allSK
      : allSK;

  const totalSM = scopedSM.length;
  const totalSK = scopedSK.length;
  const totalDisp = scopedDisp.length;
  const selesaiDisp = scopedDisp.filter(d => d.status === 'selesai').length;
  const terlambat = scopedDisp.filter(d =>
    d.status !== 'selesai' && d.tenggat && new Date(d.tenggat) < new Date()
  ).length;

  // Chart — SM by sifat
  const smBySifat = Object.entries(
    scopedSM.reduce((acc, s) => { acc[s.sifat] = (acc[s.sifat] || 0) + 1; return acc; }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name: SIFAT_SURAT_LABELS[name as keyof typeof SIFAT_SURAT_LABELS] || name, value }));

  // Chart — SM by status
  const smByStatus = Object.entries(
    scopedSM.reduce((acc, s) => { acc[s.status] = (acc[s.status] || 0) + 1; return acc; }, {} as Record<string, number>)
  ).map(([key, value]) => ({
    name: STATUS_SURAT_MASUK_LABELS[key as keyof typeof STATUS_SURAT_MASUK_LABELS] || key,
    value
  }));

  // Chart — SK by status
  const skByStatus = Object.entries(
    scopedSK.reduce((acc, s) => { acc[s.status] = (acc[s.status] || 0) + 1; return acc; }, {} as Record<string, number>)
  ).map(([key, value]) => ({
    name: STATUS_SURAT_KELUAR_LABELS[key as keyof typeof STATUS_SURAT_KELUAR_LABELS] || key,
    value
  }));

  // Chart — Disposisi by bidang (Kadis/Admin)
  const dispByBidang = state.unitKerja
    .filter(u => u.jenis === 'bidang' && u.aktif)
    .map(u => ({
      name: u.nama.replace('Bidang ', ''),
      total: allDisp.filter(d => d.bidangTujuan.some(b => b.unitKerjaId === u.id)).length,
      selesai: allDisp.filter(d => d.status === 'selesai' && d.bidangTujuan.some(b => b.unitKerjaId === u.id)).length,
    }));

  // Kinerja rata-rata hari (Kadis)
  const selesaiWithDuration = allDisp
    .filter(d => d.status === 'selesai' && d.createdAt)
    .map(d => {
      const tlSelesai = state.tindakLanjut.find(t => t.disposisiId === d.id && t.status === 'disetujui');
      if (!tlSelesai) return null;
      const durHours = (new Date(tlSelesai.createdAt).getTime() - new Date(d.createdAt).getTime()) / (1000 * 60 * 60);
      return durHours / 24;
    }).filter((v): v is number => v !== null);
  const avgDays = selesaiWithDuration.length > 0
    ? (selesaiWithDuration.reduce((a, b) => a + b, 0) / selesaiWithDuration.length).toFixed(1)
    : '—';

  // Penugasan staf (Kabid)
  const myStaf = state.users.filter(u => u.role === 'staf_pelaksana' && u.unitKerjaId === user.unitKerjaId);

  // ─── Tabs per role ────────────────────────────────────────
  const tabs: { key: string; label: string }[] = [];
  if (role === 'admin') {
    tabs.push({ key: 'akun', label: 'Akun & Pengguna' }, { key: 'log', label: 'Log Aktivitas' });
  } else if (role === 'petugas_surat') {
    tabs.push({ key: 'surat_masuk', label: 'Buku Agenda Masuk' }, { key: 'surat_keluar', label: 'Buku Agenda Keluar' }, { key: 'arsip', label: 'Pengarsipan' });
  } else if (role === 'sekretaris') {
    tabs.push({ key: 'surat_keluar', label: 'Surat Keluar & Paraf' }, { key: 'disposisi', label: 'Disposisi Lintas Bidang' });
  } else if (role === 'kepala_dinas') {
    tabs.push({ key: 'utama', label: 'Rekapitulasi Menyeluruh' }, { key: 'disposisi', label: 'Disposisi per Bidang' }, { key: 'kinerja', label: 'Kinerja Penyelesaian' });
  } else if (role === 'kepala_bidang') {
    tabs.push({ key: 'disposisi', label: 'Disposisi Bidang' }, { key: 'staf', label: 'Kinerja Staf' });
  } else if (role === 'staf_pelaksana') {
    tabs.push({ key: 'penugasan', label: 'Riwayat Penugasan Saya' });
  }

    const activeTab = tabs.find(t => t.key === tab) ? tab : tabs[0]?.key || 'utama';

  // Handler for Unduh
  const handleUnduh = () => {
    // Format ditetapkan saat implementasi (simulasi)
    alert(`Mengunduh laporan ${tabs.find(t=>t.key === activeTab)?.label} (${periode})`);
  };

  return (
    <DashboardLayout>
      <div className="animate-fadeIn">
        <div className="page-header" style={{ flexWrap: 'wrap', gap: 16 }}>
          <div className="page-header-left">
            <h1>Laporan Rekapitulasi</h1>
            <p>Pilih jenis laporan dan periode untuk melihat data</p>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-body" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 200 }}>
              <label style={{ fontSize: 12, fontWeight: 600 }}>Jenis Laporan</label>
              <select className="form-control" value={activeTab} onChange={e => { setTab(e.target.value); setIsTinjau(false); }}>
                {tabs.map(t => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 200 }}>
              <label style={{ fontSize: 12, fontWeight: 600 }}>Periode</label>
              <select className="form-control" value={periode} onChange={e => { setPeriode(e.target.value); setIsTinjau(false); }}>
                <option value="harian">Harian</option>
                <option value="bulanan">Bulanan</option>
                <option value="tahunan">Tahunan</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', height: 50 }}>
              <button className="btn btn-primary" onClick={() => setIsTinjau(true)}>
                <FileText size={16} /> Tinjau Laporan
              </button>
              {isTinjau && (
                <button className="btn btn-secondary" style={{ marginLeft: 8 }} onClick={handleUnduh}>
                  <Download size={16} /> Unduh
                </button>
              )}
            </div>
          </div>
        </div>

        {isTinjau && (
          <div className="laporan-content animate-fadeIn">

        {/* Summary cards — tersembunyi untuk Admin */}
        {role !== 'admin' && (
          <div className="stats-grid" style={{ marginBottom: 24 }}>
            <div className="stat-card primary">
              <div className="stat-icon primary"><MailOpen size={24} /></div>
              <div className="stat-content">
                <div className="stat-label">Surat Masuk</div>
                <div className="stat-value">{totalSM}</div>
              </div>
            </div>
            {(role === 'kepala_dinas' || role === 'petugas_surat' || role === 'sekretaris') && (
              <div className="stat-card info">
                <div className="stat-icon info"><Send size={24} /></div>
                <div className="stat-content">
                  <div className="stat-label">Surat Keluar</div>
                  <div className="stat-value">{totalSK}</div>
                </div>
              </div>
            )}
            <div className="stat-card success">
              <div className="stat-icon success"><FileCheck size={24} /></div>
              <div className="stat-content">
                <div className="stat-label">Disposisi Selesai</div>
                <div className="stat-value">{selesaiDisp}/{totalDisp}</div>
              </div>
            </div>
            <div className="stat-card danger">
              <div className="stat-icon danger"><BarChart3 size={24} /></div>
              <div className="stat-content">
                <div className="stat-label">Melewati Tenggat</div>
                <div className="stat-value">{terlambat}</div>
              </div>
            </div>
          </div>
        )}

        {/* ── ADMIN: Akun & Pengguna ───────────────────────────── */}
        {role === 'admin' && activeTab === 'akun' && (
          <div className="two-col">
            <div className="card">
              <div className="card-header"><h2>Distribusi Akun per Peran</h2></div>
              <div className="card-body" style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={Object.entries(
                        state.users.reduce((acc, u) => { acc[u.role] = (acc[u.role] || 0) + 1; return acc; }, {} as Record<string, number>)
                      ).map(([name, value]) => ({ name: USER_ROLE_LABELS[name as keyof typeof USER_ROLE_LABELS] || name, value }))}
                      cx="50%" cy="50%" outerRadius={90} dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {state.users.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="card">
              <div className="card-header"><h2>Daftar Pengguna & Status</h2></div>
              <div className="card-body" style={{ padding: 0 }}>
                <table className="data-table">
                  <thead><tr><th>Nama</th><th>Peran</th><th>Unit Kerja</th><th>Status</th></tr></thead>
                  <tbody>
                    {state.users.map(u => (
                      <tr key={u.id}>
                        <td style={{ fontSize: 13, fontWeight: 500 }}>{u.nama}</td>
                        <td style={{ fontSize: 12 }}>{USER_ROLE_LABELS[u.role]}</td>
                        <td style={{ fontSize: 12 }}>{state.unitKerja.find(uk => uk.id === u.unitKerjaId)?.nama || '—'}</td>
                        <td><span className={`badge ${u.aktif ? 'badge-success' : 'badge-danger'}`}>{u.aktif ? 'Aktif' : 'Nonaktif'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {role === 'admin' && activeTab === 'log' && (
          <div className="card">
            <div className="card-header"><h2>Log Aktivitas Sistem</h2></div>
            <div className="card-body" style={{ padding: 0 }}>
              <table className="data-table">
                <thead><tr><th>Waktu</th><th>Pengguna</th><th>Aksi</th><th>Detail</th></tr></thead>
                <tbody>
                  {state.log.slice(0, 50).map(l => {
                    const pelaku = state.users.find(u => u.id === l.userId);
                    return (
                      <tr key={l.id}>
                        <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{new Date(l.waktu).toLocaleString('id-ID')}</td>
                        <td style={{ fontSize: 13, fontWeight: 500 }}>{pelaku?.nama || l.userId}</td>
                        <td style={{ fontSize: 13 }}><span className="badge badge-info">{l.aksi}</span></td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{l.detail}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── PETUGAS SURAT: Buku Agenda ──────────────────────── */}
        {role === 'petugas_surat' && activeTab === 'surat_masuk' && (
          <div className="two-col">
            <div className="card">
              <div className="card-header"><h2>Distribusi per Sifat Surat</h2></div>
              <div className="card-body" style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={smBySifat} cx="50%" cy="50%" outerRadius={90} dataKey="value"
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                      {smBySifat.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="card">
              <div className="card-header"><h2>Distribusi per Status</h2></div>
              <div className="card-body" style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={smByStatus} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)" />
                    <XAxis type="number" fontSize={12} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" width={140} fontSize={11} />
                    <Tooltip />
                    <Bar dataKey="value" fill="var(--primary-500)" name="Jumlah" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="card" style={{ gridColumn: '1 / -1' }}>
              <div className="card-header"><h2>Buku Agenda Surat Masuk Digital</h2></div>
              <div className="card-body" style={{ padding: 0 }}>
                <table className="data-table">
                  <thead><tr><th>No. Agenda</th><th>Asal Surat</th><th>Perihal</th><th>Sifat</th><th>Status</th><th>Tanggal Terima</th></tr></thead>
                  <tbody>
                    {allSM.map(s => (
                      <tr key={s.id}>
                        <td style={{ fontWeight: 600, fontSize: 12, fontFamily: 'monospace' }}>{s.nomorAgenda}</td>
                        <td style={{ fontSize: 13 }}>{s.asalSurat}</td>
                        <td style={{ fontSize: 13, maxWidth: 220 }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.perihal}</div>
                        </td>
                        <td><BadgeSifat sifat={s.sifat} /></td>
                        <td><ChipStatus jenis="suratMasuk" status={s.status} compact /></td>
                        <td style={{ fontSize: 12 }}>{new Date(s.tanggalTerima).toLocaleDateString('id-ID')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {role === 'petugas_surat' && activeTab === 'surat_keluar' && (
          <div className="card">
            <div className="card-header"><h2>Buku Agenda Surat Keluar Digital</h2></div>
            <div className="card-body" style={{ padding: 0 }}>
              <table className="data-table">
                <thead><tr><th>Nomor Surat</th><th>Tujuan</th><th>Perihal</th><th>Status</th><th>Tanggal Kirim</th></tr></thead>
                <tbody>
                  {allSK.map(s => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 600, fontSize: 12, fontFamily: 'monospace' }}>{s.nomorSurat || '— Belum bernomor —'}</td>
                      <td style={{ fontSize: 13 }}>{s.tujuan}</td>
                      <td style={{ fontSize: 13, maxWidth: 220 }}>{s.perihal}</td>
                      <td><ChipStatus jenis="suratKeluar" status={s.status} compact /></td>
                      <td style={{ fontSize: 12 }}>{s.tanggalKirim ? new Date(s.tanggalKirim).toLocaleDateString('id-ID') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {role === 'petugas_surat' && activeTab === 'arsip' && (
          <div className="card">
            <div className="card-header"><h2>Rekap Arsip Digital</h2></div>
            <div className="card-body" style={{ padding: 0 }}>
              <table className="data-table">
                <thead><tr><th>Kode Arsip</th><th>Perihal</th><th>Jenis</th><th>Tahun</th><th>Tanggal Arsip</th></tr></thead>
                <tbody>
                  {state.arsip.map(a => (
                    <tr key={a.id}>
                      <td style={{ fontWeight: 600, fontSize: 12, fontFamily: 'monospace' }}>{a.kodeArsip}</td>
                      <td style={{ fontSize: 13 }}>{a.perihal}</td>
                      <td><span className={`badge ${a.jenisSurat === 'masuk' ? 'badge-info' : 'badge-primary'}`}>{a.jenisSurat === 'masuk' ? 'Surat Masuk' : 'Surat Keluar'}</span></td>
                      <td style={{ fontSize: 13 }}>{a.tahun}</td>
                      <td style={{ fontSize: 12 }}>{new Date(a.createdAt).toLocaleDateString('id-ID')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── SEKRETARIS ───────────────────────────────────────── */}
        {role === 'sekretaris' && activeTab === 'surat_keluar' && (
          <div className="two-col">
            <div className="card">
              <div className="card-header"><h2>Status Paraf Koordinasi</h2></div>
              <div className="card-body" style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={skByStatus} cx="50%" cy="50%" outerRadius={90} dataKey="value"
                      label={({ name, percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}>
                      {skByStatus.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                    </Pie>
                    <Tooltip /><Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="card">
              <div className="card-header"><h2>Surat Keluar — Detail</h2></div>
              <div className="card-body" style={{ padding: 0 }}>
                <table className="data-table">
                  <thead><tr><th>Perihal</th><th>Tujuan</th><th>Status</th></tr></thead>
                  <tbody>
                    {allSK.map(s => (
                      <tr key={s.id}>
                        <td style={{ fontSize: 13 }}>{s.perihal.slice(0, 40)}</td>
                        <td style={{ fontSize: 13 }}>{s.tujuan}</td>
                        <td><span className={`badge ${s.status === 'menunggu_paraf' ? 'badge-warning' : s.status === 'terkirim' ? 'badge-success' : 'badge-info'}`}>{STATUS_SURAT_KELUAR_LABELS[s.status]}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {role === 'sekretaris' && activeTab === 'disposisi' && (
          <div className="card">
            <div className="card-header"><h2>Disposisi Lintas Bidang / Koordinasi</h2></div>
            <div className="card-body" style={{ padding: 0 }}>
              <table className="data-table">
                <thead><tr><th>Surat</th><th>Bidang Tujuan</th><th>Instruksi</th><th>Tenggat</th><th>Status</th></tr></thead>
                <tbody>
                  {scopedDisp.map(d => {
                    const sm = state.suratMasuk.find(s => s.id === d.suratMasukId);
                    const bidangNames = d.bidangTujuan.map(b => state.unitKerja.find(u => u.id === b.unitKerjaId)?.nama.replace('Bidang ', '') || '').join(', ');
                    return (
                      <tr key={d.id}>
                        <td style={{ fontSize: 13 }}>{sm?.perihal.slice(0, 40)}</td>
                        <td style={{ fontSize: 12 }}>{bidangNames}</td>
                        <td style={{ fontSize: 12 }}>{d.instruksi.replace(/_/g, ' ')}</td>
                        <td style={{ fontSize: 12 }}>{d.tenggat ? new Date(d.tenggat).toLocaleDateString('id-ID') : '—'}</td>
                        <td><span className={`badge ${d.status === 'selesai' ? 'badge-success' : 'badge-warning'}`}>{d.status.replace(/_/g, ' ')}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── KEPALA DINAS ─────────────────────────────────────── */}
        {role === 'kepala_dinas' && activeTab === 'utama' && (
          <div className="two-col">
            <div className="card">
              <div className="card-header"><h2>Surat Masuk per Sifat</h2></div>
              <div className="card-body" style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={smBySifat} cx="50%" cy="50%" outerRadius={90} dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}>
                      {smBySifat.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="card">
              <div className="card-header"><h2>Status Pemrosesan Surat Masuk</h2></div>
              <div className="card-body" style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={smByStatus} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)" />
                    <XAxis type="number" fontSize={12} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" width={150} fontSize={11} />
                    <Tooltip />
                    <Bar dataKey="value" fill="var(--primary-500)" name="Jumlah" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {(role === 'kepala_dinas' && activeTab === 'disposisi') && (
          <div className="two-col">
            <div className="card" style={{ gridColumn: '1 / -1' }}>
              <div className="card-header"><h2>Rekapitulasi Disposisi per Bidang</h2></div>
              <div className="card-body" style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dispByBidang}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis fontSize={12} allowDecimals={false} />
                    <Tooltip /><Legend />
                    <Bar dataKey="total" fill="var(--primary-300)" name="Total Disposisi" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="selesai" fill="var(--success)" name="Selesai" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="card" style={{ gridColumn: '1 / -1' }}>
              <div className="card-header"><h2>Detail Semua Disposisi</h2></div>
              <div className="card-body" style={{ padding: 0 }}>
                <table className="data-table">
                  <thead><tr><th>Surat</th><th>Instruksi</th><th>Bidang</th><th>Tenggat</th><th>Status</th></tr></thead>
                  <tbody>
                    {allDisp.map(d => {
                      const sm = state.suratMasuk.find(s => s.id === d.suratMasukId);
                      const bidangNames = d.bidangTujuan.map(b => state.unitKerja.find(u => u.id === b.unitKerjaId)?.kode || '').join(', ');
                      const isOver = d.status !== 'selesai' && d.tenggat && new Date(d.tenggat) < new Date();
                      return (
                        <tr key={d.id}>
                          <td style={{ fontSize: 13 }}>{sm?.perihal.slice(0, 40)}...</td>
                          <td style={{ fontSize: 12 }}>{d.instruksi.replace(/_/g, ' ')}</td>
                          <td style={{ fontSize: 12 }}>{bidangNames}</td>
                          <td style={{ fontSize: 12 }}>
                            {d.tenggat ? new Date(d.tenggat).toLocaleDateString('id-ID') : '—'}
                            {isOver && <span className="badge badge-danger" style={{ marginLeft: 6, fontSize: 10 }}>Terlambat</span>}
                          </td>
                          <td><span className={`badge ${d.status === 'selesai' ? 'badge-success' : d.status === 'didisposisikan' ? 'badge-primary' : 'badge-warning'}`}>{d.status.replace(/_/g, ' ')}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {role === 'kepala_dinas' && activeTab === 'kinerja' && (
          <div className="two-col">
            <div className="card">
              <div className="card-header"><h2>Indikator Kinerja Utama</h2></div>
              <div className="card-body">
                <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 24 }}>
                  <div style={{ padding: 20, background: 'var(--success-light)', borderRadius: 'var(--border-radius-lg)', textAlign: 'center' }}>
                    <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--success)' }}>{selesaiDisp}</div>
                    <div style={{ fontSize: 13, color: '#065f46', marginTop: 4 }}>Disposisi Selesai</div>
                  </div>
                  <div style={{ padding: 20, background: 'var(--danger-light)', borderRadius: 'var(--border-radius-lg)', textAlign: 'center' }}>
                    <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--danger)' }}>{terlambat}</div>
                    <div style={{ fontSize: 13, color: '#991b1b', marginTop: 4 }}>Melewati Tenggat</div>
                  </div>
                  <div style={{ padding: 20, background: 'var(--info-light)', borderRadius: 'var(--border-radius-lg)', textAlign: 'center' }}>
                    <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--info)' }}>
                      {totalDisp > 0 ? Math.round((selesaiDisp / totalDisp) * 100) : 0}%
                    </div>
                    <div style={{ fontSize: 13, color: '#1e40af', marginTop: 4 }}>Tingkat Penyelesaian</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--gray-50)', borderRadius: 8 }}>
                  <Clock size={20} style={{ color: 'var(--primary-500)' }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Rata-rata Waktu Penyelesaian</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--primary-600)' }}>{avgDays} hari</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="card-header"><h2>Kinerja per Bidang</h2></div>
              <div className="card-body" style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dispByBidang}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis fontSize={12} allowDecimals={false} />
                    <Tooltip /><Legend />
                    <Bar dataKey="total" fill="var(--gray-300)" name="Total" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="selesai" fill="var(--success)" name="Selesai" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ── KEPALA BIDANG ─────────────────────────────────────── */}
        {role === 'kepala_bidang' && activeTab === 'disposisi' && (
          <div className="two-col">
            <div className="card">
              <div className="card-header"><h2>Status Disposisi Bidang</h2></div>
              <div className="card-body" style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={Object.entries(scopedDisp.reduce((acc, d) => { acc[d.status] = (acc[d.status] || 0) + 1; return acc; }, {} as Record<string, number>))
                        .map(([k, v]) => ({ name: k.replace(/_/g, ' '), value: v }))}
                      cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {scopedDisp.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="card">
              <div className="card-header"><h2>Daftar Disposisi yang Belum Selesai</h2></div>
              <div className="card-body" style={{ padding: 0 }}>
                <table className="data-table">
                  <thead><tr><th>Perihal</th><th>Tenggat</th><th>Status</th></tr></thead>
                  <tbody>
                    {scopedDisp.filter(d => d.status !== 'selesai').map(d => {
                      const sm = state.suratMasuk.find(s => s.id === d.suratMasukId);
                      const isOver = d.tenggat && new Date(d.tenggat) < new Date();
                      return (
                        <tr key={d.id} style={{ background: isOver ? '#fff7f7' : undefined }}>
                          <td style={{ fontSize: 13 }}>{sm?.perihal.slice(0, 40)}</td>
                          <td style={{ fontSize: 12 }}>
                            {d.tenggat ? new Date(d.tenggat).toLocaleDateString('id-ID') : '—'}
                            {isOver && <span className="badge badge-danger" style={{ marginLeft: 6, fontSize: 10 }}>Terlambat</span>}
                          </td>
                          <td><span className={`badge ${d.status === 'diterima_bidang' ? 'badge-info' : 'badge-warning'}`}>{d.status.replace(/_/g, ' ')}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {role === 'kepala_bidang' && activeTab === 'staf' && (
          <div className="card">
            <div className="card-header"><h2>Kinerja Staf Pelaksana</h2></div>
            <div className="card-body" style={{ padding: 0 }}>
              <table className="data-table">
                <thead><tr><th>Nama Staf</th><th>Tugas Total</th><th>Tugas Aktif</th><th>Selesai</th><th>Dikembalikan</th><th>Terlambat</th></tr></thead>
                <tbody>
                  {myStaf.map(s => {
                    const penugasan = state.penugasan.filter(p => p.stafId === s.id);
                    const aktif = penugasan.filter(p => p.status === 'ditugaskan' || p.status === 'dikerjakan').length;
                    const selesai = penugasan.filter(p => p.status === 'selesai').length;
                    const dikembalikan = penugasan.filter(p => p.status === 'dikembalikan').length;
                    const terlambatStaf = penugasan.filter(p => {
                      const disp = state.disposisi.find(d => d.id === p.disposisiId);
                      return disp && disp.tenggat && new Date(disp.tenggat) < new Date() && disp.status !== 'selesai';
                    }).length;
                    return (
                      <tr key={s.id}>
                        <td style={{ fontWeight: 600, fontSize: 13 }}>{s.nama}</td>
                        <td style={{ fontSize: 13 }}>{penugasan.length}</td>
                        <td><span className={`badge ${aktif > 0 ? 'badge-warning' : 'badge-gray'}`}>{aktif}</span></td>
                        <td><span className="badge badge-success">{selesai}</span></td>
                        <td><span className={`badge ${dikembalikan > 0 ? 'badge-danger' : 'badge-gray'}`}>{dikembalikan}</span></td>
                        <td><span className={`badge ${terlambatStaf > 0 ? 'badge-danger' : 'badge-gray'}`}>{terlambatStaf}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
