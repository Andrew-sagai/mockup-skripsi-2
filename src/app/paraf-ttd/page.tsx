'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useStore } from '@/lib/store';
import { useBusinessLogic } from '@/lib/api';
import { SuratKeluar } from '@/lib/types';
import {
  FilePen, Eye, CheckCircle2, XCircle, Search, Filter, Shield,
  Clock, AlertTriangle, ArrowRight, ExternalLink, Key, RefreshCw, Send
} from 'lucide-react';
import {
  ChipStatus, BadgeSifat, ModalStandar, KonsepSuratPreview
} from '@/components/ui';

export default function ParafTtdPage() {
  const { state, getUser, getKlasifikasi, getJenisSurat } = useStore();
  const {
    apiParafKoordinasi,
    apiTandatanganSurat,
    apiTolakSuratKeluar,
  } = useBusinessLogic();

  const user = state.currentUser;
  const isSekretaris = user?.role === 'sekretaris';
  const isKadis = user?.role === 'kepala_dinas';
  const isAdminOrPetugas = !isSekretaris && !isKadis;

  // Tab aktif khusus bila dibuka oleh admin / petugas penguji
  const [tabFallback, setTabFallback] = useState<'menunggu_paraf' | 'menunggu_ttd'>('menunggu_paraf');

  // Filter & Pencarian
  const [search, setSearch] = useState('');
  const [filterSifat, setFilterSifat] = useState('all');

  // State Modal & Aksi
  const [selectedSuratPreview, setSelectedSuratPreview] = useState<SuratKeluar | null>(null);
  const [suratAksi, setSuratAksi] = useState<SuratKeluar | null>(null);
  const [jenisAksi, setJenisAksi] = useState<'paraf' | 'kembalikan_sekdis' | 'ttd' | 'tolak_kadis' | null>(null);

  // Form input dalam modal aksi
  const [catatanAksi, setCatatanAksi] = useState('');
  const [passwordKadis, setPasswordKadis] = useState('');
  const [feedback, setFeedback] = useState<{ tipe: 'sukses' | 'error'; pesan: string } | null>(null);

  // Ambil data antrean surat keluar sesuai role
  const queueSurat = useMemo(() => {
    let items: SuratKeluar[] = [];

    if (isSekretaris) {
      items = state.suratKeluar.filter((s) => s.status === 'menunggu_paraf');
    } else if (isKadis) {
      items = state.suratKeluar.filter((s) => s.status === 'menunggu_ttd');
    } else {
      // Admin / role lain: sediakan toggle tab antrean
      items = state.suratKeluar.filter((s) => s.status === tabFallback);
    }

    // Urutkan terbaru ke lama
    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [state.suratKeluar, isSekretaris, isKadis, tabFallback]);

  // Data tersaring
  const filteredQueue = useMemo(() => {
    const q = search.toLowerCase();
    return queueSurat.filter((s) => {
      const matchSearch =
        !q ||
        s.perihal.toLowerCase().includes(q) ||
        (s.nomorSurat && s.nomorSurat.toLowerCase().includes(q)) ||
        s.tujuan.toLowerCase().includes(q) ||
        (s.penyusun && s.penyusun.nama.toLowerCase().includes(q));

      const matchSifat = filterSifat === 'all' || (s.klasifikasi?.kode && filterSifat === 'all');
      return matchSearch;
    });
  }, [queueSurat, search, filterSifat]);

  // Statistik ringkas antrean
  const stats = useMemo(() => {
    const total = queueSurat.length;
    const pentingSegera = queueSurat.filter((s) => {
      const p = s.perihal.toLowerCase();
      return p.includes('segera') || p.includes('penting') || p.includes('undangan');
    }).length;
    const suratBalasan = queueSurat.filter((s) => s.suratMasukAsalId).length;
    return { total, pentingSegera, suratBalasan };
  }, [queueSurat]);

  // Buka modal aksi
  const handleOpenAksi = (surat: SuratKeluar, tipe: 'paraf' | 'kembalikan_sekdis' | 'ttd' | 'tolak_kadis') => {
    setSuratAksi(surat);
    setJenisAksi(tipe);
    setCatatanAksi('');
    setPasswordKadis('');
    setFeedback(null);
  };

  const handleCloseAksi = () => {
    setSuratAksi(null);
    setJenisAksi(null);
    setCatatanAksi('');
    setPasswordKadis('');
  };

  // Eksekusi aksi
  const handleEksekusiAksi = () => {
    if (!suratAksi) return;
    setFeedback(null);

    try {
      if (jenisAksi === 'paraf') {
        apiParafKoordinasi(suratAksi.id, true, catatanAksi);
        setFeedback({
          tipe: 'sukses',
          pesan: `Paraf koordinasi untuk surat "${suratAksi.perihal}" berhasil dibubuhkan. Surat diteruskan ke Kepala Dinas.`,
        });
        handleCloseAksi();
        if (selectedSuratPreview?.id === suratAksi.id) setSelectedSuratPreview(null);
      } else if (jenisAksi === 'kembalikan_sekdis') {
        if (!catatanAksi.trim()) {
          setFeedback({ tipe: 'error', pesan: 'Catatan revisi wajib diisi agar pemrakarsa memahami perbaikan.' });
          return;
        }
        apiParafKoordinasi(suratAksi.id, false, catatanAksi);
        setFeedback({
          tipe: 'sukses',
          pesan: `Konsep surat "${suratAksi.perihal}" dikembalikan ke pemrakarsa dengan catatan revisi.`,
        });
        handleCloseAksi();
        if (selectedSuratPreview?.id === suratAksi.id) setSelectedSuratPreview(null);
      } else if (jenisAksi === 'ttd') {
        if (!passwordKadis) {
          setFeedback({ tipe: 'error', pesan: 'Kata sandi konfirmasi wajib diisi.' });
          return;
        }
        apiTandatanganSurat(suratAksi.id, passwordKadis);
        setFeedback({
          tipe: 'sukses',
          pesan: `Surat keluar "${suratAksi.perihal}" berhasil ditandatangani secara digital. Menunggu penomoran oleh Petugas Surat.`,
        });
        handleCloseAksi();
        if (selectedSuratPreview?.id === suratAksi.id) setSelectedSuratPreview(null);
      } else if (jenisAksi === 'tolak_kadis') {
        if (!catatanAksi.trim()) {
          setFeedback({ tipe: 'error', pesan: 'Catatan penolakan wajib diisi.' });
          return;
        }
        apiTolakSuratKeluar(suratAksi.id, catatanAksi);
        setFeedback({
          tipe: 'sukses',
          pesan: `Pengesahan surat "${suratAksi.perihal}" ditolak dan dikembalikan ke pemrakarsa.`,
        });
        handleCloseAksi();
        if (selectedSuratPreview?.id === suratAksi.id) setSelectedSuratPreview(null);
      }
    } catch (err: any) {
      setFeedback({ tipe: 'error', pesan: err.message || 'Terjadi kesalahan saat memproses permintaan.' });
    }
  };

  return (
    <DashboardLayout>
      <div className="animate-fadeIn">
        {/* Header Halaman */}
        <div className="page-header" style={{ marginBottom: 20 }}>
          <div className="page-header-left">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: 'var(--primary-100)',
                  color: 'var(--primary-700)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FilePen size={22} />
              </div>
              <div>
                <h1 style={{ fontSize: 22, margin: 0, fontWeight: 700 }}>
                  {isSekretaris
                    ? 'Antrean Paraf Koordinasi'
                    : isKadis
                    ? 'Antrean Tanda Tangan Surat'
                    : 'Persetujuan Paraf & Tanda Tangan'}
                </h1>
                <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
                  {isSekretaris
                    ? 'Daftar konsep surat keluar menunggu paraf koordinasi Sekretaris Dinas sebelum diajukan ke Kepala Dinas.'
                    : isKadis
                    ? 'Daftar konsep surat keluar yang telah diparaf Sekretaris Dinas dan siap disahkan dengan tanda tangan digital.'
                    : 'Modul khusus pemeriksaan, paraf koordinasi, dan tanda tangan digital naskah dinas surat keluar.'}
                </p>
              </div>
            </div>
          </div>
          <div className="page-header-actions">
            <Link href="/surat-keluar" className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Send size={15} />
              Lihat Seluruh Surat Keluar
            </Link>
          </div>
        </div>

        {/* Banner Peringatan Tanda Tangan Belum Diunggah (Tabel 20, 21 - Error Situation) */}
        {(isSekretaris || isKadis) && !user?.urlTandaTangan && (
          <div
            className="alert alert-warning"
            style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <AlertTriangle size={20} style={{ color: '#b45309' }} />
              <div>
                <strong>Tanda Tangan Belum Diunggah:</strong> Anda belum mengunggah tanda tangan digital pada profil akun Anda. Proses paraf dan tanda tangan naskah dinas memerlukan tanda tangan digital tersimpan.
              </div>
            </div>
            <Link href="/profil" className="btn btn-sm btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <FilePen size={14} />
              Unggah di Halaman Profil
            </Link>
          </div>
        )}

        {/* Notifikasi Umpan Balik */}
        {feedback && (
          <div
            className={`alert ${feedback.tipe === 'sukses' ? 'alert-success' : 'alert-danger'}`}
            style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {feedback.tipe === 'sukses' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
              <span>{feedback.pesan}</span>
              {feedback.pesan.includes('belum mengunggah tanda tangan') && (
                <Link href="/profil" className="btn btn-sm btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
                  <FilePen size={14} />
                  Buka Halaman Profil
                </Link>
              )}
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

        {/* Banner Pemilihan Tab untuk Pengguna Uji Coba / Admin */}
        {isAdminOrPetugas && (
          <div
            style={{
              padding: '12px 16px',
              background: 'var(--gray-50)',
              border: '1px solid var(--border-color)',
              borderRadius: 8,
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div style={{ fontSize: 13 }}>
              <strong>Mode Pratinjau Administrator:</strong> Anda sedang masuk dengan peran bukan Sekretaris/Kadis. Pilih antrean yang ingin ditinjau:
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className={`btn btn-sm ${tabFallback === 'menunggu_paraf' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setTabFallback('menunggu_paraf')}
              >
                Antrean Paraf (Sekretaris)
              </button>
              <button
                type="button"
                className={`btn btn-sm ${tabFallback === 'menunggu_ttd' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setTabFallback('menunggu_ttd')}
              >
                Antrean Tanda Tangan (Kadis)
              </button>
            </div>
          </div>
        )}

        {/* Ringkasan Statistik */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 16,
            marginBottom: 20,
          }}
        >
          <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid var(--primary-600)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
              Total Menunggu Persetujuan
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--primary-700)', marginTop: 4 }}>
              {stats.total}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {isSekretaris ? 'Konsep menunggu paraf' : isKadis ? 'Surat menunggu TTD' : 'Naskah dalam antrean'}
            </div>
          </div>

          <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #d97706' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
              Prioritas Mendesak
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#b45309', marginTop: 4 }}>
              {stats.pentingSegera}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              Naskah dinas dengan perihal mendesak
            </div>
          </div>

          <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #2563eb' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
              Surat Jawaban Disposisi
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#1d4ed8', marginTop: 4 }}>
              {stats.suratBalasan}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              Terkait surat masuk hasil penugasan
            </div>
          </div>
        </div>

        {/* Toolbar Pencarian & Filter */}
        <div className="card" style={{ padding: 16, marginBottom: 20 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            <div className="search-input-wrapper" style={{ flex: '1 1 320px' }}>
              <Search size={18} />
              <input
                className="search-input"
                placeholder="Cari perihal, tujuan, nomor, atau nama penyusun..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {search && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setSearch('')}
                style={{ fontSize: 12 }}
              >
                Reset Pencarian
              </button>
            )}
          </div>
        </div>

        {/* Tabel Antrean Surat Keluar */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>
              Daftar Konsep Surat ({filteredQueue.length})
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Diurutkan dari pengajuan paling baru
            </div>
          </div>

          {filteredQueue.length === 0 ? (
            <div className="empty-state" style={{ padding: '48px 24px', textAlign: 'center' }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: 'var(--gray-100)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-muted)',
                  marginBottom: 12,
                }}
              >
                <CheckCircle2 size={32} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
                Tidak Ada Antrean Surat
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, maxWidth: 440, margin: '0 auto' }}>
                {isSekretaris
                  ? 'Saat ini seluruh konsep surat telah diparaf atau belum ada pengajuan baru dari unit kerja.'
                  : isKadis
                  ? 'Saat ini tidak ada surat keluar yang menunggu pengesahan tanda tangan digital Anda.'
                  : 'Tidak ada naskah dinas dalam antrean persetujuan.'}
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>No</th>
                    <th>Naskah & Perihal</th>
                    <th style={{ width: 180 }}>Pemrakarsa</th>
                    <th style={{ width: 140 }}>Tanggal Dibuat</th>
                    <th style={{ width: 150 }}>Status</th>
                    <th style={{ width: 220, textAlign: 'center' }}>Aksi Persetujuan</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQueue.map((surat, index) => {
                    const penyusun = surat.penyusun || (surat.penyusunId ? getUser(surat.penyusunId) : null);
                    const jenisObj = surat.jenisSuratObj || (surat.jenisSuratId ? getJenisSurat(surat.jenisSuratId) : null);
                    const klas = surat.klasifikasi || (surat.klasifikasiId ? getKlasifikasi(surat.klasifikasiId) : null);

                    return (
                      <tr key={surat.id}>
                        <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{index + 1}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            {jenisObj && (
                              <span className="badge badge-info" style={{ fontSize: 10 }}>
                                {jenisObj.nama}
                              </span>
                            )}
                            {klas && (
                              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                [{klas.kode}]
                              </span>
                            )}
                            {surat.suratMasukAsalId && (
                              <span className="badge badge-primary" style={{ fontSize: 10 }}>
                                Balasan Surat Masuk
                              </span>
                            )}
                          </div>
                          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', marginBottom: 2 }}>
                            {surat.perihal}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            Tujuan: <span style={{ color: 'var(--text-secondary)' }}>{surat.tujuan}</span>
                          </div>
                          {surat.nomorSurat && (
                            <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)', marginTop: 2 }}>
                              No: {surat.nomorSurat}
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{penyusun?.nama || 'Petugas'}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {penyusun?.role ? penyusun.role.replace(/_/g, ' ') : 'Unit Pemrakarsa'}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: 13 }}>
                            {new Date(surat.createdAt).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {new Date(surat.createdAt).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}{' '}
                            WITA
                          </div>
                        </td>
                        <td>
                          <ChipStatus jenis="suratKeluar" status={surat.status} compact />
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {/* Tombol Pratinjau Naskah Konsep */}
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => setSelectedSuratPreview(surat)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                                width: '100%',
                              }}
                            >
                              <Eye size={14} />
                              Pratinjau Konsep
                            </button>

                            {/* Tombol Aksi Spesifik Role */}
                            <div style={{ display: 'flex', gap: 6 }}>
                              {(isSekretaris || (isAdminOrPetugas && tabFallback === 'menunggu_paraf')) && (
                                <>
                                  <button
                                    type="button"
                                    className="btn btn-primary btn-sm"
                                    onClick={() => handleOpenAksi(surat, 'paraf')}
                                    style={{
                                      flex: 1,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: 4,
                                    }}
                                    title="Setujui dan beri paraf koordinasi"
                                  >
                                    <CheckCircle2 size={13} />
                                    Paraf
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => handleOpenAksi(surat, 'kembalikan_sekdis')}
                                    style={{
                                      color: 'var(--danger-600)',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                    title="Kembalikan dengan catatan revisi"
                                  >
                                    <XCircle size={15} />
                                  </button>
                                </>
                              )}

                              {(isKadis || (isAdminOrPetugas && tabFallback === 'menunggu_ttd')) && (
                                <>
                                  <button
                                    type="button"
                                    className="btn btn-primary btn-sm"
                                    onClick={() => handleOpenAksi(surat, 'ttd')}
                                    style={{
                                      flex: 1,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: 4,
                                    }}
                                    title="Tandatangani naskah surat secara digital"
                                  >
                                    <FilePen size={13} />
                                    Tandatangani
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => handleOpenAksi(surat, 'tolak_kadis')}
                                    style={{
                                      color: 'var(--danger-600)',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                    title="Tolak dan kembalikan draf"
                                  >
                                    <XCircle size={15} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal 1: Pratinjau Naskah Konsep Lengkap (Tahap 1 Poin 2) */}
        {selectedSuratPreview && (
          <ModalStandar
            open={!!selectedSuratPreview}
            onClose={() => setSelectedSuratPreview(null)}
            judul={`Pratinjau Konsep: ${selectedSuratPreview.perihal}`}
            size="lg"
            footerSecondary={
              <Link
                href={`/surat-keluar/${selectedSuratPreview.id}`}
                className="btn btn-secondary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <ExternalLink size={14} />
                Buka Halaman Detail
              </Link>
            }
            footerPrimary={
              <div style={{ display: 'flex', gap: 8 }}>
                {isSekretaris && selectedSuratPreview.status === 'menunggu_paraf' && (
                  <>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => handleOpenAksi(selectedSuratPreview, 'kembalikan_sekdis')}
                    >
                      Kembalikan Konsep
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => handleOpenAksi(selectedSuratPreview, 'paraf')}
                    >
                      Setujui & Beri Paraf
                    </button>
                  </>
                )}

                {isKadis && selectedSuratPreview.status === 'menunggu_ttd' && (
                  <>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => handleOpenAksi(selectedSuratPreview, 'tolak_kadis')}
                    >
                      Tolak Pengesahan
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => handleOpenAksi(selectedSuratPreview, 'ttd')}
                    >
                      Tandatangani Digital
                    </button>
                  </>
                )}
              </div>
            }
          >
            <div style={{ maxHeight: '72vh', overflowY: 'auto', paddingRight: 4 }}>
              <KonsepSuratPreview
                surat={selectedSuratPreview}
                penyusun={selectedSuratPreview.penyusun || (selectedSuratPreview.penyusunId ? getUser(selectedSuratPreview.penyusunId) : undefined)}
                jenisSurat={selectedSuratPreview.jenisSuratObj || (selectedSuratPreview.jenisSuratId ? getJenisSurat(selectedSuratPreview.jenisSuratId) : undefined)}
                klasifikasi={selectedSuratPreview.klasifikasi || (selectedSuratPreview.klasifikasiId ? getKlasifikasi(selectedSuratPreview.klasifikasiId) : undefined)}
                persetujuanList={state.persetujuan.filter((p) => p.suratKeluarId === selectedSuratPreview.id)}
                getUser={getUser}
                showToolbar={true}
              />
            </div>
          </ModalStandar>
        )}

        {/* Modal 2: Aksi Paraf Koordinasi (Sekretaris Dinas) */}
        {jenisAksi === 'paraf' && suratAksi && (
          <ModalStandar
            open={true}
            onClose={handleCloseAksi}
            judul="Konfirmasi Paraf Koordinasi"
            size="md"
            footerSecondary={
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleCloseAksi}>
                Batal
              </button>
            }
            footerPrimary={
              <button type="button" className="btn btn-primary btn-sm" onClick={handleEksekusiAksi}>
                Setujui & Bubuhkan Paraf
              </button>
            }
          >
            <div style={{ fontSize: 13, lineHeight: 1.6 }}>
              <div style={{ padding: 12, background: 'var(--primary-50)', borderRadius: 8, marginBottom: 14 }}>
                <strong>Perihal:</strong> {suratAksi.perihal}
                <br />
                <strong>Tujuan:</strong> {suratAksi.tujuan}
              </div>
              <p style={{ margin: '0 0 10px' }}>
                Anda akan membubuhkan paraf koordinasi pada naskah ini. Status surat akan dimutakhirkan menjadi{' '}
                <strong style={{ color: 'var(--primary-700)' }}>Menunggu Tanda Tangan</strong> dan diteruskan ke antrean Kepala Dinas.
              </p>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>
                Catatan Koordinasi (Opsional):
              </label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Tambahkan catatan koordinasi untuk Kepala Dinas bila diperlukan..."
                value={catatanAksi}
                onChange={(e) => setCatatanAksi(e.target.value)}
                style={{ width: '100%', fontSize: 13 }}
              />
            </div>
          </ModalStandar>
        )}

        {/* Modal 3: Kembalikan Konsep (Sekretaris Dinas) */}
        {jenisAksi === 'kembalikan_sekdis' && suratAksi && (
          <ModalStandar
            open={true}
            onClose={handleCloseAksi}
            judul="Kembalikan Konsep Surat"
            size="md"
            footerSecondary={
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleCloseAksi}>
                Batal
              </button>
            }
            footerPrimary={
              <button type="button" className="btn btn-danger btn-sm" onClick={handleEksekusiAksi}>
                Kembalikan ke Pemrakarsa
              </button>
            }
          >
            <div style={{ fontSize: 13, lineHeight: 1.6 }}>
              <div style={{ padding: 12, background: 'var(--danger-50)', borderRadius: 8, marginBottom: 14 }}>
                <strong>Perihal:</strong> {suratAksi.perihal}
              </div>
              <p style={{ margin: '0 0 10px', color: 'var(--text-secondary)' }}>
                Naskah akan berstatus <strong style={{ color: 'var(--danger-700)' }}>Perlu Revisi</strong> dan dikembalikan ke pemrakarsa beserta catatan berikut.
              </p>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>
                Catatan Revisi <span style={{ color: 'var(--danger-600)' }}>*</span>
              </label>
              <textarea
                className="form-control"
                rows={4}
                placeholder="Sebutkan bagian naskah atau substansi yang perlu diperbaiki oleh pemrakarsa..."
                value={catatanAksi}
                onChange={(e) => setCatatanAksi(e.target.value)}
                style={{ width: '100%', fontSize: 13 }}
                required
              />
            </div>
          </ModalStandar>
        )}

        {/* Modal 4: Tanda Tangan Digital (Kepala Dinas) */}
        {jenisAksi === 'ttd' && suratAksi && (
          <ModalStandar
            open={true}
            onClose={handleCloseAksi}
            judul="Otorisasi Tanda Tangan Digital"
            size="md"
            footerSecondary={
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleCloseAksi}>
                Batal
              </button>
            }
            footerPrimary={
              <button type="button" className="btn btn-primary btn-sm" onClick={handleEksekusiAksi}>
                Tandatangani Naskah
              </button>
            }
          >
            <div style={{ fontSize: 13, lineHeight: 1.6 }}>
              <div style={{ padding: 12, background: 'var(--primary-50)', borderRadius: 8, marginBottom: 14 }}>
                <strong>Perihal:</strong> {suratAksi.perihal}
                <br />
                <strong>Tujuan:</strong> {suratAksi.tujuan}
              </div>
              <p style={{ margin: '0 0 12px' }}>
                Sesuai dengan ketentuan tata naskah dinas elektronik (Tabel 20), pengesahan tanda tangan digital memerlukan verifikasi kata sandi otentikasi akun Anda.
              </p>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>
                Konfirmasi Kata Sandi Akun: <span style={{ color: 'var(--danger-600)' }}>*</span>
              </label>
              <div style={{ position: 'relative', marginBottom: 8 }}>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Masukkan kata sandi login Anda..."
                  value={passwordKadis}
                  onChange={(e) => setPasswordKadis(e.target.value)}
                  style={{ width: '100%', fontSize: 13, paddingLeft: 34 }}
                  autoFocus
                />
                <Key size={15} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Petunjuk simulasi prototipe: Gunakan kata sandi <code>kadis123</code>.
              </div>
            </div>
          </ModalStandar>
        )}

        {/* Modal 5: Tolak Pengesahan (Kepala Dinas) */}
        {jenisAksi === 'tolak_kadis' && suratAksi && (
          <ModalStandar
            open={true}
            onClose={handleCloseAksi}
            judul="Tolak Pengesahan Surat Keluar"
            size="md"
            footerSecondary={
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleCloseAksi}>
                Batal
              </button>
            }
            footerPrimary={
              <button type="button" className="btn btn-danger btn-sm" onClick={handleEksekusiAksi}>
                Tolak & Kembalikan
              </button>
            }
          >
            <div style={{ fontSize: 13, lineHeight: 1.6 }}>
              <div style={{ padding: 12, background: 'var(--danger-50)', borderRadius: 8, marginBottom: 14 }}>
                <strong>Perihal:</strong> {suratAksi.perihal}
              </div>
              <p style={{ margin: '0 0 10px', color: 'var(--text-secondary)' }}>
                Tanda tangan digital akan ditolak dan status naskah kembali menjadi <strong style={{ color: 'var(--danger-700)' }}>Perlu Revisi</strong>.
              </p>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>
                Alasan Penolakan <span style={{ color: 'var(--danger-600)' }}>*</span>
              </label>
              <textarea
                className="form-control"
                rows={4}
                placeholder="Sebutkan alasan penolakan pengesahan naskah..."
                value={catatanAksi}
                onChange={(e) => setCatatanAksi(e.target.value)}
                style={{ width: '100%', fontSize: 13 }}
                required
              />
            </div>
          </ModalStandar>
        )}
      </div>
    </DashboardLayout>
  );
}
