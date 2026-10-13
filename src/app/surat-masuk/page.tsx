'use client';
import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useStore } from '@/lib/store';
import { SIFAT_SURAT_LABELS, STATUS_SURAT_MASUK_LABELS, SifatSurat, StatusSuratMasuk } from '@/lib/types';
import { hasPermission } from '@/lib/rbac';
import { ChipStatus, BadgeSifat, PenandaBatasWaktu } from '@/components/ui';
import { Search, Plus, MailOpen, RotateCcw, Filter } from 'lucide-react';

export default function SuratMasukPage() {
  const { state, getScopedSuratMasuk } = useStore();
  const user = state.currentUser;
  const canCreate = user && hasPermission(user.role, 'surat_masuk:create');

  const [search, setSearch]         = useState('');
  const [filterSifat, setFilterSifat]   = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDari, setFilterDari]     = useState('');
  const [filterSampai, setFilterSampai] = useState('');

  const now = useMemo(() => new Date(), []);

  const rawList = useMemo(() => getScopedSuratMasuk(), [state.suratMasuk, state.currentUser]);

  const filtered = useMemo(() => {
    return rawList.filter((s) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        s.perihal.toLowerCase().includes(q) ||
        s.asalSurat.toLowerCase().includes(q) ||
        s.nomorAgenda.toLowerCase().includes(q) ||
        s.nomorSuratAsal.toLowerCase().includes(q);
      const matchSifat  = filterSifat  === 'all' || s.sifat === filterSifat;
      const matchStatus = filterStatus === 'all' || s.status === filterStatus;
      const tglTerima   = new Date(s.tanggalTerima);
      const matchDari   = !filterDari   || tglTerima >= new Date(filterDari);
      const matchSampai = !filterSampai || tglTerima <= new Date(filterSampai + 'T23:59:59');
      return matchSearch && matchSifat && matchStatus && matchDari && matchSampai;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [rawList, search, filterSifat, filterStatus, filterDari, filterSampai]);

  const hasFilter = filterSifat !== 'all' || filterStatus !== 'all' || filterDari || filterSampai || search;
  const resetFilter = () => {
    setSearch(''); setFilterSifat('all'); setFilterStatus('all');
    setFilterDari(''); setFilterSampai('');
  };

  return (
    <DashboardLayout>
      <div className="animate-fadeIn">
        <div className="page-header">
          <div className="page-header-left">
            <h1>Surat Masuk</h1>
            <p>Daftar seluruh surat masuk yang telah diagendakan</p>
          </div>
          {canCreate && (
            <Link id="btn-catat-surat-baru" href="/surat-masuk/baru" className="btn btn-primary">
              <Plus size={16} aria-hidden="true" /> Catat Surat Baru
            </Link>
          )}
        </div>

        {/* Filter bar */}
        <div className="filter-bar" style={{ flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          <div className="search-input-wrapper" style={{ flex: '1 1 220px', minWidth: 180 }}>
            <Search size={16} aria-hidden="true" />
            <input
              id="search-surat-masuk"
              className="search-input"
              placeholder="Cari nomor agenda, asal, atau perihal…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            id="filter-sifat"
            className="filter-select"
            value={filterSifat}
            onChange={(e) => setFilterSifat(e.target.value)}
          >
            <option value="all">Semua Sifat</option>
            {Object.entries(SIFAT_SURAT_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          <select
            id="filter-status"
            className="filter-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">Semua Status</option>
            {Object.entries(STATUS_SURAT_MASUK_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--tinta-redup)', whiteSpace: 'nowrap' }}>
            <Filter size={13} aria-hidden="true" />
            Terima dari
            <input
              id="filter-dari"
              type="date"
              className="filter-select"
              style={{ paddingLeft: 8 }}
              value={filterDari}
              onChange={(e) => setFilterDari(e.target.value)}
            />
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--tinta-redup)', whiteSpace: 'nowrap' }}>
            s/d
            <input
              id="filter-sampai"
              type="date"
              className="filter-select"
              style={{ paddingLeft: 8 }}
              value={filterSampai}
              onChange={(e) => setFilterSampai(e.target.value)}
            />
          </label>

          {hasFilter && (
            <button id="btn-reset-filter-sm" className="btn btn-ghost btn-sm" onClick={resetFilter} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <RotateCcw size={13} aria-hidden="true" /> Reset
            </button>
          )}
        </div>

        <div style={{ fontSize: 12, color: 'var(--tinta-redup)', marginBottom: 8 }}>
          {filtered.length} dari {rawList.length} surat
        </div>

        {/* Tabel */}
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>No. Agenda</th>
                <th>Tgl. Surat</th>
                <th>Tgl. Terima</th>
                <th>Asal Surat</th>
                <th>Perihal</th>
                <th>Sifat</th>
                <th>Batas Waktu</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <div className="empty-state">
                      <MailOpen size={40} aria-hidden="true" />
                      <h3>Tidak ada surat ditemukan</h3>
                      <p>Coba ubah kata kunci atau filter.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id}>
                    {/* No. Agenda */}
                    <td style={{ whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: 12, color: 'var(--tinta-redup)' }}>
                      {s.nomorAgenda}
                    </td>

                    {/* Tgl. Surat */}
                    <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>
                      {s.tanggalSuratAsal
                        ? new Date(s.tanggalSuratAsal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                        : '—'}
                    </td>

                    {/* Tgl. Terima */}
                    <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>
                      {new Date(s.tanggalTerima).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>

                    {/* Asal Surat */}
                    <td>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{s.asalSurat}</div>
                      <div style={{ fontSize: 11, color: 'var(--tinta-redup)' }}>{s.nomorSuratAsal}</div>
                    </td>

                    {/* Perihal — surat rahasia tampil sebaris biasa */}
                    <td style={{ maxWidth: 260 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500, fontSize: 13 }}>
                        {s.perihal}
                      </div>
                    </td>

                    {/* Sifat */}
                    <td><BadgeSifat sifat={s.sifat} /></td>

                    {/* Batas Waktu — hanya baca */}
                    <td>
                      {(s as any).batasWaktu
                        ? <PenandaBatasWaktu tanggal={(s as any).batasWaktu} sekarang={now} />
                        : <span style={{ color: 'var(--tinta-redup)', fontSize: 12 }}>—</span>}
                    </td>

                    {/* Status */}
                    <td>
                      <ChipStatus jenis="suratMasuk" status={s.status} compact />
                    </td>

                    {/* Aksi */}
                    <td style={{ textAlign: 'right' }}>
                      <Link
                        href={`/surat-masuk/${s.id}`}
                        className="btn btn-sm btn-ghost"
                        style={{ fontWeight: 600 }}
                      >
                        Buka
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
