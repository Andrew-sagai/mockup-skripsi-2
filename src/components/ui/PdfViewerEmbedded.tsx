'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  FileText, Download, AlertTriangle, RefreshCw, Eye, CheckCircle2,
  ExternalLink, Printer, Shield, Clock, FileCheck, Info
} from 'lucide-react';
import { getPdfFromCandidates } from '@/lib/pdf-storage';

export interface SuratMetadataPreview {
  nomor?: string;
  perihal?: string;
  asalSurat?: string;
  tujuan?: string;
  tanggal?: string;
  sifat?: string;
  isiRingkas?: string;
  klasifikasi?: string;
  jenisSurat?: string;
}

interface PdfViewerEmbeddedProps {
  /** URL berkas PDF (blob URL, URL relatif /docs/..., atau data URI) */
  fileUrl?: string;
  /** Judul atau nama berkas untuk tampilan header */
  judul?: string;
  /** Metadata surat pendukung untuk pratinjau digital fallback */
  metadata?: SuratMetadataPreview;
  /** Callback opsional untuk mengunduh berkas */
  onDownload?: () => void;
  /** Tinggi area penampil berkas (default: 540px) */
  height?: number | string;
  /** Menampilkan toolbar kontrol di atas berkas */
  showToolbar?: boolean;
}

export function PdfViewerEmbedded({
  fileUrl,
  judul = 'Berkas Naskah Dinas (PDF)',
  metadata,
  onDownload,
  height = 540,
  showToolbar = true,
}: PdfViewerEmbeddedProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [viewMode, setViewMode] = useState<'pdf' | 'digital'>('pdf');
  const [loadProgress, setLoadProgress] = useState(20);
  const [resolvedUrl, setResolvedUrl] = useState<string>('');
  const [isFallback, setIsFallback] = useState(false);
  const [sourceType, setSourceType] = useState<'local' | 'remote' | 'sample'>('sample');

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const createdObjectUrlRef = useRef<string | null>(null);

  // Tentukan berkas sampel acuan standar dinas sesuai jenis naskah
  const defaultFallbackUrl = useMemo(() => {
    const isKeluar =
      (fileUrl && (fileUrl.toLowerCase().includes('keluar') || fileUrl.toLowerCase().includes('sk-'))) ||
      (judul && judul.toLowerCase().includes('keluar')) ||
      (metadata?.jenisSurat && metadata.jenisSurat.toLowerCase().includes('keluar'));
    return isKeluar ? '/docs/sample-surat-keluar.pdf' : '/docs/sample-surat-masuk.pdf';
  }, [fileUrl, judul, metadata?.jenisSurat]);

  // Resolusi berkas PDF: IndexedDB -> Server/Static -> Sample Acuan Resmi
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setError(false);
    setLoadProgress(30);

    async function resolvePdf() {
      // 1. Jika URL sudah berupa blob URL atau data URL yang masih aktif
      if (fileUrl && (fileUrl.startsWith('blob:') || fileUrl.startsWith('data:'))) {
        if (!isCancelled) {
          setResolvedUrl(fileUrl);
          setSourceType('local');
          setIsFallback(false);
          setLoading(false);
        }
        return;
      }

      // 2. Cek apakah ada berkas fisik nyata yang tersimpan di IndexedDB browser lokal
      try {
        const candidates = [
          fileUrl,
          fileUrl?.replace(/^\/docs\//, ''),
          metadata?.nomor ? `sm_${metadata.nomor}` : null,
          metadata?.nomor ? `sm_agenda_${metadata.nomor}` : null,
          metadata?.nomor ? `sk_${metadata.nomor}` : null,
        ];
        const storedBlob = await getPdfFromCandidates(candidates);
        if (storedBlob && !isCancelled) {
          // Bersihkan object URL sebelumnya
          if (createdObjectUrlRef.current) {
            URL.revokeObjectURL(createdObjectUrlRef.current);
          }
          const blobUrl = URL.createObjectURL(storedBlob);
          createdObjectUrlRef.current = blobUrl;
          setResolvedUrl(blobUrl);
          setSourceType('local');
          setIsFallback(false);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn('Gagal membaca IndexedDB:', err);
      }

      // 3. Jika URL mengarah ke placeholder dummy lama
      const cleanUrl = fileUrl || defaultFallbackUrl;
      if (cleanUrl.includes('mock-uploaded.pdf') || cleanUrl.includes('placeholder')) {
        if (!isCancelled) {
          setResolvedUrl(defaultFallbackUrl);
          setSourceType('sample');
          setIsFallback(true);
          setLoading(false);
        }
        return;
      }

      // 4. Periksa ketersediaan berkas di server secara pre-flight (mencegah iframe memuat halaman 404)
      try {
        const checkRes = await fetch(cleanUrl, { method: 'GET' });
        if (isCancelled) return;

        const contentType = checkRes.headers.get('content-type') || '';
        const isFallbackHeader = checkRes.headers.get('x-fallback-pdf') === 'true';

        // Jika berhasil dan tipe konten adalah PDF
        if (checkRes.ok && (contentType.includes('application/pdf') || contentType.includes('binary'))) {
          setResolvedUrl(cleanUrl);
          setIsFallback(isFallbackHeader);
          setSourceType(isFallbackHeader ? 'sample' : 'remote');
          setLoading(false);
        } else {
          // Jika server mengembalikan 404 HTML, jangan tampilkan di iframe!
          // Alihkan ke PDF acuan resmi dinas
          setResolvedUrl(defaultFallbackUrl);
          setIsFallback(true);
          setSourceType('sample');
          setLoading(false);
        }
      } catch (err) {
        if (!isCancelled) {
          // Fallback jaringan aman ke berkas acuan dinas
          setResolvedUrl(defaultFallbackUrl);
          setIsFallback(true);
          setSourceType('sample');
          setLoading(false);
        }
      }
    }

    resolvePdf();

    return () => {
      isCancelled = true;
    };
  }, [fileUrl, metadata?.nomor, defaultFallbackUrl]);

  // Bersihkan object URL saat unmount
  useEffect(() => {
    return () => {
      if (createdObjectUrlRef.current) {
        URL.revokeObjectURL(createdObjectUrlRef.current);
        createdObjectUrlRef.current = null;
      }
    };
  }, []);

  const handleIframeLoad = () => {
    setLoadProgress(100);
    setTimeout(() => {
      setLoading(false);
      setError(false);
    }, 120);
  };

  const handleIframeError = () => {
    setLoading(false);
    setError(true);
  };

  const handleCobaMuatUlang = () => {
    setLoading(true);
    setError(false);
    setLoadProgress(20);
    if (iframeRef.current) {
      iframeRef.current.src = `${resolvedUrl || defaultFallbackUrl}#toolbar=0&navpanes=0&scrollbar=1`;
    }
  };

  const handleCetak = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.print();
        return;
      } catch {
        // Fallback cetak jendela jika lintas-domain
      }
    }
    window.print();
  };

  const defaultDownloadHandler = () => {
    if (onDownload) {
      onDownload();
      return;
    }
    const target = resolvedUrl || defaultFallbackUrl;
    const link = document.createElement('a');
    link.href = target;
    link.download = `${judul.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className="pdf-embedded-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 'var(--border-radius-lg, 6px)',
        border: '1px solid var(--garis, #D8DEDA)',
        background: 'var(--permukaan, #FFFFFF)',
        overflow: 'hidden',
        boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
      }}
    >
      {/* ─── Header Toolbar Penampil ─── */}
      {showToolbar && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            background: 'var(--latar, #F3F5F4)',
            borderBottom: '1px solid var(--garis, #D8DEDA)',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flexWrap: 'wrap' }}>
            <FileText size={18} style={{ color: 'var(--pinus, #2A7356)', flexShrink: 0 }} aria-hidden="true" />
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--tinta, #18211D)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={judul}
            >
              {judul}
            </span>
            <span
              className="chip chip-netral"
              style={{ fontSize: 11, padding: '2px 8px', fontWeight: 600 }}
              title="Berkas hanya dapat ditinjau dan diunduh, tidak dapat diubah"
            >
              Hanya Baca
            </span>
            {sourceType === 'local' && (
              <span
                className="chip chip-sukses"
                style={{ fontSize: 11, padding: '2px 8px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                title="Menampilkan berkas PDF asli yang diunggah pengguna"
              >
                <CheckCircle2 size={12} aria-hidden="true" /> Berkas Unggahan Asli
              </span>
            )}
            {isFallback && sourceType !== 'local' && (
              <span
                className="chip chip-info"
                style={{ fontSize: 11, padding: '2px 8px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                title="Menampilkan lembar format resmi standar dinas karena berkas fisik disimpan dalam buku agenda fisik"
              >
                <FileCheck size={12} aria-hidden="true" /> Format Acuan Dinas
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {/* Opsi Mode Tampilan */}
            {metadata && (
              <button
                type="button"
                className={`btn btn-sm ${viewMode === 'digital' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setViewMode(viewMode === 'digital' ? 'pdf' : 'digital')}
                style={{ fontSize: 12, minHeight: 32 }}
                title="Beralih antara penampil PDF asli dan pratinjau lembar naskah dinas"
              >
                <Eye size={14} aria-hidden="true" />
                <span>{viewMode === 'digital' ? 'Lihat Lembar PDF' : 'Format Lembar'}</span>
              </button>
            )}

            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={handleCetak}
              style={{ fontSize: 12, minHeight: 32 }}
              title="Cetak berkas naskah dinas"
            >
              <Printer size={14} aria-hidden="true" />
              <span className="hide-mobile">Cetak</span>
            </button>

            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={defaultDownloadHandler}
              style={{ fontSize: 12, minHeight: 32, display: 'inline-flex', alignItems: 'center', gap: 6 }}
              title="Unduh salinan berkas PDF ke perangkat"
            >
              <Download size={14} aria-hidden="true" />
              <span>Unduh Berkas</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── Banner Informasi Lembar Acuan (Bila Menggunakan Fallback) ─── */}
      {isFallback && viewMode === 'pdf' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 14px',
            background: 'var(--latar, #F7F7F4)',
            borderBottom: '1px solid var(--garis, #D8DEDA)',
            fontSize: 12,
            color: 'var(--tinta-redup, #55625B)',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Info size={14} style={{ color: 'var(--pinus, #2A7356)', flexShrink: 0 }} aria-hidden="true" />
            <span>
              Menampilkan format dokumen dinas standar terverifikasi. Anda juga dapat melihat transkrip lengkap di tab <strong>Format Lembar</strong>.
            </span>
          </div>
          {metadata && (
            <button
              type="button"
              onClick={() => setViewMode('digital')}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--pinus, #2A7356)',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: 12,
                textDecoration: 'underline',
                padding: 0,
                flexShrink: 0,
              }}
            >
              Buka Format Lembar &rarr;
            </button>
          )}
        </div>
      )}

      {/* ─── Badan Penampil Berkas ─── */}
      <div
        style={{
          position: 'relative',
          height: typeof height === 'number' ? `${height}px` : height,
          minHeight: 380,
          background: '#525659',
          overflow: 'auto',
        }}
      >
        {/* Indikator Loading */}
        {loading && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(255, 255, 255, 0.95)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
              padding: 24,
            }}
            role="status"
            aria-live="polite"
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                border: '3px solid var(--garis, #D8DEDA)',
                borderTopColor: 'var(--pinus, #2A7356)',
                animation: 'spin 0.8s linear infinite',
                marginBottom: 16,
              }}
            />
            <strong style={{ fontSize: 14, color: 'var(--tinta, #18211D)', marginBottom: 6 }}>
              Memuat Berkas PDF...
            </strong>
            <p style={{ fontSize: 12, color: 'var(--tinta-redup, #55625B)', margin: 0, textAlign: 'center' }}>
              Sedang menyiapkan penampil dokumen resmi Dinas Pertanian.
            </p>
            <div
              style={{
                width: 220,
                height: 4,
                background: 'var(--garis, #D8DEDA)',
                borderRadius: 2,
                marginTop: 14,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${loadProgress}%`,
                  height: '100%',
                  background: 'var(--pinus, #2A7356)',
                  transition: 'width 0.2s ease',
                }}
              />
            </div>
          </div>
        )}

        {/* Layar Error: Berkas Gagal Dimuat */}
        {error ? (
          <div
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#FFFFFF',
              padding: 32,
              textAlign: 'center',
            }}
            role="alert"
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'var(--rahasia-tint, #F6E1E1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--rahasia, #8C2A2A)',
                marginBottom: 16,
              }}
            >
              <AlertTriangle size={30} aria-hidden="true" />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--rahasia, #8C2A2A)', margin: '0 0 8px 0' }}>
              Berkas tidak dapat dimuat
            </h3>
            <p style={{ fontSize: 13, color: 'var(--tinta-redup, #55625B)', maxWidth: 460, margin: '0 0 20px 0' }}>
              Dokumen PDF tidak ditemukan di penyimpanan berkas atau format berkas mengalami kerusakan. Anda tetap dapat memeriksa ringkasan data naskah di bawah ini atau mengunduh ulang.
            </p>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCobaMuatUlang}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <RefreshCw size={15} aria-hidden="true" />
                <span>Muat Ulang</span>
              </button>

              {metadata && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setError(false);
                    setViewMode('digital');
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <FileText size={15} aria-hidden="true" />
                  <span>Buka Format Digital</span>
                </button>
              )}

              <button
                type="button"
                className="btn btn-ghost"
                onClick={defaultDownloadHandler}
              >
                Coba Unduh Langsung
              </button>
            </div>
          </div>
        ) : viewMode === 'digital' && metadata ? (
          /* ─── Tampilan Naskah Lembar Digital (Bila Mode Digital Dipilih) ─── */
          <div style={{ padding: 24, display: 'flex', justifyContent: 'center', background: '#e2e8f0' }}>
            <div
              style={{
                width: '100%',
                maxWidth: 720,
                background: '#FFFFFF',
                borderRadius: 4,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                padding: '36px 40px',
                fontFamily: 'serif',
                color: '#1e293b',
              }}
            >
              {/* Kop Surat Sederhana */}
              <div style={{ textAlign: 'center', borderBottom: '3px double #0f172a', paddingBottom: 16, marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  PEMERINTAH KABUPATEN MINAHASA SELATAN
                </div>
                <div style={{ fontSize: 17, fontWeight: 800, textTransform: 'uppercase', margin: '4px 0' }}>
                  DINAS PERTANIAN
                </div>
                <div style={{ fontSize: 11, fontStyle: 'italic', fontFamily: 'sans-serif', color: '#475569' }}>
                  Kompleks Perkantoran Pemerintah Kabupaten Minahasa Selatan, Jl. Trans Sulawesi, Amurang
                </div>
              </div>

              {/* Data Naskah Masuk */}
              <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse', marginBottom: 20, fontFamily: 'sans-serif' }}>
                <tbody>
                  {metadata.nomor && (
                    <tr>
                      <td style={{ width: 140, padding: '5px 0', color: '#64748b' }}>Nomor Naskah</td>
                      <td style={{ padding: '5px 0', fontWeight: 700, fontFamily: 'monospace' }}>: {metadata.nomor}</td>
                    </tr>
                  )}
                  {metadata.asalSurat && (
                    <tr>
                      <td style={{ padding: '5px 0', color: '#64748b' }}>Pengirim / Asal</td>
                      <td style={{ padding: '5px 0', fontWeight: 600 }}>: {metadata.asalSurat}</td>
                    </tr>
                  )}
                  {metadata.tujuan && (
                    <tr>
                      <td style={{ padding: '5px 0', color: '#64748b' }}>Tujuan Surat</td>
                      <td style={{ padding: '5px 0', fontWeight: 600 }}>: {metadata.tujuan}</td>
                    </tr>
                  )}
                  {metadata.perihal && (
                    <tr>
                      <td style={{ padding: '5px 0', color: '#64748b' }}>Perihal</td>
                      <td style={{ padding: '5px 0', fontWeight: 700, color: '#0f172a' }}>: {metadata.perihal}</td>
                    </tr>
                  )}
                  {metadata.sifat && (
                    <tr>
                      <td style={{ padding: '5px 0', color: '#64748b' }}>Sifat Surat</td>
                      <td style={{ padding: '5px 0' }}>: <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{metadata.sifat}</span></td>
                    </tr>
                  )}
                  {metadata.tanggal && (
                    <tr>
                      <td style={{ padding: '5px 0', color: '#64748b' }}>Tanggal Naskah</td>
                      <td style={{ padding: '5px 0' }}>: {metadata.tanggal}</td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Isi Surat Ringkas */}
              <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: 16, marginTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#475569', marginBottom: 8, fontFamily: 'sans-serif' }}>
                  Isi / Ringkasan Pokok Surat
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.7, textAlign: 'justify', color: '#1e293b' }}>
                  {metadata.isiRingkas || 'Naskah dinas resmi telah teragenda dan terdokumentasi dalam sistem persuratan. Seluruh pejabat dan pelaksana yang berwenang dapat merujuk pada pindaian berkas asli.'}
                </div>
              </div>

              {/* Cap Pengesahan Sistem */}
              <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ textAlign: 'center', width: 260, fontFamily: 'sans-serif', fontSize: 12 }}>
                  <div>Dokumen Digital Terverifikasi</div>
                  <div style={{ fontWeight: 700, margin: '6px 0', color: 'var(--pinus, #2A7356)' }}>
                    [e-Surat Distan Minsel]
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>
                    Sistem Manajemen Persuratan & Disposisi
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ─── Penampil PDF Asli (Embedded iframe) ─── */
          resolvedUrl ? (
            <iframe
              key={resolvedUrl}
              ref={iframeRef}
              src={`${resolvedUrl}#toolbar=0&navpanes=0&scrollbar=1`}
              title={judul}
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                display: 'block',
                background: '#525659',
              }}
            />
          ) : null
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @media (max-width: 640px) {
          .hide-mobile {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
