'use client';

import React, { useState, useRef, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useStore } from '@/lib/store';
import { useBusinessLogic } from '@/lib/api';
import { USER_ROLE_LABELS } from '@/lib/types';
import {
  FilePen, Upload, Trash2, CheckCircle2, AlertTriangle, Shield,
  User as UserIcon, Mail, Building, Key, Stamp, RefreshCw, Eye, Undo2
} from 'lucide-react';
import { ModalStandar } from '@/components/ui';

export default function ProfilPage() {
  const { state } = useStore();
  const { apiUploadTandaTangan, apiHapusTandaTangan } = useBusinessLogic();
  const user = state.currentUser;

  const [activeTab, setActiveTab] = useState<'upload' | 'canvas'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tipe: 'sukses' | 'error'; pesan: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmHapus, setShowConfirmHapus] = useState(false);

  // Canvas Pad untuk menggambar tanda tangan langsung
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Setup canvas
  useEffect(() => {
    if (activeTab === 'canvas' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.8;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [activeTab]);

  if (!user) return null;

  const unitKerja = user.unitKerjaId
    ? state.unitKerja.find((u) => u.id === user.unitKerjaId)?.nama
    : 'Dinas Pertanian (Struktural Pimpinan)';

  // Handler Pilih File
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFeedback({ tipe: 'error', pesan: 'Berkas harus berupa gambar (format PNG disarankan).' });
      return;
    }

    if (file.size > 1.5 * 1024 * 1024) {
      setFeedback({ tipe: 'error', pesan: 'Ukuran berkas tanda tangan melebihi batas maksimal 1.5 MB.' });
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewDataUrl(event.target?.result as string);
      setFeedback(null);
    };
    reader.readAsDataURL(file);
  };

  // Simpan berkas yang diunggah
  const handleSaveUploadedSignature = () => {
    if (!previewDataUrl) {
      setFeedback({ tipe: 'error', pesan: 'Silakan pilih berkas tanda tangan terlebih dahulu.' });
      return;
    }

    try {
      apiUploadTandaTangan(user.id, previewDataUrl);
      setSelectedFile(null);
      setPreviewDataUrl(null);
      setFeedback({
        tipe: 'sukses',
        pesan: 'Tanda tangan digital Anda berhasil disimpan dan siap digunakan otomatis di seluruh naskah dinas.',
      });
    } catch (err: any) {
      setFeedback({ tipe: 'error', pesan: err.message || 'Gagal menyimpan tanda tangan.' });
    }
  };

  // Canvas Drawing Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  // Simpan coretan canvas
  const handleSaveCanvasSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) {
      setFeedback({ tipe: 'error', pesan: 'Silakan goreskan tanda tangan pada area canvas terlebih dahulu.' });
      return;
    }

    try {
      const dataUrl = canvas.toDataURL('image/png');
      apiUploadTandaTangan(user.id, dataUrl);
      clearCanvas();
      setFeedback({
        tipe: 'sukses',
        pesan: 'Tanda tangan digital berhasil dibuat dan disimpan ke profil Anda.',
      });
    } catch (err: any) {
      setFeedback({ tipe: 'error', pesan: err.message || 'Gagal menyimpan tanda tangan.' });
    }
  };

  // Hapus tanda tangan
  const handleHapusTandaTangan = () => {
    try {
      apiHapusTandaTangan(user.id);
      setShowConfirmHapus(false);
      setFeedback({
        tipe: 'sukses',
        pesan: 'Tanda tangan digital Anda telah dihapus. Harap unggah kembali sebelum melakukan paraf atau tanda tangan naskah.',
      });
    } catch (err: any) {
      setFeedback({ tipe: 'error', pesan: err.message || 'Gagal menghapus tanda tangan.' });
    }
  };

  return (
    <DashboardLayout>
      <div className="animate-fadeIn" style={{ maxWidth: 960, margin: '0 auto' }}>
        {/* Header Halaman */}
        <div className="page-header" style={{ marginBottom: 20 }}>
          <div className="page-header-left">
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Profil Pengguna</h1>
            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
              Kelola data identitas kedinasan dan tanda tangan digital Anda untuk persetujuan surat dinas.
            </p>
          </div>
        </div>

        {/* Notifikasi Umpan Balik */}
        {feedback && (
          <div
            className={`alert ${feedback.tipe === 'sukses' ? 'alert-success' : 'alert-danger'}`}
            style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {feedback.tipe === 'sukses' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
              <span>{feedback.pesan}</span>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setFeedback(null)}
              style={{ padding: '2px 8px', minHeight: 28 }}
            >
              Tutup
            </button>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, alignItems: 'start' }}>
          {/* Kolom Kiri: Informasi Akun */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: 'var(--primary-100)',
                  color: 'var(--primary-700)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 18,
                }}
              >
                {user.nama.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div>
                <h2 style={{ fontSize: 16, margin: 0, fontWeight: 700 }}>{user.nama}</h2>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {USER_ROLE_LABELS[user.role]}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
              <div>
                <label style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Alamat Email Kedinasan
                </label>
                <div style={{ fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <Mail size={14} style={{ color: 'var(--text-muted)' }} />
                  {user.email}
                </div>
              </div>

              {user.nip && (
                <div>
                  <label style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Nomor Induk Pegawai (NIP)
                  </label>
                  <div style={{ fontSize: 13, fontWeight: 500, fontFamily: 'monospace', marginTop: 2 }}>
                    {user.nip}
                  </div>
                </div>
              )}

              {user.jabatan && (
                <div>
                  <label style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Jabatan Struktural
                  </label>
                  <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}>
                    {user.jabatan}
                  </div>
                </div>
              )}

              <div>
                <label style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Unit Kerja
                </label>
                <div style={{ fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <Building size={14} style={{ color: 'var(--text-muted)' }} />
                  {unitKerja}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Status Akun
                </label>
                <div style={{ marginTop: 2 }}>
                  <span className="badge badge-success" style={{ fontSize: 11 }}>
                    Aktif
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Kolom Kanan: Pengaturan Tanda Tangan Digital */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <h2 style={{ fontSize: 16, margin: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FilePen size={18} style={{ color: 'var(--primary-600)' }} />
                  Tanda Tangan Digital
                </h2>
                <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 12 }}>
                  Digunakan otomatis saat membubuhkan paraf atau menandatangani surat dinas.
                </p>
              </div>

              {user.urlTandaTangan ? (
                <span className="badge badge-success" style={{ fontSize: 11 }}>
                  Tersedia
                </span>
              ) : (
                <span className="badge badge-danger" style={{ fontSize: 11 }}>
                  Belum Diunggah
                </span>
              )}
            </div>

            {/* Area Pratinjau Tanda Tangan Tersimpan */}
            <div
              style={{
                padding: 16,
                background: 'var(--gray-50)',
                border: '1px dashed var(--border-color)',
                borderRadius: 8,
                marginBottom: 16,
                textAlign: 'center',
              }}
            >
              {user.urlTandaTangan ? (
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600 }}>
                    Tanda Tangan / Paraf Aktif:
                  </div>
                  <div
                    style={{
                      height: 90,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#ffffff',
                      borderRadius: 6,
                      border: '1px solid var(--border-color)',
                      padding: 10,
                      marginBottom: 10,
                    }}
                  >
                    <img
                      src={user.urlTandaTangan}
                      alt="Tanda Tangan Pengguna"
                      style={{ maxHeight: 78, maxWidth: '100%', objectFit: 'contain' }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setShowConfirmHapus(true)}
                      style={{ color: 'var(--danger-600)', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12 }}
                    >
                      <Trash2 size={13} />
                      Hapus Tanda Tangan
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '16px 0' }}>
                  <AlertTriangle size={32} style={{ color: '#d97706', margin: '0 auto 8px' }} />
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Belum ada tanda tangan tersimpan</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 280, margin: '4px auto 0' }}>
                    Unggah berkas PNG transparan atau goreskan tanda tangan pada canvas di bawah.
                  </div>
                </div>
              )}
            </div>

            {/* Pilihan Metode: Unggah File ATAU Canvas */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                <button
                  type="button"
                  className={`btn btn-sm ${activeTab === 'upload' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setActiveTab('upload')}
                  style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <Upload size={14} />
                  Unggah Berkas PNG
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${activeTab === 'canvas' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setActiveTab('canvas')}
                  style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <FilePen size={14} />
                  Goreskan di Layar
                </button>
              </div>

              {activeTab === 'upload' ? (
                <div>
                  <div style={{ marginBottom: 12 }}>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml"
                      onChange={handleFileChange}
                      className="form-control"
                      style={{ fontSize: 12, padding: '8px 12px' }}
                    />
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                      Disarankan file PNG berlatar transparan (Maks. 1.5 MB).
                    </div>
                  </div>

                  {previewDataUrl && (
                    <div style={{ marginBottom: 12, padding: 12, background: 'var(--gray-50)', borderRadius: 6, textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Pratinjau Berkas Baru:</div>
                      <div style={{ height: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', borderRadius: 4, padding: 6, marginBottom: 8 }}>
                        <img src={previewDataUrl} alt="Pratinjau Baru" style={{ maxHeight: 60, objectFit: 'contain' }} />
                      </div>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={handleSaveUploadedSignature}
                        style={{ width: '100%' }}
                      >
                        Simpan Tanda Tangan Ini
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                    Goreskan tanda tangan Anda pada bidang di bawah:
                  </div>
                  <div style={{ border: '2px solid #cbd5e1', borderRadius: 6, background: '#ffffff', overflow: 'hidden', marginBottom: 8 }}>
                    <canvas
                      ref={canvasRef}
                      width={420}
                      height={140}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      style={{ width: '100%', height: 140, cursor: 'crosshair', display: 'block' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={clearCanvas}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    >
                      <Undo2 size={13} />
                      Bersihkan
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={handleSaveCanvasSignature}
                      style={{ flex: 1 }}
                      disabled={!hasDrawn}
                    >
                      Simpan Goresan Tanda Tangan
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Catatan Ketentuan Audit */}
            <div style={{ marginTop: 16, padding: 10, background: 'var(--primary-50)', borderRadius: 6, fontSize: 11, color: 'var(--primary-800)', lineHeight: 1.5 }}>
              <Shield size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'text-bottom' }} />
              <strong>Prinsip Integritas Riwayat:</strong> Saat Anda mengesahkan naskah dinas, sistem menyimpan tangkapan (*snapshot*) tanda tangan pada saat itu. Pembaruan tanda tangan di profil tidak akan mengubah naskah yang telah disahkan sebelumnya.
            </div>
          </div>
        </div>

        {/* Modal Konfirmasi Hapus Tanda Tangan */}
        {showConfirmHapus && (
          <ModalStandar
            open={showConfirmHapus}
            onClose={() => setShowConfirmHapus(false)}
            judul="Konfirmasi Hapus Tanda Tangan"
            size="sm"
            footerSecondary={
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowConfirmHapus(false)}>
                Batal
              </button>
            }
            footerPrimary={
              <button type="button" className="btn btn-danger btn-sm" onClick={handleHapusTandaTangan}>
                Hapus Tanda Tangan
              </button>
            }
          >
            <div style={{ fontSize: 13, lineHeight: 1.6 }}>
              Apakah Anda yakin ingin menghapus tanda tangan digital tersimpan?
              <div style={{ marginTop: 8, color: 'var(--danger-700)', fontSize: 12 }}>
                Peringatan: Selama belum mengunggah kembali, Anda tidak dapat memberikan paraf atau menandatangani naskah keluar.
              </div>
            </div>
          </ModalStandar>
        )}
      </div>
    </DashboardLayout>
  );
}
