'use client';
import React, { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useStore } from '@/lib/store';
import { useBusinessLogic } from '@/lib/api';
import { SIFAT_SURAT_LABELS, STATUS_SURAT_MASUK_LABELS } from '@/lib/types';
import { hasPermission } from '@/lib/rbac';
import { ArrowLeft, FileText, Calendar, Building, Tag, Shield, Clock, User, Eye, Download, CheckCircle, Send } from 'lucide-react';
import { PdfViewerEmbedded, ModalStandar, KonsepSuratPreview, ChipStatus } from '@/components/ui';

export default function SuratMasukDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { state, getKlasifikasi, getJenisSurat, getUser, getScopedSuratMasuk } = useStore();
  const { apiBuatDisposisi } = useBusinessLogic();
  const router = useRouter();
  const user = state.currentUser;
  const [errorMsg, setErrorMsg] = React.useState('');
  const [showPdfModal, setShowPdfModal] = React.useState(false);
  const [previewReply, setPreviewReply] = React.useState<any>(null);

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

  const replies = surat
    ? state.suratKeluar.filter((sk) => sk.suratMasukAsalId === surat.id || sk.refSuratMasukId === surat.id)
    : [];

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
              {replies.length > 0 && (
                <span className="badge badge-success" style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                  <CheckCircle size={13} /> Sudah Dibalas ({replies.length}x)
                </span>
              )}
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
            {(isPetugasOrAdmin || user?.role === 'kepala_bidang') && surat.status !== 'diagenda' && (
              <Link
                href={`/surat-keluar/baru?smId=${surat.id}${disposisi ? `&disposisiId=${disposisi.id}` : ''}`}
                className="btn btn-ghost"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Send size={15} /> {replies.length > 0 ? `Buat Balasan Tambahan (${replies.length}x)` : 'Susun Surat Balasan'}
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
                    <span>Dokumen PDF Utama</span>
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

        {/* ─── Riwayat Surat Balasan (Tahap 4) ─── */}
        {replies.length > 0 && (
          <div className="card" style={{ marginTop: 24 }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, margin: 0 }}>
                <Send size={16} style={{ color: 'var(--pinus)' }} /> Riwayat Surat Balasan Terkirim / Dibuat ({replies.length})
              </h2>
              {(isPetugasOrAdmin || user?.role === 'kepala_bidang') && (
                <Link
                  href={`/surat-keluar/baru?smId=${surat.id}${disposisi ? `&disposisiId=${disposisi.id}` : ''}`}
                  className="btn btn-sm btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12 }}
                >
                  <Send size={13} /> Buat Balasan Tambahan
                </Link>
              )}
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>No.</th>
                      <th>Nomor Surat</th>
                      <th>Perihal</th>
                      <th>Tujuan</th>
                      <th>Tanggal</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {replies.map((sk, idx) => (
                      <tr key={sk.id}>
                        <td>{idx + 1}</td>
                        <td style={{ fontWeight: 600 }}>
                          {sk.nomorSurat || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>(Konsep belum terbit)</span>}
                        </td>
                        <td>{sk.perihal}</td>
                        <td>{sk.tujuan}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {new Date(sk.tanggalKirim || sk.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td>
                          <ChipStatus jenis="suratKeluar" status={sk.status} compact />
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button
                            type="button"
                            className="btn btn-sm btn-ghost"
                            onClick={() => setPreviewReply(sk)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginRight: 6 }}
                          >
                            <Eye size={13} /> Pratinjau
                          </button>
                          <Link href={`/surat-keluar/${sk.id}`} className="btn btn-sm btn-secondary">
                            Detail
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Modal Pratinjau Surat Balasan (Tahap 4 & Tahap 1) */}
        {previewReply && (
          <ModalStandar
            open={true}
            onClose={() => setPreviewReply(null)}
            judul={`Pratinjau Surat Keluar Balasan: ${previewReply.nomorSurat || previewReply.perihal}`}
            size="lg"
            footerSecondary={
              <button className="btn btn-ghost" onClick={() => setPreviewReply(null)}>
                Tutup Pratinjau
              </button>
            }
          >
            <div style={{ padding: '8px 0' }}>
              <KonsepSuratPreview
                surat={previewReply}
                jenisSurat={state.jenisSurat.find(j => j.id === previewReply.jenisSuratId)}
                klasifikasi={state.klasifikasi.find(k => k.id === previewReply.klasifikasiId)}
                penyusun={state.users.find(usr => usr.id === previewReply.penyusunId)}
                getUser={getUser}
              />
            </div>
          </ModalStandar>
        )}

        {/* Modal Preview Berkas PDF Surat Masuk */}
        <ModalStandar
          open={showPdfModal}
          onClose={() => setShowPdfModal(false)}
          judul={`Pratinjau Berkas Lampiran — Agenda: ${surat.nomorAgenda}`}
          size="lg"
          footerSecondary={
            <button className="btn btn-ghost" onClick={() => setShowPdfModal(false)}>
              Tutup Pratinjau
            </button>
          }
          footerPrimary={
            <button className="btn btn-primary" onClick={handleDownload}>
              <Download size={14} aria-hidden="true" /> Unduh Berkas Asli
            </button>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--latar, #F3F5F4)', padding: '10px 14px', borderRadius: 6, fontSize: 13 }}>
              <div>
                <strong>Asal Surat:</strong> {surat.asalSurat} | <strong>Nomor:</strong> {surat.nomorSuratAsal}
              </div>
              <span className={`chip ${surat.sifat === 'rahasia' ? 'chip-bahaya' : 'chip-info'}`} style={{ fontSize: 11, fontWeight: 600 }}>
                {SIFAT_SURAT_LABELS[surat.sifat]}
              </span>
            </div>

            <PdfViewerEmbedded
              fileUrl={surat.berkasUrl || '/docs/sample-surat-masuk.pdf'}
              judul={`Surat Masuk — ${surat.nomorAgenda}`}
              metadata={{
                nomor: surat.nomorAgenda,
                perihal: surat.perihal,
                asalSurat: surat.asalSurat,
                tanggal: new Date(surat.tanggalTerima).toLocaleDateString('id-ID'),
                sifat: surat.sifat,
                isiRingkas: `Surat dari ${surat.asalSurat} dengan nomor surat ${surat.nomorSuratAsal} tertanggal ${surat.tanggalSuratAsal}. Diterima di Dinas Pertanian pada ${new Date(surat.tanggalTerima).toLocaleDateString('id-ID')}.`,
              }}
              onDownload={handleDownload}
              height={500}
            />
          </div>
        </ModalStandar>


      </div>
    </DashboardLayout>
  );
}
