'use client';

import React, { useState } from 'react';
import {
  FileText, Printer, Download, Eye, CheckCircle2, Shield,
  Stamp, PenLine, AlertCircle, FileCheck
} from 'lucide-react';
import { SuratKeluar, PersetujuanSuratKeluar, User, JenisSurat, KlasifikasiSurat } from '@/lib/types';
import { getTemplateNaskah } from '@/lib/templates';

interface KonsepSuratPreviewProps {
  surat: SuratKeluar;
  jenisSurat?: JenisSurat;
  klasifikasi?: KlasifikasiSurat;
  penyusun?: User;
  persetujuanList?: PersetujuanSuratKeluar[];
  getUser?: (id: string) => User | undefined;
  /** Tampilkan tombol cetak dan unduh di toolbar */
  showToolbar?: boolean;
}

export function KonsepSuratPreview({
  surat,
  jenisSurat,
  klasifikasi,
  penyusun,
  persetujuanList = [],
  getUser,
  showToolbar = true,
}: KonsepSuratPreviewProps) {
  const [mode, setMode] = useState<'surat_jadi' | 'data_mentah'>('surat_jadi');

  const parafSekdis = persetujuanList.find((p) => p.jenis === 'paraf_koordinasi');
  const ttdKadis = persetujuanList.find((p) => p.jenis === 'tanda_tangan');

  const sudahTtd = surat.status === 'ditandatangani' || surat.status === 'nomor_diterbitkan' || surat.status === 'terkirim' || !!ttdKadis;
  const sudahParaf = !!parafSekdis || sudahTtd;

  const tanggalFormatted = React.useMemo(() => {
    const d = surat.createdAt ? new Date(surat.createdAt) : new Date();
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, [surat.createdAt]);

  const sifatText = (surat as any).sifat
    ? String((surat as any).sifat).replace('_', ' ')
    : 'Biasa';

  const jenisNama = jenisSurat?.nama || 'Pemberitahuan';

  const handleCetak = () => {
    window.print();
  };

  const handleDownloadDraf = () => {
    const textContent = getTemplateNaskah(jenisNama, {
      perihal: surat.perihal,
      tujuan: surat.tujuan,
      nomorSurat: surat.nomorSurat || '[DRAF-NOMOR-BELUM-TERBIT]',
    });

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Konsep_Surat_Keluar_${(surat.nomorSurat || 'DRAF').replace(/[^a-zA-Z0-9_-]/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="konsep-surat-preview-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 'var(--border-radius-lg, 6px)',
        border: '1px solid var(--garis, #D8DEDA)',
        background: 'var(--permukaan, #FFFFFF)',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}
    >
      {/* ─── Toolbar Pratinjau ─── */}
      {showToolbar && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 16px',
            background: 'var(--latar, #F3F5F4)',
            borderBottom: '1px solid var(--garis, #D8DEDA)',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={18} style={{ color: 'var(--pinus, #2A7356)' }} aria-hidden="true" />
            <strong style={{ fontSize: 13, color: 'var(--tinta, #18211D)' }}>
              Pratinjau Format Naskah Dinas Resmi
            </strong>
            <span
              className={`chip ${sudahTtd ? 'chip-sukses' : sudahParaf ? 'chip-info' : 'chip-segera'}`}
              style={{ fontSize: 11, padding: '2px 8px', fontWeight: 600 }}
            >
              {sudahTtd ? 'Disahkan (TTD)' : sudahParaf ? 'Telah Diparaf' : 'Konsep Draf'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Toggle Mode */}
            <button
              type="button"
              className={`btn btn-sm ${mode === 'surat_jadi' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setMode('surat_jadi')}
              style={{ fontSize: 12, minHeight: 32 }}
              title="Tampilkan naskah dinas dalam format surat utuh"
            >
              <Eye size={14} aria-hidden="true" />
              <span>Format Surat Jadi</span>
            </button>

            <button
              type="button"
              className={`btn btn-sm ${mode === 'data_mentah' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setMode('data_mentah')}
              style={{ fontSize: 12, minHeight: 32 }}
              title="Tampilkan data isian field secara terpisah"
            >
              <FileCheck size={14} aria-hidden="true" />
              <span>Data Isian</span>
            </button>

            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={handleCetak}
              style={{ fontSize: 12, minHeight: 32 }}
              title="Cetak lembar pratinjau surat"
            >
              <Printer size={14} aria-hidden="true" />
              <span>Cetak</span>
            </button>

            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={handleDownloadDraf}
              style={{ fontSize: 12, minHeight: 32 }}
              title="Unduh draf teks konsep naskah dinas"
            >
              <Download size={14} aria-hidden="true" />
              <span>Unduh Draf</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── Konten Pratinjau ─── */}
      {mode === 'data_mentah' ? (
        /* Mode Tabel Field Mentah */
        <div style={{ padding: 20 }}>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <tbody>
              {[
                ['Nomor Surat', surat.nomorSurat ? surat.nomorSurat : 'Belum diterbitkan (otomatis oleh sistem)'],
                ['Perihal', surat.perihal],
                ['Tujuan', surat.tujuan],
                ['Jenis Surat', jenisNama],
                ['Klasifikasi', klasifikasi ? `${klasifikasi.kode} — ${klasifikasi.nama}` : '—'],
                ['Sifat Surat', sifatText],
                ['Penyusun', penyusun?.nama || '—'],
                ['Isi Ringkas', surat.isiRingkas || '—'],
              ].map(([label, val]) => (
                <tr key={String(label)} style={{ borderBottom: '1px solid var(--garis, #D8DEDA)' }}>
                  <td style={{ padding: '8px 0', color: 'var(--tinta-redup, #55625B)', width: '32%', fontSize: 12 }}>{label}</td>
                  <td style={{ padding: '8px 0', fontWeight: 500 }}>{val}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Mode Format Surat Jadi Resmi (Naskah Dinas) */
        <div
          style={{
            padding: '24px 20px',
            background: 'var(--latar, #F3F5F4)',
            display: 'flex',
            justifyContent: 'center',
            overflowX: 'auto',
          }}
        >
          {/* Lembar Surat A4 Resmi */}
          <div
            className="lembar-surat-resmi"
            style={{
              width: '100%',
              maxWidth: 760,
              background: '#FFFFFF',
              borderRadius: 4,
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
              padding: '48px 52px',
              color: '#0f172a',
              fontFamily: '"Times New Roman", Times, Georgia, serif',
              position: 'relative',
              lineHeight: 1.6,
            }}
          >
            {/* Cap Air Draf (Bila Belum Ditandatangani) */}
            {!sudahTtd && (
              <div
                style={{
                  position: 'absolute',
                  top: '45%',
                  left: '50%',
                  transform: 'translate(-50%, -50%) rotate(-30deg)',
                  fontSize: 38,
                  fontWeight: 900,
                  color: 'rgba(230, 176, 68, 0.18)',
                  border: '4px dashed rgba(230, 176, 68, 0.28)',
                  padding: '12px 32px',
                  borderRadius: 8,
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  fontFamily: 'sans-serif',
                  userSelect: 'none',
                }}
              >
                KONSEP DRAF SURAT
              </div>
            )}

            {/* Kop Surat Resmi */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '80px 1fr',
                gap: 16,
                alignItems: 'center',
                borderBottom: '3px double #0f172a',
                paddingBottom: 16,
                marginBottom: 24,
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <img
                  src="/logo.png"
                  alt="Lambang Pemkab Minahasa Selatan"
                  style={{ width: 72, height: 'auto', display: 'block', margin: '0 auto' }}
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <div style={{ textAlign: 'center', fontFamily: 'sans-serif' }}>
                <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  PEMERINTAH KABUPATEN MINAHASA SELATAN
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, textTransform: 'uppercase', margin: '3px 0' }}>
                  DINAS PERTANIAN
                </div>
                <div style={{ fontSize: 11, color: '#475569' }}>
                  Kompleks Perkantoran Pemerintah Kabupaten Minahasa Selatan, Jl. Trans Sulawesi, Kel. Pondang, Kec. Amurang Timur
                </div>
                <div style={{ fontSize: 11, color: '#475569' }}>
                  Telepon / Fax : (0430) 22589 | Pos-el : distan@minahasaselatan.go.id
                </div>
              </div>
            </div>

            {/* Tempat & Tanggal (Kanan Atas) */}
            <div style={{ textAlign: 'right', marginBottom: 16, fontSize: 14 }}>
              Amurang, {tanggalFormatted}
            </div>

            {/* Baris Identitas Surat (Nomor, Sifat, Lampiran, Hal) & Tujuan */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24, fontSize: 14 }}>
              {/* Sisi Kiri: Metadata Surat */}
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ width: 80, verticalAlign: 'top', paddingBottom: 4 }}>Nomor</td>
                    <td style={{ width: 12, verticalAlign: 'top', paddingBottom: 4 }}>:</td>
                    <td style={{ verticalAlign: 'top', paddingBottom: 4, fontWeight: 700 }}>
                      {surat.nomorSurat ? (
                        <span style={{ fontFamily: 'monospace' }}>{surat.nomorSurat}</span>
                      ) : (
                        <span style={{ color: '#d97706', fontStyle: 'italic', fontFamily: 'sans-serif', fontSize: 12 }}>
                          [Nomor otomatis saat penerbitan]
                        </span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ verticalAlign: 'top', paddingBottom: 4 }}>Sifat</td>
                    <td style={{ verticalAlign: 'top', paddingBottom: 4 }}>:</td>
                    <td style={{ verticalAlign: 'top', paddingBottom: 4, textTransform: 'capitalize' }}>
                      {sifatText}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ verticalAlign: 'top', paddingBottom: 4 }}>Lampiran</td>
                    <td style={{ verticalAlign: 'top', paddingBottom: 4 }}>:</td>
                    <td style={{ verticalAlign: 'top', paddingBottom: 4 }}>-</td>
                  </tr>
                  <tr>
                    <td style={{ verticalAlign: 'top', paddingBottom: 4 }}>Hal</td>
                    <td style={{ verticalAlign: 'top', paddingBottom: 4 }}>:</td>
                    <td style={{ verticalAlign: 'top', paddingBottom: 4, fontWeight: 700 }}>
                      {surat.perihal}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Sisi Kanan: Alamat Tujuan */}
              <div>
                <div>Kepada Yth.</div>
                <div style={{ fontWeight: 700, margin: '2px 0' }}>{surat.tujuan}</div>
                <div>di -</div>
                <div style={{ paddingLeft: 20 }}>Tempat</div>
              </div>
            </div>

            {/* Salam Pembuka */}
            <div style={{ marginBottom: 14, fontSize: 14 }}>
              Dengan hormat,
            </div>

            {/* Paragraf Pembuka */}
            <div style={{ marginBottom: 14, textIndent: 36, textAlign: 'justify', fontSize: 14 }}>
              Sehubungan dengan pelaksanaan tugas kedinasan pada Dinas Pertanian Kabupaten Minahasa Selatan Tahun Anggaran 2026, bersama ini kami sampaikan {jenisNama.toLowerCase()} mengenai hal tersebut di atas sebagai berikut:
            </div>

            {/* Isi Ringkas Naskah Dinas */}
            <div
              style={{
                marginBottom: 16,
                padding: '14px 18px',
                background: '#fafafa',
                borderLeft: '3px solid var(--pinus, #2A7356)',
                borderRadius: '0 4px 4px 0',
                fontSize: 14,
                lineHeight: 1.7,
                textAlign: 'justify',
              }}
            >
              {surat.isiRingkas || 'Uraian pokok naskah dinas disusun oleh unit pemrakarsa dan diverifikasi sebelum penandatanganan resmi.'}
            </div>

            {/* Paragraf Penutup */}
            <div style={{ marginBottom: 36, textIndent: 36, textAlign: 'justify', fontSize: 14 }}>
              Demikian surat ini kami sampaikan untuk menjadi perhatian dan dapat dipergunakan sebagaimana mestinya. Atas perhatian dan kerja sama yang baik, diucapkan terima kasih.
            </div>

            {/* ─── Blok Pengesahan & Paraf Koordinasi (Tahap 3: Visual Signature & Paraf) ─── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'flex-start', marginTop: 24 }}>
              {/* Kolom Kiri: Catatan Paraf Koordinasi Sekretaris Dinas */}
              <div>
                {sudahParaf && (
                  <div
                    style={{
                      border: '1px solid var(--pinus, #2A7356)',
                      background: 'var(--pinus-tint, #E6EFEA)',
                      borderRadius: 8,
                      padding: '12px 14px',
                      fontSize: 12,
                      fontFamily: 'sans-serif',
                      color: 'var(--pinus-dark, #215D45)',
                      display: 'inline-block',
                      maxWidth: 290,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, marginBottom: 6 }}>
                      <CheckCircle2 size={15} style={{ color: 'var(--pinus, #2A7356)' }} aria-hidden="true" />
                      <span style={{ fontSize: 11, letterSpacing: '0.03em' }}>PARAF KOORDINASI ELEKTRONIK</span>
                    </div>

                    {/* Gambar Paraf Asli Pejabat */}
                    <div style={{ height: 48, display: 'flex', alignItems: 'center', margin: '4px 0', background: 'rgba(255,255,255,0.7)', borderRadius: 4, padding: '2px 8px' }}>
                      <img
                        src={surat.parafImageUrl || parafSekdis?.urlTandaTanganSnapshot || '/docs/ttd-sekdis.svg'}
                        alt="Paraf Koordinasi Sekretaris Dinas"
                        style={{ maxHeight: 44, maxWidth: 140, objectFit: 'contain' }}
                      />
                    </div>

                    <div style={{ fontSize: 11, color: '#55625B', marginTop: 4 }}>Sekretaris Dinas:</div>
                    <div style={{ fontWeight: 700, fontSize: 12 }}>
                      {surat.parafNamaSnapshot || (parafSekdis && getUser ? getUser(parafSekdis.pelakuId)?.nama : 'Dr. Ir. Ventje Rantung, M.Si')}
                    </div>
                    <div style={{ fontSize: 10, color: '#55625B', marginTop: 2 }}>
                      Waktu:{' '}
                      {parafSekdis?.waktu
                        ? new Date(parafSekdis.waktu).toLocaleString('id-ID')
                        : surat.parafWaktuSnapshot
                        ? new Date(surat.parafWaktuSnapshot).toLocaleString('id-ID')
                        : new Date().toLocaleString('id-ID')}
                    </div>
                  </div>
                )}
              </div>

              {/* Kolom Kanan: Tanda Tangan Kepala Dinas */}
              <div style={{ textAlign: 'center', fontFamily: 'sans-serif' }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>
                  KEPALA DINAS PERTANIAN
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                  KABUPATEN MINAHASA SELATAN
                </div>

                {/* Area Gambar Tanda Tangan / Stempel Digital */}
                <div style={{ minHeight: 84, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', margin: '6px 0' }}>
                  {sudahTtd ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img
                          src={surat.ttdImageUrl || ttdKadis?.urlTandaTanganSnapshot || '/docs/ttd-kadis.svg'}
                          alt="Tanda Tangan Kepala Dinas"
                          style={{ maxHeight: 58, maxWidth: 180, objectFit: 'contain' }}
                        />
                      </div>
                      <div
                        style={{
                          border: '1px solid var(--pinus, #2A7356)',
                          borderRadius: 4,
                          padding: '2px 8px',
                          color: 'var(--pinus, #2A7356)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          background: 'rgba(230, 239, 234, 0.6)',
                          fontSize: 9,
                          fontWeight: 700,
                          letterSpacing: '0.05em',
                        }}
                      >
                        <Stamp size={12} style={{ color: 'var(--pinus, #2A7356)' }} aria-hidden="true" />
                        <span>DISAHKAN ELEKTRONIK</span>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        color: 'var(--tinta-redup, #55625B)',
                        fontSize: 12,
                        fontStyle: 'italic',
                        borderBottom: '1px dashed #94a3b8',
                        paddingBottom: 4,
                        paddingTop: 24,
                      }}
                    >
                      (Menunggu Tanda Tangan Kepala Dinas)
                    </div>
                  )}
                </div>

                <div style={{ fontSize: 14, fontWeight: 700, textDecoration: 'underline' }}>
                  {surat.ttdNamaSnapshot || 'Feybie F. Pusung, S.Pt, M.Si'}
                </div>
                <div style={{ fontSize: 12, color: '#475569' }}>
                  Pembina Utama Muda (IV/c)
                </div>
                <div style={{ fontSize: 12, color: '#475569' }}>
                  NIP. {surat.ttdNipSnapshot || '19740226 200003 2 002'}
                </div>
              </div>
            </div>

            {/* Tembusan Surat */}
            <div style={{ marginTop: 32, borderTop: '1px solid #cbd5e1', paddingTop: 12, fontSize: 12, fontFamily: 'sans-serif' }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Tembusan disampaikan kepada Yth. :</div>
              <ol style={{ margin: 0, paddingLeft: 18, color: '#334155' }}>
                <li>Bupati Minahasa Selatan (sebagai laporan)</li>
                <li>Sekretaris Daerah Kabupaten Minahasa Selatan</li>
                <li>Arsip Digital Dinas Pertanian</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
