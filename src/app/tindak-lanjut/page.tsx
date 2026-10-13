'use client';
import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { getBatasWaktuState } from '@/lib/batas-waktu';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { FileCheck, Shield, AlertCircle } from 'lucide-react';
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

  const user = state.currentUser;

  const now = new Date();

  // Data
  const filteredData = useMemo(() => {
    if (!user || user.role !== 'kepala_bidang') return [];

    // 1. Cari disposisi tujuan bidang ini
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

    let items: ItemType[] = myDisposisi.map(d => {
      const sm = state.suratMasuk.find(s => s.id === d.suratMasukId);
      const myBidang = d.bidangTujuan.find(b => b.unitKerjaId === user.unitKerjaId);
      
      // Hitung status di tingkat bidang (Kabid logic)
      let derivedStatus = 'sedang_dikerjakan'; // default 
      let pelaksana = 'Bidang (Langsung)';
      
      const statusItem = d.statusPerBidang?.[user.unitKerjaId!];
      if (statusItem?.status) {
        if (statusItem.status === 'selesai') derivedStatus = 'selesai';
        // wait, we need to handle other statuses based on penugasan / tindak_lanjut
      }

      // Check penugasan for this disposisi in this unit
      const penugasans = state.penugasan.filter(p => p.disposisiId === d.id);
      if (penugasans.length > 0) {
        // Find if any is menunggu_pemeriksaan
        const tls = state.tindakLanjut.filter(tl => tl.disposisiId === d.id);
        const adaMenunggu = tls.some(tl => tl.status === 'dilaporkan');
        if (adaMenunggu) {
          derivedStatus = 'menunggu_pemeriksaan';
        } else if (penugasans.some(p => p.status === 'dikembalikan')) {
          derivedStatus = 'perlu_perbaikan';
        } else if (penugasans.every(p => p.status === 'selesai')) {
          derivedStatus = 'selesai';
        } else {
          derivedStatus = 'sedang_dikerjakan';
        }
        
        pelaksana = penugasans.map(p => getUser(p.stafId)?.nama).filter(Boolean).join(', ');
      } else if (myBidang?.statusProses === 'ditindak_langsung') {
        derivedStatus = 'sedang_dikerjakan';
        pelaksana = user.nama;
      }
      
      return { d, sm, myBidang, derivedStatus, pelaksana };
    });

    // Filter by search
    if (search) {
      const s = search.toLowerCase();
      items = items.filter(it => 
        it.sm?.perihal.toLowerCase().includes(s) ||
        it.sm?.asalSurat.toLowerCase().includes(s) ||
        it.sm?.nomorAgenda.toLowerCase().includes(s)
      );
    }

    // Filter by tab
    if (activeTab !== 'semua') {
      items = items.filter(it => it.derivedStatus === activeTab);
    }
    
    // Status Diteruskan ke Staf juga dihitung Sedang Dikerjakan di filter
    // exclude yang belum diterima atau hanya menunggu
    items = items.filter(it => it.myBidang?.statusTerima === 'diterima');

    // Urutkan: sifat prioritas, lalu batas waktu terdekat
    items.sort((a, b) => {
      const pA = (a.sm?.sifat === 'segera' || a.sm?.sifat === 'penting') ? 1 : 0;
      const pB = (b.sm?.sifat === 'segera' || b.sm?.sifat === 'penting') ? 1 : 0;
      if (pA !== pB) return pB - pA;
      
      const tA = a.sm?.batasWaktuSurat ? new Date(a.sm.batasWaktuSurat).getTime() : 9999999999999;
      const tB = b.sm?.batasWaktuSurat ? new Date(b.sm.batasWaktuSurat).getTime() : 9999999999999;
      return tA - tB;
    });

    return items;
  }, [state.disposisi, state.suratMasuk, state.penugasan, state.tindakLanjut, user?.unitKerjaId, user?.nama, search, activeTab, getUser]);

  // Access Control
  if (user?.role !== 'kepala_bidang') {
    return (
      <DashboardLayout>
        <div className="empty-state">
          <Shield size={48} style={{ color: 'var(--danger)', marginBottom: 12 }} />
          <h3>Akses Ditolak</h3>
          <p>Halaman ini khusus untuk Kepala Bidang.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1>Tindak Lanjut</h1>
          <p className="subtitle">Pantau dan periksa hasil tindak lanjut di bidang Anda.</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div className="tabs" style={{ display: 'flex', gap: 16 }}>
            {TABS.map(t => (
              <button
                key={t.value}
                className={`btn-ghost ${activeTab === t.value ? 'active' : ''}`}
                style={{ padding: '8px 4px', borderBottom: activeTab === t.value ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === t.value ? 'var(--primary)' : 'inherit' }}
                onClick={() => setActiveTab(t.value)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <input 
            type="text" 
            className="form-control" 
            placeholder="Cari perihal, asal surat..."
            style={{ width: 250 }}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Surat</th>
                <th>Pelaksana</th>
                <th>Batas Waktu</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="empty-state" style={{ padding: '40px 0' }}>
                      <AlertCircle size={40} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
                      <p style={{ color: 'var(--text-muted)' }}>
                        {search || activeTab !== 'semua' ? 'Tidak ada data yang sesuai filter.' : 'Belum ada tindak lanjut di bidang Anda.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : filteredData.map(it => {
                const sm = it.sm;
                const batasState = getBatasWaktuState(sm?.batasWaktuSurat, it.derivedStatus, now);
                const statusLabel = TABS.find(t => t.value === it.derivedStatus)?.label || it.derivedStatus;

                return (
                  <tr key={it.d.id}>
                    <td>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{sm?.perihal}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sm?.asalSurat} • {sm?.nomorAgenda}</div>
                      {sm?.sifat && (
                        <div style={{ marginTop: 4 }}>
                          <BadgeSifat sifat={sm.sifat} />
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: 13 }}>{it.pelaksana}</div>
                    </td>
                    <td>
                      {sm?.batasWaktuSurat ? (
                        <PenandaBatasWaktu tanggal={sm.batasWaktuSurat} sekarang={now} />
                      ) : (
                        <span style={{ fontSize: 13, color: 'var(--tinta-redup)' }}>—</span>
                      )}
                    </td>
                    <td>
                      <ChipStatus jenis="disposisi" status={it.derivedStatus} compact />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {it.derivedStatus === 'menunggu_pemeriksaan' ? (
                        <Link href={`/disposisi/${it.d.id}`} className="btn btn-sm btn-secondary">Periksa</Link>
                      ) : (
                        <Link href={`/disposisi/${it.d.id}`} className="btn btn-sm btn-ghost">Lihat</Link>
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
