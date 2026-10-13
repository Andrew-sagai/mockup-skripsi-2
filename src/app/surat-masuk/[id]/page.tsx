'use client';
import React, { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useStore } from '@/lib/store';
import { useBusinessLogic } from '@/lib/api';
import { SIFAT_SURAT_LABELS, STATUS_SURAT_MASUK_LABELS } from '@/lib/types';
import { hasPermission } from '@/lib/rbac';
import { ArrowLeft, FileText, Calendar, Building, Tag, Shield, Clock, User } from 'lucide-react';

export default function SuratMasukDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { state, getKlasifikasi, getJenisSurat, getUser, getScopedSuratMasuk } = useStore();
  const { apiBuatDisposisi } = useBusinessLogic();
  const router = useRouter();
  const user = state.currentUser;
  const [errorMsg, setErrorMsg] = React.useState('');
  const [showPdfModal, setShowPdfModal] = React.useState(false);

  const handleDownload = () => {
    if (!surat) return;
    const content = `%PDF-1.4
% BERKAS DIGITAL SURAT MASUK DINAS PERTANIAN KABUPATEN MINAHASA SELATAN
% No. Agenda: ${surat.nomorAgenda}
% Asal Surat: ${surat.asalSurat}
% No. Surat Asal: ${surat.nomorSuratAsal}
% Perihal: ${surat.perihal}
% Sifat: ${surat.sifat}
% Tanggal Terima: ${surat.tanggalTerima}
`;
    const blob = new Blob([content], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Surat_Masuk_${surat.nomorAgenda.replace(/[\/\\]/g, '_')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Cari surat di state penuh (untuk lookup awal)
  const surat = state.suratMasuk.find((s) => s.id === id);

  // Periksa otorisasi: apakah surat ini ada dalam cakupan role pengguna?
  // Menggunakan getScopedSuratMasuk() agar konsisten dengan daftar di /surat-masuk.
  // Pesan error yang ditampilkan SAMA dengan kasus "tidak ada" — tidak bocorkan eksistensi.
  const isAuthorized = surat ? getScopedSuratMasuk().some(s => s.id === surat.id) : false;

  if (!surat || !isAuthorized) {
    return (
      <DashboardLayout>
        <div className="empty-state">
          <h3>Surat tidak ditemukan</h3>
          <Link href="/surat-masuk" className="btn btn-secondary" style={{ marginTop: 16 }}>Kembali</Link>
        </div>
      </DashboardLayout>
    );
  }

  const klasifikasi = getKlasifikasi(surat.klasifikasiId);
  const jenis = getJenisSurat(surat.jenisSuratId);
  const pencatat = getUser(surat.pencatatId);
  const riwayat = state.riwayat.filter(r => r.suratMasukId === surat.id).sort(
    (a, b) => new Date(b.waktu).getTime() - new Date(a.waktu).getTime()
  );
  const disposisi = state.disposisi.find(d => d.suratMasukId === surat.id);

  const isPetugasOrAdmin = user && (user.role === 'petugas_surat' || user.role === 'admin' || hasPermission(user.role, 'disposisi:create'));
  const canCreateDisposisi = isPetugasOrAdmin && surat.status === 'diagenda';
  const canGiveDisposisi = user && (user.role === 'kepala_dinas' || user.role === 'admin' || hasPermission(user.role, 'disposisi:give')) && surat.status === 'menunggu_disposisi';

  const handleCreateDisposisiCard = () => {
    try {
      setErrorMsg('');
      
      // Validasi kelengkapan data Tahap 1 sesuai Tabel 15 (Error Situation)
      if (!surat.asalSurat) throw new Error("Data surat belum lengkap: Asal Surat kosong.");
      if (!surat.nomorSuratAsal) throw new Error("Data surat belum lengkap: Nomor Surat Asal kosong.");
      if (!surat.tanggalSuratAsal) throw new Error("Data surat belum lengkap: Tanggal Surat Asal kosong.");
      if (!surat.perihal) throw new Error("Data surat belum lengkap: Perihal kosong.");
      
      router.push(`/disposisi/buat/${surat.id}`);
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const getSifatBadge = (sifat: string) => {
    const map: Record<string, string> = { biasa: 'badge-gray', pemberitahuan: 'badge-info', penting: 'badge-warning', segera: 'badge-danger', rahasia: 'badge-purple' };
    return map[sifat] || 'badge-gray';
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      diagenda: 'badge-info', menunggu_disposisi: 'badge-warning', didisposisikan: 'badge-primary',
      diterima_bidang: 'badge-primary', diteruskan_ke_staf: 'badge-info', menunggu_pemeriksaan: 'badge-warning', selesai: 'badge-success'
    };
    return map[status] || 'badge-gray';
  };

  return (
    <DashboardLayout>
      <div className="animate-fadeIn">
        <Link href="/surat-masuk" className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }}>
          <ArrowLeft size={16} /> Kembali ke Daftar
        </Link>

        <div className="detail-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
              <span className="badge badge-info" style={{ fontSize: 13 }}>{surat.nomorAgenda}</span>
              {jenis && <span className="badge badge-primary" style={{ fontSize: 13 }}>{jenis.nama}</span>}
              <span className={`badge ${getSifatBadge(surat.sifat)}`}>{SIFAT_SURAT_LABELS[surat.sifat]}</span>
              <span className={`badge ${getStatusBadge(surat.status)}`}>{STATUS_SURAT_MASUK_LABELS[surat.status]}</span>
            </div>
            <h1 className="detail-title">{surat.perihal}</h1>
            <div className="detail-meta">
              <span className="detail-meta-item"><Building size={14} /> {surat.asalSurat}</span>
              <span className="detail-meta-item"><Calendar size={14} /> Diterima: {new Date(surat.tanggalTerima).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
          </div>
          <div className="detail-actions">
            {canCreateDisposisi && (
              <button className="btn btn-primary" onClick={handleCreateDisposisiCard}>
                <FileText size={16} /> Buat Kartu Disposisi Digital
              </button>
            )}
            {isPetugasOrAdmin && surat.status !== 'diagenda' && disposisi && (
              <Link href={`/disposisi/${disposisi.id}`} className="btn btn-secondary">
                <FileText size={16} /> Lihat Kartu Disposisi
              </Link>
            )}
            {canGiveDisposisi && disposisi && (
              <Link href={`/disposisi/${disposisi.id}`} className="btn btn-primary">
                Beri Disposisi
              </Link>
            )}
          </div>
        </div>

        {errorMsg && (
          <div style={{ color: 'red', background: '#fee2e2', padding: '12px 16px', borderRadius: 8, marginBottom: 16 }}>
            {errorMsg}
          </div>
        )}

        <div className="two-col">
          {/* Detail Info */}
          <div className="card">
            <div className="card-header"><h2>Informasi Surat</h2></div>
            <div className="card-body">
              <div className="info-grid">
                <div className="info-item">
                  <div className="info-label">Jenis Surat</div>
                  <div className="info-value" style={{ fontWeight: 600, color: 'var(--primary-700)' }}>
                    {jenis?.nama || '—'} {jenis?.utama ? '★' : ''}
                  </div>
                </div>
                <div className="info-item">
                  <div className="info-label">Sifat Surat</div>
                  <div className="info-value">
                    <span className={`badge ${getSifatBadge(surat.sifat)}`}>{SIFAT_SURAT_LABELS[surat.sifat]}</span>
                  </div>
                </div>
                <div className="info-item">
                  <div className="info-label">Kode Klasifikasi Arsip</div>
                  <div className="info-value">
                    {klasifikasi ? (
                      <span><strong>{klasifikasi.kode}</strong> — {klasifikasi.nama}</span>
                    ) : '—'}
                  </div>
                </div>
                <div className="info-item">
                  <div className="info-label">Nomor Surat Asal</div>
                  <div className="info-value">{surat.nomorSuratAsal}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Tanggal Surat Asal</div>
                  <div className="info-value">{new Date(surat.tanggalSuratAsal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Dicatat Oleh</div>
                  <div className="info-value">{pencatat?.nama || '-'}</div>
                </div>
                <div className="info-item full-width">
                  <div className="info-label">Berkas Lampiran</div>
                  <div className="info-value" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileText size={16} style={{ color: 'var(--danger)' }} />
                    <span>Dokumen PDF</span>
                    <button 
                      className="btn btn-sm btn-secondary"
                      onClick={() => setShowPdfModal(true)}
                    >
                      Lihat Berkas
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="card">
            <div className="card-header"><h2>Riwayat Status</h2></div>
            <div className="card-body">
              {riwayat.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>Belum ada riwayat</div>
              ) : (
                <div className="timeline">
                  {riwayat.map((r, idx) => {
                    const pelaku = getUser(r.pelakuId);
                    return (
                      <div key={r.id} className={`timeline-item ${idx === 0 ? '' : 'completed'}`}>
                        <div className="timeline-dot" />
                        <div className="timeline-content">
                          <div className="timeline-header">
                            <span className="timeline-title">{r.status}</span>
                            <span className="timeline-time">
                              {new Date(r.waktu).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                              {' '}
                              {new Date(r.waktu).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="timeline-body">{r.catatan}</div>
                          <div className="timeline-actor">{pelaku?.nama}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Preview Berkas PDF Surat Masuk (Bab 4 Poin 9) */}
        {showPdfModal && (
          <div className="modal-overlay" onClick={() => setShowPdfModal(false)}>
            <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: 680 }}>
              <div className="modal-header">
                <h2>Pratinjau Berkas Lampiran Surat Masuk</h2>
                <button className="modal-close" onClick={() => setShowPdfModal(false)}>✕</button>
              </div>
              <div className="modal-body">
                <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, padding: 24, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                  <div style={{ textAlign: 'center', borderBottom: '2px solid #334155', paddingBottom: 16, marginBottom: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.05em', color: '#475569' }}>BERKAS NASKAH SURAT ASAL</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>{surat.asalSurat}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Nomor: {surat.nomorSuratAsal} | Tanggal: {new Date(surat.tanggalSuratAsal).toLocaleDateString('id-ID')}</div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '8px 16px', fontSize: 13, marginBottom: 20 }}>
                    <div style={{ fontWeight: 600, color: '#64748b' }}>Nomor Agenda:</div>
                    <div style={{ fontWeight: 700, fontFamily: 'monospace' }}>{surat.nomorAgenda}</div>

                    <div style={{ fontWeight: 600, color: '#64748b' }}>Perihal:</div>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{surat.perihal}</div>

                    <div style={{ fontWeight: 600, color: '#64748b' }}>Sifat Surat:</div>
                    <div>
                      <span className={`badge ${getSifatBadge(surat.sifat)}`}>{SIFAT_SURAT_LABELS[surat.sifat]}</span>
                    </div>

                    <div style={{ fontWeight: 600, color: '#64748b' }}>Tanggal Terima:</div>
                    <div>{new Date(surat.tanggalTerima).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                  </div>

                  <div style={{ background: '#ffffff', border: '1px dashed #cbd5e1', borderRadius: 6, padding: 20, textAlign: 'center', margin: '16px 0' }}>
                    <FileText size={44} style={{ color: '#dc2626', margin: '0 auto 8px auto', display: 'block' }} />
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>Dokumen PDF Terlampir</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                      Berkas digital asli yang diunggah oleh Petugas Surat saat pencatatan surat masuk.
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
                <button className="btn btn-secondary" onClick={() => setShowPdfModal(false)}>Tutup</button>
                <button className="btn btn-primary" onClick={handleDownload}>
                  Unduh Berkas PDF
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
