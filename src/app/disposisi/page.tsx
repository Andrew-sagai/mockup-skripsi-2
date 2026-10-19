'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useStore } from '@/lib/store';
import { JENIS_INSTRUKSI_LABELS } from '@/lib/types';
import { Search, FileCheck, AlertTriangle } from 'lucide-react';
import { ChipStatus, PenandaBatasWaktu } from '@/components/ui';

export default function DisposisiPage() {
  const { state, getUser, getScopedDisposisi } = useStore();
  const user = state.currentUser;
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const isKadis = user?.role === 'kepala_dinas';
  const isKabid = user?.role === 'kepala_bidang';

  let disposisiList = getScopedDisposisi()
    .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  if (user?.role === 'petugas_surat' || user?.role === 'admin') {
    const pendingSm = state.suratMasuk.filter(sm => sm.status === 'diagenda');
    const dummyDisposisi = pendingSm.map(sm => ({
      id: `dummy-${sm.id}`,
      suratMasukId: sm.id,
      instruksi: 'lainnya',
      bidangTujuan: [],
      tenggat: '',
      status: 'diagenda',
      createdAt: sm.createdAt,
      updatedAt: sm.updatedAt,
    }));
    disposisiList = [...dummyDisposisi, ...disposisiList] as any;
  }

  const filtered = disposisiList.filter(d => {
    const sm = state.suratMasuk.find(s => s.id === d.suratMasukId);
    const matchSearch = search === '' ||
      sm?.perihal.toLowerCase().includes(search.toLowerCase()) ||
      sm?.asalSurat.toLowerCase().includes(search.toLowerCase()) ||
      sm?.nomorAgenda.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || d.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const statusLabels: Record<string, string> = {
    diagenda: 'Belum Disposisi',
    menunggu_disposisi: 'Menunggu Disposisi', didisposisikan: 'Didisposisikan',
    diterima_bidang: 'Diterima Bidang', diteruskan_ke_staf: 'Diteruskan ke Staf',
    menunggu_pemeriksaan: 'Menunggu Pemeriksaan', selesai: 'Selesai', dikembalikan: 'Dikembalikan'
  };

  // Hitung ringkasan untuk Kadis
  const butuhAksiKadis = disposisiList.filter(d => d.status === 'menunggu_disposisi').length;
  const overdueCount = disposisiList.filter(d =>
    d.status !== 'selesai' && d.tenggat && new Date(d.tenggat) < new Date()
  ).length;

  return (
    <DashboardLayout>
      <div className="animate-fadeIn">
        <div className="page-header">
          <div className="page-header-left">
            <h1>Disposisi</h1>
            <p>
              {isKadis
                ? 'Rekapitulasi seluruh disposisi surat masuk (Proposal 14d)'
                : isKabid
                  ? 'Disposisi yang ditujukan ke bidang Anda'
                  : 'Daftar disposisi surat masuk beserta status tindak lanjut'}
            </p>
          </div>
        </div>

        {/* Ringkasan cepat untuk Kadis */}
        {isKadis && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            {butuhAksiKadis > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: '#fffbeb', border: '1px solid #fcd34d',
                borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 600
              }}>
                <AlertTriangle size={16} style={{ color: '#d97706' }} />
                <span style={{ color: '#92400e' }}>{butuhAksiKadis} menunggu disposisi Anda</span>
                <button className="btn btn-sm btn-warning" onClick={() => setFilterStatus('menunggu_disposisi')}>
                  Tampilkan
                </button>
              </div>
            )}
            {overdueCount > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: '#fef2f2', border: '1px solid #fca5a5',
                borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 600
              }}>
                <AlertTriangle size={16} style={{ color: '#dc2626' }} />
                <span style={{ color: '#991b1b' }}>{overdueCount} melewati tenggat</span>
              </div>
            )}
            {butuhAksiKadis === 0 && overdueCount === 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: '#f0fdf4', border: '1px solid #86efac',
                borderRadius: 8, padding: '10px 16px', fontSize: 13, color: '#15803d'
              }}>
                ✅ Tidak ada disposisi yang menunggu aksi Anda
              </div>
            )}
          </div>
        )}

        {/* Ringkasan cepat untuk Kabid */}
        {isKabid && (() => {
          const belumDiterima = disposisiList.filter(d =>
            d.bidangTujuan.find(b => b.unitKerjaId === user?.unitKerjaId)?.statusTerima === 'belum'
          ).length;
          return belumDiterima > 0 ? (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#fffbeb', border: '1px solid #fcd34d',
              borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 600, marginBottom: 16
            }}>
              <AlertTriangle size={16} style={{ color: '#d97706' }} />
              <span style={{ color: '#92400e' }}>{belumDiterima} disposisi menunggu paraf terima Anda</span>
              <button className="btn btn-sm btn-warning" onClick={() => setFilterStatus('didisposisikan')}>
                Tampilkan
              </button>
            </div>
          ) : null;
        })()}

        <div className="filter-bar">
          <div className="search-input-wrapper">
            <Search size={18} />
            <input className="search-input" placeholder="Cari perihal, asal surat, atau nomor agenda..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">Semua Status</option>
            {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        <div className="table-container">
          <table className="data-table compact-table">
            <thead>
              <tr>
                <th>Surat</th>
                <th>Instruksi</th>
                <th>Bidang Tujuan</th>
                <th>Batas Waktu</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6}>
                  <div className="empty-state">
                    <FileCheck size={48} />
                    <h3>Tidak ada disposisi</h3>
                    <p>Belum ada disposisi yang sesuai filter</p>
                  </div>
                </td></tr>
              ) : filtered.map(d => {
                const sm = state.suratMasuk.find(s => s.id === d.suratMasukId);
                const bidangNames = (d.bidangTujuan || []).map((b: any) => {
                  const uk = state.unitKerja.find(u => u.id === b.unitKerjaId);
                  return uk ? (uk.nama.replace('Bidang ', '') + (!uk.aktif ? ' (nonaktif)' : '')) : '';
                }).filter(Boolean).join(', ');
                const isOverdue = d.status !== 'selesai' && (d.status as string) !== 'diagenda' && d.tenggat && new Date(d.tenggat) < new Date();
                // Badge "Butuh Aksi" hanya muncul untuk role yang relevan
                const needsActionKadis = isKadis && d.status === 'menunggu_disposisi';
                const needsActionKabid = isKabid && (d.bidangTujuan || []).find(
                  (b: any) => b.unitKerjaId === user?.unitKerjaId
                )?.statusTerima === 'belum';

                return (
                  <tr key={d.id} style={{ background: isOverdue ? '#fff7f7' : undefined }}>
                    <td>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{sm?.perihal.slice(0, 50)}...</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {sm?.asalSurat} • {sm?.nomorAgenda}
                      </div>
                      {(needsActionKadis || needsActionKabid) && (
                        <span className="badge badge-warning" style={{ fontSize: 10, marginTop: 3 }}>
                          Butuh Aksi
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: 13 }}>{JENIS_INSTRUKSI_LABELS[d.instruksi]}</td>
                    <td style={{ fontSize: 13 }}>{bidangNames || '—'}</td>
                    <td style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
                      {d.tenggat ? <PenandaBatasWaktu tanggal={d.tenggat} sekarang={new Date()} /> : <span style={{ color: 'var(--tinta-redup)' }}>—</span>}
                    </td>
                    <td>
                      {(d.status as string) === 'diagenda' ? (
                         <span className="badge badge-gray">Belum Disposisi</span>
                      ) : (
                         <ChipStatus jenis="disposisi" status={d.status} compact />
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {(d.status as string) === 'diagenda' ? (
                        <Link href={`/disposisi/buat/${d.suratMasukId}`} style={{ color: 'var(--primary-600)', fontWeight: 600, fontSize: 13 }}>
                          Buat Kartu
                        </Link>
                      ) : (
                        <Link href={`/disposisi/${d.id}`} style={{ color: needsActionKadis || needsActionKabid ? 'var(--primary-600)' : 'var(--primary-500)', fontWeight: needsActionKadis || needsActionKabid ? 700 : 600, fontSize: 13 }}>
                          {needsActionKadis ? 'Disposisikan' : needsActionKabid ? 'Terima' : 'Buka'}
                        </Link>
                      )}
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
