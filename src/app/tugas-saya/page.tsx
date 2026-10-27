'use client';
import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { getBatasWaktuState } from '@/lib/batas-waktu';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { FileCheck, Shield, AlertCircle, FileText, Download } from 'lucide-react';
import { BadgeSifat, ChipStatus, PenandaBatasWaktu, ModalStandar, PdfViewerEmbedded } from '@/components/ui';
import { JENIS_INSTRUKSI_LABELS } from '@/lib/types';
import { urutkanTerbaru } from '@/lib/utils';

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
  const [previewSm, setPreviewSm] = useState<any>(null);

  const user = state.currentUser;

  const now = new Date();

  const myPenugasan = useMemo(() => {
    if (!user || user.role !== 'staf_pelaksana') return [];
    return state.penugasan.filter(p => p.stafId === user.id);
  }, [state.penugasan, user]);

  const filteredData = useMemo(() => {
    if (!user || user.role !== 'staf_pelaksana') return [];

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
      return urutkanTerbaru(mappedPenugasan, (p) => p.d?.createdAt).filter(p => p.derivedStatus === filterStatus);
    }
    return urutkanTerbaru(mappedPenugasan, (p) => p.d?.createdAt);
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
                      {p.catatanPenugasan && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>&quot;{p.catatanPenugasan}&quot;</div>}
                    </td>
                    <td>
                      {sm?.batasWaktuSurat ? (
                        <PenandaBatasWaktu tanggal={sm.batasWaktuSurat} sekarang={now} />
                      ) : (
                        <span style={{ fontSize: 13, color: 'var(--tinta-redup)' }}>—</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                        <ChipStatus jenis="disposisi" status={p.derivedStatus} compact />
                        {(() => {
                          const tls = state.tindakLanjut.filter(t => t.disposisiId === p.disposisiId);
                          if (tls.length > 1) {
                            return (
                              <span className="badge badge-info" style={{ fontSize: 10, fontWeight: 700 }}>
                                Revisi ke-{tls.length}
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {sm && (
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost"
                          onClick={() => setPreviewSm(sm)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginRight: 6 }}
                          title="Lihat Berkas Asli Surat Masuk"
                        >
                          <FileText size={14} style={{ color: 'var(--pinus, #2A7356)' }} aria-hidden="true" />
                          <span>Berkas</span>
                        </button>
                      )}
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

      {/* Modal Pratinjau Berkas PDF Surat Masuk untuk Staf Pelaksana */}
      {previewSm && (
        <ModalStandar
          open={!!previewSm}
          onClose={() => setPreviewSm(null)}
          judul={`Pratinjau Berkas Surat Masuk — Agenda: ${previewSm.nomorAgenda || '—'}`}
          size="lg"
          footerSecondary={
            <button className="btn btn-ghost" onClick={() => setPreviewSm(null)}>
              Tutup Pratinjau
            </button>
          }
          footerPrimary={
            <button
              className="btn btn-primary"
              onClick={() => {
                const link = document.createElement('a');
                link.href = previewSm.berkasUrl || '/docs/sample-surat-masuk.pdf';
                link.download = `Surat_Masuk_${(previewSm.nomorAgenda || 'berkas').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
            >
              <Download size={14} aria-hidden="true" /> Unduh Berkas Asli
            </button>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--latar, #F3F5F4)', padding: '10px 14px', borderRadius: 6, fontSize: 13 }}>
              <div>
                <strong>Asal Surat:</strong> {previewSm.asalSurat} | <strong>Nomor:</strong> {previewSm.nomorSuratAsal}
              </div>
              <span className={`chip ${previewSm.sifat === 'rahasia' ? 'chip-bahaya' : 'chip-info'}`} style={{ fontSize: 11, fontWeight: 600, textTransform: 'capitalize' }}>
                {previewSm.sifat}
              </span>
            </div>

            <PdfViewerEmbedded
              fileUrl={previewSm.berkasUrl || '/docs/sample-surat-masuk.pdf'}
              judul={`Surat Masuk — ${previewSm.nomorAgenda || 'Berkas Asli'}`}
              metadata={{
                nomor: previewSm.nomorAgenda,
                perihal: previewSm.perihal,
                asalSurat: previewSm.asalSurat,
                tanggal: previewSm.tanggalTerima ? new Date(previewSm.tanggalTerima).toLocaleDateString('id-ID') : undefined,
                sifat: previewSm.sifat,
                isiRingkas: `Surat masuk dari ${previewSm.asalSurat} perihal ${previewSm.perihal} yang menjadi dasar penugasan staf.`,
              }}
              height={520}
            />
          </div>
        </ModalStandar>
      )}
    </DashboardLayout>
  );
}
