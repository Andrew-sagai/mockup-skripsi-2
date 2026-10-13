'use client';
import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { getBatasWaktuState } from '@/lib/batas-waktu';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { JENIS_INSTRUKSI_LABELS } from '@/lib/types';
import { FileCheck, Shield, AlertCircle } from 'lucide-react';
import { BadgeSifat, ChipStatus, PenandaBatasWaktu } from '@/components/ui';

const STATUS_OPTIONS = [
  { value: 'semua', label: 'Semua' },
  { value: 'diteruskan_staf', label: 'Diteruskan ke Staf' },
  { value: 'sedang_dikerjakan', label: 'Sedang Dikerjakan' },
  { value: 'perlu_perbaikan', label: 'Perlu Perbaikan' },
  { value: 'menunggu_pemeriksaan', label: 'Menunggu Pemeriksaan' },
  { value: 'selesai', label: 'Selesai' },
];

export default function TugasSayaPage() {
  const { state } = useStore();
  const router = useRouter();
  const [filterStatus, setFilterStatus] = useState('semua');

  const user = state.currentUser;

  const now = new Date();

  const myPenugasan = useMemo(() => {
    if (!user || user.role !== 'staf_pelaksana') return [];
    return state.penugasan.filter(p => p.stafId === user.id);
  }, [state.penugasan, user]);

  const filteredData = useMemo(() => {
    if (!user || user.role !== 'staf_pelaksana') return [];

    let result = myPenugasan.filter(p => 
      ['diteruskan_staf', 'dikerjakan', 'dikembalikan', 'selesai'].includes(p.status) || 
      p.status
    );

    // Map internal status for filtering
    const mappedPenugasan = myPenugasan.map(p => {
      const d = state.disposisi.find(disp => disp.id === p.disposisiId);
      let derivedStatus = 'diteruskan_staf';
      if (p.status === 'ditugaskan') derivedStatus = 'diteruskan_staf';
      else if (p.status === 'dikerjakan') derivedStatus = 'sedang_dikerjakan';
      else if (p.status === 'dikembalikan') derivedStatus = 'perlu_perbaikan';
      else if (p.status === 'selesai') derivedStatus = 'selesai';
      
      // Cek apakah menunggu pemeriksaan di tingkat disposisi/tindak lanjut
      const tl = state.tindakLanjut.find(t => t.penugasanStafId === p.id);
      if (tl && tl.status === 'dilaporkan') derivedStatus = 'menunggu_pemeriksaan';

      return { ...p, derivedStatus, d };
    }).filter(p => p.d); // must have valid disposisi

    if (filterStatus !== 'semua') {
      return mappedPenugasan.filter(p => p.derivedStatus === filterStatus);
    }
    return mappedPenugasan;
  }, [myPenugasan, filterStatus, state.disposisi, state.tindakLanjut, user]);

  // Access Control
  if (user?.role !== 'staf_pelaksana') {
    return (
      <DashboardLayout>
        <div className="empty-state">
          <Shield size={48} style={{ color: 'var(--danger)', marginBottom: 12 }} />
          <h3>Akses Ditolak</h3>
          <p>Halaman ini khusus untuk Staf Pelaksana.</p>
        </div>
      </DashboardLayout>
    );
  }

  // render
  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1>Tugas Saya</h1>
          <p className="subtitle">Tugas tindak lanjut yang ditugaskan kepada Anda.</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header" style={{ display: 'flex', gap: 12 }}>
          <select 
            className="form-control" 
            style={{ width: 220 }}
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Surat</th>
                <th>Instruksi</th>
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
                        {filterStatus === 'semua' ? 'Belum ada tugas untuk Anda.' : 'Tidak ada data yang sesuai filter.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : filteredData.map(p => {
                const sm = state.suratMasuk.find(s => s.id === p.d!.suratMasukId);
                const isPrioritas = sm?.sifat === 'segera' || sm?.sifat === 'penting';
                
                const batasState = getBatasWaktuState(sm?.batasWaktuSurat, p.derivedStatus, now);

                return (
                  <tr key={p.id}>
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
                      <div style={{ fontSize: 13 }}>{JENIS_INSTRUKSI_LABELS[p.d!.instruksi]}</div>
                      {p.catatanPenugasan && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>"{p.catatanPenugasan}"</div>}
                    </td>
                    <td>
                      {sm?.batasWaktuSurat ? (
                        <PenandaBatasWaktu tanggal={sm.batasWaktuSurat} sekarang={now} />
                      ) : (
                        <span style={{ fontSize: 13, color: 'var(--tinta-redup)' }}>—</span>
                      )}
                    </td>
                    <td>
                      <ChipStatus jenis="disposisi" status={p.derivedStatus} compact />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {['diteruskan_staf', 'sedang_dikerjakan', 'perlu_perbaikan'].includes(p.derivedStatus) ? (
                        <Link href={`/disposisi/${p.disposisiId}`} className="btn btn-sm btn-secondary">Kerjakan</Link>
                      ) : (
                        <Link href={`/disposisi/${p.disposisiId}`} className="btn btn-sm btn-ghost">Lihat</Link>
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
