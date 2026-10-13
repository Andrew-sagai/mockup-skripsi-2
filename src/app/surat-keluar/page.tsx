'use client';
import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useStore } from '@/lib/store';
import { SIFAT_SURAT_LABELS, STATUS_SURAT_KELUAR_LABELS } from '@/lib/types';
import { ChipStatus, BadgeSifat } from '@/components/ui';
import { Search, Send, Info, RotateCcw } from 'lucide-react';

type Tab = 'siap_diproses' | 'terkirim' | 'semua';

const STATUS_STEPS = ['draf', 'menunggu_paraf', 'menunggu_ttd', 'ditandatangani', 'nomor_diterbitkan', 'terkirim'];

function MiniStepper({ status }: { status: string }) {
  const cur = STATUS_STEPS.indexOf(status === 'perlu_revisi' ? 'menunggu_paraf' : status);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {STATUS_STEPS.map((s, i) => (
        <React.Fragment key={s}>
          <div style={{
            width: 9, height: 9, borderRadius: '50%',
            background: i < cur ? 'var(--pinus)' : i === cur ? 'var(--menunggu)' : 'var(--garis)',
            flexShrink: 0,
          }} title={STATUS_SURAT_KELUAR_LABELS[s as keyof typeof STATUS_SURAT_KELUAR_LABELS]} />
          {i < STATUS_STEPS.length - 1 && (
            <div style={{ width: 10, height: 2, background: i < cur ? 'var(--pinus)' : 'var(--garis)', borderRadius: 1 }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function SuratKeluarPage() {
  const { state, getSuratKeluarByRole } = useStore();
  const user = state.currentUser;

  const [tab, setTab]             = useState<Tab>('siap_diproses');
  const [search, setSearch]       = useState('');
  const [filterStatus, setFilter] = useState('all');

  const isPetugas = user?.role === 'petugas_surat' || user?.role === 'admin';

  const all = useMemo(() =>
    getSuratKeluarByRole().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [state.suratKeluar, state.currentUser]
  );

  const tabList = useMemo(() => {
    if (tab === 'siap_diproses') return all.filter((s) => s.status === 'ditandatangani' || s.status === 'nomor_diterbitkan');
    if (tab === 'terkirim')      return all.filter((s) => s.status === 'terkirim');
    return all;
  }, [all, tab]);

  const filtered = useMemo(() => tabList.filter((s) => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.perihal.toLowerCase().includes(q) || s.tujuan.toLowerCase().includes(q) || (s.nomorSurat || '').toLowerCase().includes(q);
    const matchStatus = filterStatus === 'all' || s.status === filterStatus;
    return matchSearch && matchStatus;
  }), [tabList, search, filterStatus]);

  const countTab = (t: Tab) => {
    if (t === 'siap_diproses') return all.filter((s) => s.status === 'ditandatangani' || s.status === 'nomor_diterbitkan').length;
    if (t === 'terkirim')      return all.filter((s) => s.status === 'terkirim').length;
    return all.length;
  };

  return (
    <DashboardLayout>
      <div className="animate-fadeIn">
        <div className="page-header">
          <div className="page-header-left">
            <h1>Surat Keluar</h1>
            <p>Pemrosesan dan pengiriman surat keluar dinas</p>
          </div>
        </div>

        {/* Info AT-05: Petugas tidak menyusun konsep */}
        {isPetugas && (
          <div className="admin-info-box" style={{ marginBottom: 20 }} id="info-at05">
            <Info size={15} aria-hidden="true" />
            <span>
              Konsep surat keluar disusun oleh <strong>Kepala Bidang</strong> masing-masing, lalu diparaf Sekretaris dan ditandatangani Kepala Dinas sebelum sampai ke Petugas untuk penomoran dan pengiriman.
            </span>
          </div>
        )}

        {/* Tab */}
        <div className="tabs" style={{ marginBottom: 16 }}>
          {(['siap_diproses', 'terkirim', 'semua'] as Tab[]).map((t) => {
            const labels: Record<Tab, string> = { siap_diproses: 'Siap Diproses', terkirim: 'Terkirim', semua: 'Semua' };
            return (
              <button
                key={t}
                id={`tab-sk-${t}`}
                className={`tab ${tab === t ? 'active' : ''}`}
                onClick={() => { setTab(t); setFilter('all'); setSearch(''); }}
              >
                {labels[t]}
                <span className="tab-badge">{countTab(t)}</span>
              </button>
            );
          })}
        </div>

        {/* Filter */}
        <div className="filter-bar" style={{ marginBottom: 12 }}>
          <div className="search-input-wrapper" style={{ flex: '1 1 220px' }}>
            <Search size={16} aria-hidden="true" />
            <input
              id="search-surat-keluar"
              className="search-input"
              placeholder="Cari perihal, tujuan, atau nomor surat…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {tab === 'semua' && (
            <select id="filter-status-sk" className="filter-select" value={filterStatus} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">Semua Status</option>
              {Object.entries(STATUS_SURAT_KELUAR_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          )}
          {(search || filterStatus !== 'all') && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setFilter('all'); }}>
              <RotateCcw size={13} aria-hidden="true" /> Reset
            </button>
          )}
        </div>

        <div style={{ fontSize: 12, color: 'var(--tinta-redup)', marginBottom: 8 }}>
          {filtered.length} dari {tabList.length} surat
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nomor Surat</th>
                <th>Tanggal</th>
                <th>Tujuan</th>
                <th>Perihal</th>
                <th>Sifat</th>
                <th>Tahapan</th>
                <th>Status</th>
                <th>Bukti Terima</th>
                <th style={{ textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <div className="empty-state">
                      <Send size={40} aria-hidden="true" />
                      <h3>Tidak ada surat keluar</h3>
                      <p>{tab === 'siap_diproses' ? 'Belum ada surat yang siap diproses.' : 'Coba ubah filter atau tab.'}</p>
                    </div>
                  </td>
                </tr>
              ) : filtered.map((s) => {
                const hasBukti = !!(s as any).buktiTerimaNama;
                return (
                  <tr key={s.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {s.nomorSurat
                        ? <span style={{ color: 'var(--pinus)', fontWeight: 600 }}>{s.nomorSurat}</span>
                        : <span style={{ color: 'var(--tinta-redup)' }}>— Belum terbit —</span>}
                    </td>
                    <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                      {s.tanggalKirim
                        ? new Date(s.tanggalKirim).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                        : <span style={{ color: 'var(--tinta-redup)' }}>—</span>}
                    </td>
                    <td style={{ fontSize: 13 }}>{s.tujuan}</td>
                    <td style={{ maxWidth: 240 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500, fontSize: 13 }}>{s.perihal}</div>
                    </td>
                    <td><BadgeSifat sifat={(s as any).sifat || 'biasa'} /></td>
                    <td><MiniStepper status={s.status} /></td>
                    <td><ChipStatus jenis="suratKeluar" status={s.status} compact /></td>
                    <td>
                      {s.status === 'terkirim'
                        ? hasBukti
                          ? <span className="chip chip-sukses" style={{ fontSize: 11 }}>✓ Ada</span>
                          : <Link href={`/surat-keluar/${s.id}/bukti-terima`} className="btn btn-sm btn-ghost" style={{ fontSize: 11 }}>Isi</Link>
                        : <span style={{ color: 'var(--tinta-redup)', fontSize: 12 }}>—</span>
                      }
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link href={`/surat-keluar/${s.id}`} className="btn btn-sm btn-ghost" style={{ fontWeight: 600 }}>Buka</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
