'use client';
import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { SIFAT_SURAT_LABELS, JENIS_INSTRUKSI_LABELS } from '@/lib/types';
import {
  FileCheck, Shield, AlertCircle, Search, RotateCcw,
  AlertTriangle, Clock, ClipboardCheck, Forward
} from 'lucide-react';
import { BadgeSifat, ChipStatus, PenandaBatasWaktu } from '@/components/ui';

const TABS = [
  { value: 'menunggu_pemeriksaan', label: 'Menunggu Pemeriksaan' },
  { value: 'sedang_dikerjakan', label: 'Sedang Dikerjakan' },
  { value: 'perlu_perbaikan', label: 'Perlu Perbaikan' },
  { value: 'selesai', label: 'Selesai' },
  { value: 'semua', label: 'Semua' },
];

export default function TindakLanjutPage() {
  const { state, getUser } = useStore();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('menunggu_pemeriksaan');
  const [search, setSearch] = useState('');
  const [filterSifat, setFilterSifat] = useState('all');

  const user = state.currentUser;
  const now = useMemo(() => new Date(), []);
  const unitKerja = useMemo(
    () => state.unitKerja.find(u => u.id === user?.unitKerjaId),
    [state.unitKerja, user?.unitKerjaId]
  );

  // 1. Kumpulkan seluruh data disposisi bidang ini yang sudah diterima
  const allBidangItems = useMemo(() => {
    if (!user || user.role !== 'kepala_bidang') return [];

    const myDisposisi = state.disposisi.filter(d =>
      d.bidangTujuan.some(b => b.unitKerjaId === user.unitKerjaId)
    );

    type ItemType = {
      d: typeof state.disposisi[0];
      sm: typeof state.suratMasuk[0] | undefined;
      myBidang: typeof state.disposisi[0]['bidangTujuan'][0] | undefined;
      derivedStatus: string;
      pelaksana: string;
    };

    const list: ItemType[] = [];

    for (const d of myDisposisi) {
      const sm = state.suratMasuk.find(s => s.id === d.suratMasukId);
      const myBidang = d.bidangTujuan.find(b => b.unitKerjaId === user.unitKerjaId);

      // Hanya tampilkan jika sudah diparaf terima oleh bidang
      if (myBidang?.statusTerima !== 'diterima') continue;

      let derivedStatus = 'sedang_dikerjakan';
      let pelaksana = 'Belum Ditugaskan';

      const statusItem = d.statusPerBidang?.[user.unitKerjaId!];
      const penugasans = state.penugasan.filter(p => p.disposisiId === d.id);

      if (penugasans.length > 0) {
        const tls = state.tindakLanjut.filter(tl => tl.disposisiId === d.id);
        const adaMenunggu = tls.some(tl => tl.status === 'dilaporkan');

        if (adaMenunggu || statusItem?.status === 'menunggu_pemeriksaan') {
          derivedStatus = 'menunggu_pemeriksaan';
        } else if (penugasans.some(p => p.status === 'dikembalikan' || p.status === 'perlu_perbaikan')) {
          derivedStatus = 'perlu_perbaikan';
        } else if (penugasans.every(p => p.status === 'selesai') || statusItem?.status === 'selesai') {
          derivedStatus = 'selesai';
        } else {
          derivedStatus = 'sedang_dikerjakan';
        }

        pelaksana = penugasans
          .map(p => getUser(p.stafId)?.nama)
          .filter(Boolean)
          .join(', ');
      } else if (
        myBidang?.statusProses === 'ditindak_langsung' ||
        statusItem?.status === 'ditindak_langsung' ||
        statusItem?.status === 'selesai'
      ) {
        derivedStatus = 'selesai';
        pelaksana = `${user.nama} (Kepala Bidang)`;
      } else {
        derivedStatus = 'sedang_dikerjakan';
        pelaksana = 'Belum Ditugaskan';
      }

      list.push({ d, sm, myBidang, derivedStatus, pelaksana });
    }

    return list;
  }, [state.disposisi, state.suratMasuk, state.penugasan, state.tindakLanjut, user?.unitKerjaId, user?.role, user?.nama, getUser]);

  // 2. Hitung jumlah item per tab (sebelum filter teks & sifat)
  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = {
      menunggu_pemeriksaan: 0,
      sedang_dikerjakan: 0,
      perlu_perbaikan: 0,
      selesai: 0,
      semua: allBidangItems.length,
    };
    for (const item of allBidangItems) {
      if (counts[item.derivedStatus] !== undefined) {
        counts[item.derivedStatus]++;
      }
    }
    return counts;
  }, [allBidangItems]);

  // Hitung jumlah yang melewati batas waktu
  const countOverdue = useMemo(() => {
    return allBidangItems.filter(it => {
      if (it.derivedStatus === 'selesai') return false;
      const targetDate = it.d.tenggat || it.sm?.batasWaktuSurat;
      return targetDate && new Date(targetDate) < now;
    }).length;
  }, [allBidangItems, now]);

  // 3. Terapkan filter pencarian, sifat surat, dan tab aktif
  const filteredData = useMemo(() => {
    let result = [...allBidangItems];

    // Filter tab
    if (activeTab !== 'semua') {
      result = result.filter(it => it.derivedStatus === activeTab);
    }

    // Filter sifat surat
    if (filterSifat !== 'all') {
      result = result.filter(it => it.sm?.sifat === filterSifat);
    }

    // Filter pencarian teks
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(it =>
        it.sm?.perihal.toLowerCase().includes(q) ||
        it.sm?.asalSurat.toLowerCase().includes(q) ||
        it.sm?.nomorAgenda.toLowerCase().includes(q) ||
        it.pelaksana.toLowerCase().includes(q)
      );
    }

    // Urutkan: prioritas segera/penting di atas, lalu tenggat terdekat
    result.sort((a, b) => {
      const pA = (a.sm?.sifat === 'segera' || a.sm?.sifat === 'penting') ? 1 : 0;
      const pB = (b.sm?.sifat === 'segera' || b.sm?.sifat === 'penting') ? 1 : 0;
      if (pA !== pB) return pB - pA;

      const tA = (a.d.tenggat || a.sm?.batasWaktuSurat)
        ? new Date(a.d.tenggat || a.sm!.batasWaktuSurat!).getTime()
        : 9999999999999;
      const tB = (b.d.tenggat || b.sm?.batasWaktuSurat)
        ? new Date(b.d.tenggat || b.sm!.batasWaktuSurat!).getTime()
        : 9999999999999;
      return tA - tB;
    });

    return result;
  }, [allBidangItems, activeTab, filterSifat, search]);

  const hasFilter = search.trim() !== '' || filterSifat !== 'all';
  const resetFilter = () => {
    setSearch('');
    setFilterSifat('all');
  };

  // Batasan Akses Peran
  if (!user || user.role !== 'kepala_bidang') {
    return (
      <DashboardLayout>
        <div className="empty-state" style={{ padding: '60px 24px' }}>
          <Shield size={48} style={{ color: 'var(--rahasia)', marginBottom: 12 }} />
          <h3>Akses Ditolak</h3>
          <p style={{ color: 'var(--tinta-redup)', marginBottom: 16 }}>
            Modul Tindak Lanjut dikhususkan bagi Kepala Bidang untuk memantau disposisi dan memeriksa laporan staf.
          </p>
          <button className="btn btn-primary" onClick={() => router.push('/dashboard')}>
            Kembali ke Dashboard
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="animate-fadeIn">
        {/* Header Halaman Konsisten */}
        <div className="page-header">
          <div className="page-header-left">
            <h1>Tindak Lanjut</h1>
            <p>
              {unitKerja?.nama || 'Bidang'} — Pantau pelaksanaan tugas dan periksa laporan hasil tindak lanjut
            </p>
          </div>
        </div>

        {/* Banner Alert: Menunggu Pemeriksaan */}
        {tabCounts.menunggu_pemeriksaan > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: 'var(--amber-light, #fffbeb)',
            border: '1px solid var(--amber-border, #fcd34d)',
            borderRadius: 8,
            padding: '12px 18px',
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 20
          }}>
            <AlertTriangle size={18} style={{ color: '#d97706', flexShrink: 0 }} aria-hidden="true" />
            <div style={{ flex: 1, color: '#92400e' }}>
              Terdapat <strong>{tabCounts.menunggu_pemeriksaan} laporan tindak lanjut</strong> dari staf yang menunggu pemeriksaan dan persetujuan Anda.
            </div>
            {activeTab !== 'menunggu_pemeriksaan' && (
              <button
                className="btn btn-sm btn-warning"
                onClick={() => setActiveTab('menunggu_pemeriksaan')}
              >
                Periksa Sekarang
              </button>
            )}
          </div>
        )}

        {/* Banner Peringatan: Melewati Batas Waktu */}
        {countOverdue > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: '#fef2f2',
            border: '1px solid #fca5a5',
            borderRadius: 8,
            padding: '12px 18px',
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 20
          }}>
            <Clock size={18} style={{ color: '#dc2626', flexShrink: 0 }} aria-hidden="true" />
            <span style={{ color: '#991b1b' }}>
              {countOverdue} tindak lanjut di bidang Anda telah melewati batas waktu penyelesaian.
            </span>
          </div>
        )}

        {/* Tab Navigasi Standar Desain */}
        <div className="tabs" style={{ marginBottom: 16 }}>
          {TABS.map(t => {
            const count = tabCounts[t.value] || 0;
            return (
              <button
                key={t.value}
                id={`tab-tl-${t.value}`}
                className={`tab ${activeTab === t.value ? 'active' : ''}`}
                onClick={() => setActiveTab(t.value)}
              >
                {t.label}
                <span className="tab-badge">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Filter Bar Konsisten */}
        <div className="filter-bar" style={{ marginBottom: 16 }}>
          <div className="search-input-wrapper" style={{ flex: '1 1 240px' }}>
            <Search size={16} aria-hidden="true" />
            <input
              id="search-tindak-lanjut"
              className="search-input"
              placeholder="Cari perihal, nomor agenda, asal surat, atau pelaksana…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <select
            id="filter-sifat-tl"
            className="filter-select"
            value={filterSifat}
            onChange={e => setFilterSifat(e.target.value)}
          >
            <option value="all">Semua Sifat Surat</option>
            {Object.entries(SIFAT_SURAT_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          {hasFilter && (
            <button
              id="btn-reset-filter-tl"
              className="btn btn-ghost btn-sm"
              onClick={resetFilter}
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <RotateCcw size={13} aria-hidden="true" /> Reset
            </button>
          )}
        </div>

        {/* Ringkasan Jumlah Hasil */}
        <div style={{ fontSize: 12, color: 'var(--tinta-redup)', marginBottom: 10 }}>
          Menampilkan {filteredData.length} tindak lanjut
        </div>

        {/* Tabel Data Standar */}
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Surat Masuk</th>
                <th>Instruksi Disposisi</th>
                <th>Pelaksana</th>
                <th>Batas Waktu</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state" style={{ padding: '48px 16px' }}>
                      <FileCheck size={48} aria-hidden="true" />
                      <h3>Tidak Ada Data Tindak Lanjut</h3>
                      <p>
                        {hasFilter || activeTab !== 'semua'
                          ? 'Tidak ada tindak lanjut yang cocok dengan filter atau kata kunci saat ini.'
                          : 'Belum ada surat masuk yang diparaf terima untuk ditindaklanjuti.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredData.map(it => {
                  const sm = it.sm;
                  const deadline = it.d.tenggat || sm?.batasWaktuSurat;
                  const isOverdue = it.derivedStatus !== 'selesai' && deadline && new Date(deadline) < now;

                  return (
                    <tr key={it.d.id} style={{ background: isOverdue ? '#fff7f7' : undefined }}>
                      {/* Kolom Surat */}
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', marginBottom: 3 }}>
                          {sm?.perihal || '—'}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {sm?.asalSurat} • {sm?.nomorAgenda}
                        </div>
                        {sm?.sifat && (
                          <div style={{ marginTop: 5 }}>
                            <BadgeSifat sifat={sm.sifat} />
                          </div>
                        )}
                      </td>

                      {/* Kolom Instruksi Disposisi */}
                      <td>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                          {JENIS_INSTRUKSI_LABELS[it.d.instruksi] || 'Proses Lebih Lanjut'}
                        </div>
                        {it.d.catatanKepala && (
                          <div style={{ fontSize: 12, color: 'var(--tinta-redup)', fontStyle: 'italic', marginTop: 3 }}>
                            "{it.d.catatanKepala.slice(0, 55)}{it.d.catatanKepala.length > 55 ? '…' : ''}"
                          </div>
                        )}
                      </td>

                      {/* Kolom Pelaksana */}
                      <td>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                          {it.pelaksana}
                        </div>
                        {it.derivedStatus === 'sedang_dikerjakan' && it.pelaksana === 'Belum Ditugaskan' && (
                          <span style={{ fontSize: 11, color: 'var(--segera, #d97706)', fontWeight: 600, display: 'block', marginTop: 2 }}>
                            Perlu diteruskan ke staf
                          </span>
                        )}
                      </td>

                      {/* Kolom Batas Waktu */}
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {deadline ? (
                          <PenandaBatasWaktu tanggal={deadline} sekarang={now} />
                        ) : (
                          <span style={{ fontSize: 13, color: 'var(--tinta-redup)' }}>—</span>
                        )}
                      </td>

                      {/* Kolom Status */}
                      <td>
                        <ChipStatus jenis="disposisi" status={it.derivedStatus} compact />
                      </td>

                      {/* Kolom Aksi */}
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {it.derivedStatus === 'menunggu_pemeriksaan' ? (
                          <Link
                            href={`/disposisi/${it.d.id}`}
                            className="btn btn-sm btn-primary"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 600 }}
                          >
                            <ClipboardCheck size={14} aria-hidden="true" /> Periksa Laporan
                          </Link>
                        ) : it.pelaksana === 'Belum Ditugaskan' ? (
                          <Link
                            href={`/disposisi/${it.d.id}`}
                            className="btn btn-sm btn-warning"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 600 }}
                          >
                            <Forward size={14} aria-hidden="true" /> Tindak Lanjuti
                          </Link>
                        ) : (
                          <Link
                            href={`/disposisi/${it.d.id}`}
                            className="btn btn-sm btn-ghost"
                            style={{ fontWeight: 500 }}
                          >
                            Lihat Detail
                          </Link>
                        )}
                      </td>
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

