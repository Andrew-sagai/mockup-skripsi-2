'use client';
import React, { useState, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useStore } from '@/lib/store';
import { ScrollText, Search, Filter, RotateCcw } from 'lucide-react';

export default function LogAktivitasPage() {
  const { state, dispatch } = useStore();
  const [retryingIds, setRetryingIds] = React.useState<Record<string, boolean>>({});

  // ── Filter state ────────────────────────────────────────────
  const [filterPelaku, setFilterPelaku] = useState('all');
  const [filterAksi, setFilterAksi]     = useState('all');
  const [filterDari, setFilterDari]     = useState('');
  const [filterSampai, setFilterSampai] = useState('');
  const [searchText, setSearchText]     = useState('');

  // Daftar unik pelaku dan aksi untuk dropdown
  const allLogs = useMemo(() =>
    [...state.log].sort((a, b) => new Date(b.waktu).getTime() - new Date(a.waktu).getTime()),
    [state.log]
  );

  const uniqueAksi = useMemo(() =>
    Array.from(new Set(allLogs.map((l) => l.aksi))).sort(),
    [allLogs]
  );

  const uniquePelakuIds = useMemo(() =>
    Array.from(new Set(allLogs.map((l) => l.userId))),
    [allLogs]
  );

  // ── Terapkan filter ─────────────────────────────────────────
  const filtered = useMemo(() => {
    return allLogs.filter((l) => {
      const matchPelaku = filterPelaku === 'all' || l.userId === filterPelaku;
      const matchAksi   = filterAksi   === 'all' || l.aksi === filterAksi;
      const matchSearch = !searchText  || l.detail.toLowerCase().includes(searchText.toLowerCase()) || l.aksi.toLowerCase().includes(searchText.toLowerCase());
      const tgl = new Date(l.waktu);
      const matchDari   = !filterDari   || tgl >= new Date(filterDari);
      const matchSampai = !filterSampai || tgl <= new Date(filterSampai + 'T23:59:59');
      return matchPelaku && matchAksi && matchSearch && matchDari && matchSampai;
    });
  }, [allLogs, filterPelaku, filterAksi, searchText, filterDari, filterSampai]);

  const hasFilter = filterPelaku !== 'all' || filterAksi !== 'all' || filterDari || filterSampai || searchText;

  const resetFilter = () => {
    setFilterPelaku('all');
    setFilterAksi('all');
    setFilterDari('');
    setFilterSampai('');
    setSearchText('');
  };

  // ── Kirim ulang notifikasi gagal ────────────────────────────
  const failedNotifs = state.notifikasi.filter((n) => n.statusKirim === 'gagal');

  const handleRetry = (n: typeof failedNotifs[0]) => {
    const userTarget = state.users.find((u) => u.id === n.userId);
    if (!userTarget?.email) return;
    setRetryingIds((prev) => ({ ...prev, [n.id]: true }));
    fetch('/api/notifikasi/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: n.userId, email: userTarget.email, judul: n.judul, pesan: n.pesan }),
    })
      .then((res) => res.json())
      .then((data) => {
        dispatch({ type: 'UPDATE_NOTIFIKASI', payload: { id: n.id, kanal: data.kanal || 'email', statusKirim: data.statusKirim || 'gagal', pesanGalat: data.pesanGalat || '' } });
      })
      .catch((err) => {
        dispatch({ type: 'UPDATE_NOTIFIKASI', payload: { id: n.id, kanal: 'email', statusKirim: 'gagal', pesanGalat: err.message } });
      })
      .finally(() => {
        setRetryingIds((prev) => ({ ...prev, [n.id]: false }));
      });
  };

  // Warna chip aksi
  const aksiTone: Record<string, string> = {
    'Tambah Pengguna': 'var(--pinus)', 'Buat Akun': 'var(--pinus)',
    'Ubah Pengguna': 'var(--menunggu)', 'Update Data Master': 'var(--menunggu)',
    'Nonaktifkan Pengguna': 'var(--rahasia)', 'Aktifkan Pengguna': 'var(--pinus)',
    'Reset Password': 'var(--segera)',
    'Catat Surat Masuk': 'var(--pinus)', 'Disposisi Surat': 'var(--menunggu)',
    'Tambah Klasifikasi Arsip': 'var(--pinus)', 'Ubah Klasifikasi Arsip': 'var(--menunggu)',
    'Tambah Unit Kerja': 'var(--pinus)', 'Ubah Unit Kerja': 'var(--menunggu)',
    'Nonaktifkan Klasifikasi': 'var(--rahasia)', 'Aktifkan Klasifikasi': 'var(--pinus)',
  };

  return (
    <DashboardLayout>
      <div className="animate-fadeIn">
        <div className="page-header">
          <div className="page-header-left">
            <h1>Log Aktivitas Sistem</h1>
            <p>Rekam jejak seluruh aktivitas pengguna — hanya baca, tidak memuat isi surat</p>
          </div>
        </div>

        {/* ─── Banner: Notifikasi Gagal ───────────────────── */}
        {failedNotifs.length > 0 && (
          <div className="card" style={{ marginBottom: 24, borderLeft: '4px solid var(--rahasia)' }}>
            <div className="card-header">
              <h2 style={{ color: 'var(--rahasia)', fontSize: 14 }}>
                Notifikasi Email Gagal ({failedNotifs.length})
              </h2>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Waktu</th>
                    <th>Tujuan</th>
                    <th>Pesan</th>
                    <th>Galat</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {failedNotifs.map((n) => {
                    const user = state.users.find((u) => u.id === n.userId);
                    return (
                      <tr key={n.id}>
                        <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                          {new Date(n.createdAt).toLocaleString('id-ID')}
                        </td>
                        <td style={{ fontSize: 13 }}>{user?.nama || n.userId}</td>
                        <td style={{ fontSize: 13 }}>
                          <strong>{n.judul}</strong><br />
                          <span style={{ color: 'var(--tinta-redup)' }}>{n.pesan}</span>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--rahasia)' }}>{n.pesanGalat || 'Unknown error'}</td>
                        <td>
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => handleRetry(n)}
                            disabled={retryingIds[n.id]}
                          >
                            {retryingIds[n.id] ? 'Mengirim…' : 'Kirim Ulang'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── Filter Bar ─────────────────────────────────── */}
        <div className="filter-bar" style={{ flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          <div className="search-input-wrapper" style={{ flex: '1 1 200px', minWidth: 160 }}>
            <Search size={16} aria-hidden="true" />
            <input
              id="log-search"
              className="search-input"
              placeholder="Cari aksi atau detail…"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>

          <select
            id="filter-log-pelaku"
            className="filter-select"
            value={filterPelaku}
            onChange={(e) => setFilterPelaku(e.target.value)}
          >
            <option value="all">Semua Pelaku</option>
            {uniquePelakuIds.map((uid) => {
              const u = state.users.find((x) => x.id === uid);
              return <option key={uid} value={uid}>{u?.nama || uid}</option>;
            })}
          </select>

          <select
            id="filter-log-aksi"
            className="filter-select"
            value={filterAksi}
            onChange={(e) => setFilterAksi(e.target.value)}
          >
            <option value="all">Semua Aksi</option>
            {uniqueAksi.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>

          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--tinta-redup)' }}>
            <Filter size={13} aria-hidden="true" />
            Dari
            <input
              id="filter-log-dari"
              type="date"
              className="filter-select"
              style={{ paddingLeft: 8 }}
              value={filterDari}
              onChange={(e) => setFilterDari(e.target.value)}
            />
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--tinta-redup)' }}>
            s/d
            <input
              id="filter-log-sampai"
              type="date"
              className="filter-select"
              style={{ paddingLeft: 8 }}
              value={filterSampai}
              onChange={(e) => setFilterSampai(e.target.value)}
            />
          </label>

          {hasFilter && (
            <button id="btn-reset-filter-log" className="btn btn-ghost btn-sm" onClick={resetFilter} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <RotateCcw size={13} aria-hidden="true" /> Reset
            </button>
          )}
        </div>

        {/* Jumlah hasil */}
        <div style={{ fontSize: 12, color: 'var(--tinta-redup)', marginBottom: 8 }}>
          {filtered.length} dari {allLogs.length} entri log
        </div>

        {/* ─── Tabel Log ──────────────────────────────────── */}
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Pelaku</th>
                <th>Aksi</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <div className="empty-state">
                      <ScrollText size={40} aria-hidden="true" />
                      <h3>Tidak ada log yang cocok</h3>
                      <p>Coba ubah filter atau reset penyaring.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((l) => {
                  const user = state.users.find((u) => u.id === l.userId);
                  const warna = aksiTone[l.aksi] || 'var(--tinta-redup)';
                  return (
                    <tr key={l.id}>
                      <td style={{ whiteSpace: 'nowrap', fontSize: 12, color: 'var(--tinta-redup)' }}>
                        {new Date(l.waktu).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        <br />
                        {new Date(l.waktu).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: '50%',
                            background: 'var(--pinus-tint)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            color: 'var(--pinus)', fontSize: 10, fontWeight: 700, flexShrink: 0,
                          }}>
                            {user?.nama.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 500 }}>{user?.nama || 'Sistem'}</div>
                            <div style={{ fontSize: 11, color: 'var(--tinta-redup)' }}>{user?.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center',
                          padding: '2px 10px', borderRadius: 100,
                          background: `${warna}18`, color: warna,
                          fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                        }}>
                          {l.aksi}
                        </span>
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--tinta-redup)' }}>{l.detail}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
