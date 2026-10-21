'use client';
import React, { use, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useStore } from '@/lib/store';
import { useBusinessLogic } from '@/lib/api';
import { STATUS_SURAT_KELUAR_LABELS, SIFAT_SURAT_LABELS } from '@/lib/types';
import { hasPermission } from '@/lib/rbac';
import { ChipStatus } from '@/components/ui';
import { ModalStandar } from '@/components/ui';
import {
  ArrowLeft, CheckCircle2, FileText, Send, AlertCircle, Upload, X, Eye,
  Hash, Stamp, Truck, Archive, Info, Lock, ExternalLink, PenTool
} from 'lucide-react';


const STEPS = [
  { key: 'draf',             label: 'Draf' },
  { key: 'menunggu_paraf',   label: 'Menunggu Paraf' },
  { key: 'menunggu_ttd',     label: 'Menunggu TTD' },
  { key: 'ditandatangani',   label: 'Ditandatangani' },
  { key: 'terkirim',         label: 'Terkirim' },
];

function StepBar({ status }: { status: string }) {
  const normalized = status === 'perlu_revisi' ? 'menunggu_paraf'
    : status === 'nomor_diterbitkan' ? 'ditandatangani'
    : status;
  const cur = STEPS.findIndex((s) => s.key === normalized);
  return (
    <div className="sk-stepbar">
      {STEPS.map((s, i) => {
        const done   = i < cur;
        const active = i === cur;
        return (
          <React.Fragment key={s.key}>
            <div className={`sk-step ${done ? 'sk-step-done' : active ? 'sk-step-active' : ''}`}>
              <div className="sk-step-dot">{done ? '✓' : i + 1}</div>
              <div className="sk-step-label">{s.label}</div>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`sk-step-line ${done ? 'sk-step-line-done' : ''}`} />
            )}
          </React.Fragment>
        );
      })}
      <div className="sk-step-arsip">
        <Archive size={13} aria-hidden="true" />
        <span style={{ fontSize: 11, color: 'var(--pinus)' }}>Arsip otomatis</span>
      </div>
    </div>
  );
}

export default function SuratKeluarDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { state, getUser, getKlasifikasi, getJenisSurat } = useStore();
  const {
    apiTerbitkanNomorSurat,
    apiDokumentasikanDanKirimSuratKeluar,
    apiParafKoordinasi,
    apiTandatanganSurat,
    apiTolakSuratKeluar,
    apiAjukanSuratKeluar,
  } = useBusinessLogic();

  const user = state.currentUser;
  const surat = state.suratKeluar.find((s) => s.id === id);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [errorMsg, setErrorMsg]     = useState('');
  const [showKonfirmasi, setKonfirmasi] = useState(false);

  // Form pengiriman
  const [tujuanAlamat, setTujuanAlamat] = useState('');
  const [tanggalKirim, setTanggalKirim] = useState(new Date().toISOString().slice(0, 10));
  const [keterangan, setKeterangan]     = useState('');
  const [fileFinal, setFileFinal]       = useState<File | null>(null);
  const [pdfUrl, setPdfUrl]             = useState<string | null>(null);
  const [pdfError, setPdfError]         = useState('');

  // Paraf & TTD (role Sekretaris / Kepala Dinas)
  const [catatanRevisi, setCatatanRevisi]   = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showModalTolak, setModalTolak]     = useState(false);
  const [showModalTtd, setModalTtd]         = useState(false);
  const [isBusy, setIsBusy]                 = useState(false);

  // ── Handler PDF ─────────────────────────────────────────────
  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setPdfError('');
    if (!f) return;
    if (f.type !== 'application/pdf' && !f.name.endsWith('.pdf')) {
      setPdfError('Berkas harus berformat PDF.');
      e.target.value = '';
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setPdfError('Ukuran berkas melebihi 10 MB.');
      e.target.value = '';
      return;
    }
    setFileFinal(f);
    setPdfUrl(URL.createObjectURL(f));
  }, []);

  if (!surat) {
    return (
      <DashboardLayout>
        <div className="empty-state" style={{ padding: '60px 24px' }}>
          <AlertCircle size={40} aria-hidden="true" />
          <h3>Surat tidak ditemukan</h3>
          <Link href="/surat-keluar" className="btn btn-ghost" style={{ marginTop: 12 }}>Kembali</Link>
        </div>
      </DashboardLayout>
    );
  }

  const klasifikasi  = getKlasifikasi(surat.klasifikasiId);
  const jenis        = getJenisSurat(surat.jenisSuratId || '');
  const penyusun     = getUser(surat.penyusunId);
  const persetujuan  = state.persetujuan.filter((p) => p.suratKeluarId === surat.id).sort((a, b) => new Date(a.waktu).getTime() - new Date(b.waktu).getTime());
  const riwayat      = state.riwayat.filter((r) => r.suratKeluarId === surat.id).sort((a, b) => new Date(b.waktu).getTime() - new Date(a.waktu).getTime());

  const isPetugas  = user?.role === 'petugas_surat' || user?.role === 'admin';
  const isSekdis   = user?.role === 'sekretaris';
  const isKadis    = user?.role === 'kepala_dinas';

  // Apakah stepper aktif (hanya saat ditandatangani — Petugas)
  const stepperAktif = isPetugas && (surat.status === 'ditandatangani' || surat.status === 'nomor_diterbitkan');
  const sudahNomor   = !!surat.nomorSurat;
  const sudahKirim   = surat.status === 'terkirim';

  // Berkas final wajib sebelum Tandai Terkirim
  const kirimLengkap = !!fileFinal && !pdfError && tanggalKirim !== '';

  const hapusPdf = () => { setFileFinal(null); setPdfUrl(null); setPdfError(''); if (fileInputRef.current) fileInputRef.current.value = ''; };

  // ── Handler: Terbitkan Nomor ─────────────────────────────────
  const handleTerbitkan = () => {
    setErrorMsg('');
    try { apiTerbitkanNomorSurat(surat.id); } catch (e: any) { setErrorMsg(e.message); }
  };

  // ── Handler: Tandai Terkirim ─────────────────────────────────
  const handleKirim = () => {
    setErrorMsg('');
    setIsBusy(true);
    try {
      apiDokumentasikanDanKirimSuratKeluar(surat.id, tanggalKirim, fileFinal);
      setKonfirmasi(false);
    } catch (e: any) { setErrorMsg(e.message); }
    finally { setIsBusy(false); }
  };

  // ── Handler: Paraf Sekretaris ────────────────────────────────
  const handleParaf = () => {
    setErrorMsg('');
    try { apiParafKoordinasi(surat.id, true, ''); } catch (e: any) { setErrorMsg(e.message); }
  };

  // ── Handler: TTD Kepala Dinas ────────────────────────────────
  const handleTtd = () => {
    setErrorMsg('');
    try { apiTandatanganSurat(surat.id, passwordConfirm); setModalTtd(false); } catch (e: any) { setErrorMsg(e.message); }
  };

  // ── Handler: Tolak / Kembalikan ─────────────────────────────
  const handleTolak = () => {
    setErrorMsg('');
    try {
      if (surat.status === 'menunggu_ttd') apiTolakSuratKeluar(surat.id, catatanRevisi);
      else apiParafKoordinasi(surat.id, false, catatanRevisi);
      setModalTolak(false);
    } catch (e: any) { setErrorMsg(e.message); }
  };

  return (
    <DashboardLayout>
      <div className="animate-fadeIn" style={{ maxWidth: 880, margin: '0 auto', paddingBottom: 48 }}>

        {/* Nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <Link href="/surat-keluar" className="btn btn-ghost btn-sm">
            <ArrowLeft size={16} aria-hidden="true" /> Kembali
          </Link>
          <ChipStatus jenis="suratKeluar" status={surat.status} />
        </div>

        {/* ── Stepper ──────────────────────────────────────── */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-body" style={{ padding: '20px 24px' }}>
            <StepBar status={surat.status} />
          </div>
        </div>

        {/* ── Banner Terkirim ───────────────────────────────── */}
        {sudahKirim && (
          <div className="disp-banner-sukses" id="banner-sk-terkirim" style={{ marginBottom: 20 }}>
            <CheckCircle2 size={22} aria-hidden="true" />
            <div>
              <strong>Surat terkirim. Arsip dibuat otomatis.</strong>
              <p style={{ margin: '4px 0 0', fontSize: 13 }}>
                Nomor: <code style={{ fontFamily: 'monospace' }}>{surat.nomorSurat}</code>
              </p>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexShrink: 0 }}>
              <Link href="/arsip" className="btn btn-sm btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Archive size={13} aria-hidden="true" /> Lihat Arsip
              </Link>
              <Link href={`/surat-keluar/${surat.id}/bukti-terima`} className="btn btn-sm btn-primary">
                Bukti Terima
              </Link>
            </div>
          </div>
        )}

        {/* ── Error ────────────────────────────────────────── */}
        {errorMsg && (
          <div className="modal-error" role="alert" style={{ marginBottom: 16 }}>
            <AlertCircle size={15} aria-hidden="true" /> {errorMsg}
            <button style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }} onClick={() => setErrorMsg('')}>✕</button>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          {/* ─── Info Surat ─────────────────────────────── */}
          <div className="card">
            <div className="card-header"><h2 style={{ fontSize: 14 }}>Data Surat Keluar</h2></div>
            <div className="card-body">
              <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                <tbody>
                  {[
                    ['Nomor Surat', surat.nomorSurat
                      ? <code style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--pinus)' }}>{surat.nomorSurat}</code>
                      : <span style={{ color: 'var(--tinta-redup)' }}>— Belum terbit —</span>],
                    ['Perihal', surat.perihal],
                    ['Tujuan', surat.tujuan],
                    ['Jenis', jenis?.nama || '—'],
                    ['Klasifikasi', klasifikasi ? `${klasifikasi.kode} — ${klasifikasi.nama}` : '—'],
                    ['Penyusun', penyusun?.nama || '—'],
                    ['Tanggal Kirim', surat.tanggalKirim ? new Date(surat.tanggalKirim).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'],
                  ].map(([label, val]) => (
                    <tr key={String(label)} style={{ borderBottom: '1px solid var(--garis)' }}>
                      <td style={{ padding: '7px 0', color: 'var(--tinta-redup)', width: '38%' }}>{label}</td>
                      <td style={{ padding: '7px 0', fontWeight: 500 }}>{val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ─── Riwayat Persetujuan ─────────────────────── */}
          <div className="card">
            <div className="card-header"><h2 style={{ fontSize: 14 }}>Riwayat Persetujuan</h2></div>
            <div className="card-body" style={{ padding: 0 }}>
              {persetujuan.length === 0 ? (
                <p style={{ padding: '16px 20px', color: 'var(--tinta-redup)', fontSize: 13 }}>Belum ada riwayat persetujuan.</p>
              ) : (
                <table className="data-table">
                  <tbody>
                    {persetujuan.map((p) => {
                      const pel = getUser(p.pelakuId);
                      return (
                        <tr key={p.id}>
                          <td>
                            <div style={{ fontWeight: 500, fontSize: 13 }}>{pel?.nama}</div>
                            <div style={{ fontSize: 11, color: 'var(--tinta-redup)' }}>{pel?.jabatan || pel?.role}</div>
                          </td>
                          <td>
                            <span className={`chip ${
                              p.jenis === 'paraf_koordinasi' || p.jenis === 'tanda_tangan' ? 'chip-sukses'
                              : p.jenis === 'dikembalikan' ? 'chip-bahaya'
                              : 'chip-netral'
                            }`} style={{ fontSize: 11 }}>
                              {p.jenis === 'paraf_koordinasi' ? 'Paraf' : p.jenis === 'tanda_tangan' ? 'Ditandatangani' : p.jenis}
                            </span>
                          </td>
                          <td style={{ fontSize: 11, color: 'var(--tinta-redup)', whiteSpace: 'nowrap' }}>
                            {new Date(p.waktu).toLocaleDateString('id-ID')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* ─── L32 Panel Kepala Dinas: Tinjauan & TTD ──────── */}
        {isKadis && surat.status === 'menunggu_ttd' && (
          <div className="card" style={{ marginTop: 24 }} id="panel-kadis-l32">
            <div className="card-header" style={{ background: 'var(--pinus-tint)', borderBottom: '2px solid var(--pinus)' }}>
              <h2 style={{ fontSize: 14, color: 'var(--pinus)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <PenTool size={16} aria-hidden="true" /> Persetujuan Kepala Dinas — Tanda Tangan
              </h2>
            </div>
            <div className="card-body">

              {/* Konsep hanya baca */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tinta-redup)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
                  Konsep Surat (Hanya Baca)
                </div>
                <div style={{ background: 'var(--latar)', borderRadius: 'var(--border-radius)', padding: '14px 18px', border: '1px solid var(--garis)' }}>
                  <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                    <tbody>
                      {[
                        ['Perihal', surat.perihal],
                        ['Tujuan', surat.tujuan],
                        ['Jenis Surat', jenis?.nama || '—'],
                        ['Klasifikasi', klasifikasi ? `${klasifikasi.kode} — ${klasifikasi.nama}` : '—'],
                        ['Sifat', (surat as any).sifat ? String((surat as any).sifat).replace('_', ' ') : 'Biasa'],
                        ['Isi Ringkas', surat.isiRingkas || '—'],
                      ].map(([label, val]) => (
                        <tr key={String(label)} style={{ borderBottom: '1px solid var(--garis)' }}>
                          <td style={{ padding: '7px 0', color: 'var(--tinta-redup)', width: '36%', fontSize: 12 }}>{label}</td>
                          <td style={{ padding: '7px 0', fontWeight: 500 }}>{val}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tautan surat masuk asal (bila balasan) */}
              {surat.suratMasukAsalId && (() => {
                const sm = state.suratMasuk.find((s) => s.id === surat.suratMasukAsalId);
                return sm ? (
                  <div className="admin-info-box" style={{ marginBottom: 20 }}>
                    <Info size={14} aria-hidden="true" />
                    <span>
                      Surat ini merupakan balasan atas{' '}
                      <Link href={`/surat-masuk/${sm.id}`} style={{ fontWeight: 700, color: 'var(--pinus)', textDecoration: 'underline' }}>
                        surat masuk {sm.nomorAgenda} — {sm.perihal}
                      </Link>
                    </span>
                  </div>
                ) : null;
              })()}

              {/* Riwayat Persetujuan: Pengaju + Paraf Sekretaris */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tinta-redup)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
                  Riwayat Persetujuan
                </div>
                {persetujuan.length === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--tinta-redup)' }}>Belum ada riwayat persetujuan.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {persetujuan.map((p) => {
                      const pel = getUser(p.pelakuId);
                      return (
                        <div key={p.id} style={{ padding: '12px 16px', borderRadius: 'var(--border-radius)', border: '1px solid var(--garis)', background: '#fff' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                            <span className={`chip ${p.jenis === 'paraf_koordinasi' || p.jenis === 'tanda_tangan' ? 'chip-sukses' : 'chip-bahaya'}`} style={{ fontSize: 11 }}>
                              {p.jenis === 'paraf_koordinasi' ? 'Paraf Sekretaris' : p.jenis === 'tanda_tangan' ? 'Tanda Tangan' : 'Dikembalikan'}
                            </span>
                            <span style={{ fontWeight: 600, fontSize: 13 }}>{pel?.nama}</span>
                            <span style={{ fontSize: 11, color: 'var(--tinta-redup)', marginLeft: 'auto' }}>
                              {new Date(p.waktu).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}{' '}
                              {new Date(p.waktu).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          {(p as any).catatan && (
                            <p style={{ margin: 0, fontSize: 12, color: 'var(--tinta-redup)', fontStyle: 'italic' }}>
                              &ldquo;{(p as any).catatan}&rdquo;
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Aksi Kepala Dinas */}
              {errorMsg && (
                <div className="modal-error" role="alert" style={{ marginBottom: 12 }}>
                  <AlertCircle size={14} aria-hidden="true" /> {errorMsg}
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button id="btn-ttd-l32" className="btn btn-primary" onClick={() => setModalTtd(true)}>
                  <CheckCircle2 size={15} aria-hidden="true" /> Tandatangani Surat
                </button>
                <button id="btn-kembalikan-l32" className="btn btn-ghost" onClick={() => setModalTolak(true)}>
                  Kembalikan dengan Catatan
                </button>
              </div>
              <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--tinta-redup)' }}>
                Tanda tangan di sistem bukan tanda tangan digital tersertifikasi. Setelah ditandatangani, status berubah ke <strong>Ditandatangani</strong> dan Petugas menerima notifikasi untuk penomoran.
              </p>
            </div>
          </div>
        )}

        {isPetugas && !sudahKirim && (
          <div className="card" style={{ marginTop: 24 }} id="panel-proses-petugas">
            <div className="card-header">
              <h2 style={{ fontSize: 14 }}>
                {stepperAktif ? 'Proses Penomoran & Pengiriman' : 'Menunggu Persetujuan'}
              </h2>
            </div>
            <div className="card-body">
              {!stepperAktif ? (
                <div className="admin-info-box">
                  <Lock size={15} aria-hidden="true" />
                  <span>
                    Stepper penomoran aktif setelah surat berstatus <strong>Ditandatangani</strong> oleh Kepala Dinas. Status saat ini: <strong>{STATUS_SURAT_KELUAR_LABELS[surat.status as keyof typeof STATUS_SURAT_KELUAR_LABELS] || surat.status}</strong>.
                  </span>
                </div>
              ) : (
                <div className="sk-proses-steps">

                  {/* Langkah 1: Terbitkan Nomor */}
                  <div className={`sk-proses-item ${sudahNomor ? 'sk-proses-done' : 'sk-proses-active'}`} id="step-terbitkan-nomor">
                    <div className="sk-proses-num">{sudahNomor ? '✓' : '1'}</div>
                    <div className="sk-proses-body">
                      <div className="sk-proses-judul">Terbitkan Nomor Surat</div>
                      {sudahNomor ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                          <code style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--pinus)', fontSize: 14 }}>{surat.nomorSurat}</code>
                          <span style={{ fontSize: 12, color: 'var(--tinta-redup)' }}>— Nomor telah terbit, tidak dapat diubah.</span>
                        </div>
                      ) : (
                        <div style={{ marginTop: 8 }}>
                          <button id="btn-terbitkan-nomor" className="btn btn-primary" onClick={handleTerbitkan}>
                            <Hash size={15} aria-hidden="true" /> Terbitkan Nomor Surat
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Langkah 2: Cetak & Cap (info di luar sistem K-7) */}
                  <div className={`sk-proses-item ${sudahNomor ? '' : 'sk-proses-locked'}`} id="step-cetak-cap">
                    <div className="sk-proses-num">2</div>
                    <div className="sk-proses-body">
                      <div className="sk-proses-judul">Cetak Surat & Bubuhkan Cap Dinas</div>
                      <div className="admin-info-box" style={{ marginTop: 8 }}>
                        <Info size={14} aria-hidden="true" />
                        <span>
                          Langkah ini dilakukan di luar sistem (K-7): cetak surat bernomor, bubuhkan cap/stempel dinas, lalu pindai kembali hasilnya sebelum mengunggah berkas final di langkah berikut.
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Langkah 3: Isi Pengiriman */}
                  <div className={`sk-proses-item ${sudahNomor ? '' : 'sk-proses-locked'}`} id="step-isi-pengiriman">
                    <div className="sk-proses-num">3</div>
                    <div className="sk-proses-body">
                      <div className="sk-proses-judul">Isi Data Pengiriman</div>
                      <div className="form-row" style={{ marginTop: 10 }}>
                        <div className="form-group">
                          <label className="form-label" htmlFor="tujuan-alamat">Alamat Tujuan</label>
                          <input id="tujuan-alamat" className="form-input" value={tujuanAlamat} onChange={(e) => setTujuanAlamat(e.target.value)} placeholder="Nama instansi dan alamat pengiriman" disabled={!sudahNomor} />
                        </div>
                        <div className="form-group">
                          <label className="form-label" htmlFor="tanggal-kirim">Tanggal Pengiriman <span className="required">*</span></label>
                          <input id="tanggal-kirim" className="form-input" type="date" value={tanggalKirim} onChange={(e) => setTanggalKirim(e.target.value)} disabled={!sudahNomor} />
                        </div>
                      </div>
                      <div className="form-group" style={{ marginTop: 4 }}>
                        <label className="form-label" htmlFor="keterangan-kirim">Keterangan</label>
                        <input id="keterangan-kirim" className="form-input" value={keterangan} onChange={(e) => setKeterangan(e.target.value)} placeholder="Melalui pos, kurir, atau diserahkan langsung" disabled={!sudahNomor} />
                      </div>
                    </div>
                  </div>

                  {/* Langkah 4: Unggah Berkas Final */}
                  <div className={`sk-proses-item ${sudahNomor ? '' : 'sk-proses-locked'}`} id="step-unggah-final">
                    <div className="sk-proses-num">4</div>
                    <div className="sk-proses-body">
                      <div className="sk-proses-judul">Unggah Berkas Final PDF <span className="required">*</span></div>
                      <p className="form-hint" style={{ marginBottom: 8 }}>Berkas hasil pindai surat bernomor dan berstempel. Maks. 10 MB, format PDF.</p>
                      {!pdfUrl ? (
                        <div
                          className={`unggah-pdf-drop${pdfError ? ' unggah-pdf-drop-error' : ''}${!sudahNomor ? ' unggah-pdf-disabled' : ''}`}
                          onClick={() => sudahNomor && fileInputRef.current?.click()}
                          role="button" tabIndex={sudahNomor ? 0 : -1}
                        >
                          <Upload size={18} aria-hidden="true" />
                          <span>Klik atau seret berkas PDF</span>
                          <span className="unggah-pdf-hint">PDF saja · maks. 10 MB</span>
                          <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" onChange={handleFileInput} hidden />
                        </div>
                      ) : (
                        <div className="unggah-pdf-filled">
                          <FileText size={16} aria-hidden="true" />
                          <span className="unggah-pdf-name">{fileFinal?.name}</span>
                          <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-ghost" title="Pratinjau"><Eye size={14} /></a>
                          <button type="button" className="btn btn-sm btn-ghost" onClick={hapusPdf} title="Hapus berkas"><X size={14} /></button>
                        </div>
                      )}
                      {pdfError && <p className="unggah-pdf-error" role="alert">{pdfError}</p>}
                    </div>
                  </div>

                  {/* Langkah 5: Tandai Terkirim */}
                  <div className={`sk-proses-item ${sudahNomor ? '' : 'sk-proses-locked'}`} id="step-tandai-kirim">
                    <div className="sk-proses-num">5</div>
                    <div className="sk-proses-body">
                      <div className="sk-proses-judul">Tandai Terkirim</div>
                      <div style={{ marginTop: 8, display: 'flex', gap: 10, alignItems: 'center' }}>
                        <button
                          id="btn-tandai-terkirim"
                          className="btn btn-primary"
                          disabled={!kirimLengkap || !sudahNomor}
                          onClick={() => setKonfirmasi(true)}
                        >
                          <Send size={15} aria-hidden="true" /> Tandai Terkirim
                        </button>
                        {!kirimLengkap && sudahNomor && (
                          <span style={{ fontSize: 12, color: 'var(--segera)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <AlertCircle size={13} aria-hidden="true" />
                            {!fileFinal ? 'Unggah berkas PDF final.' : 'Tanggal pengiriman wajib diisi.'}
                          </span>
                        )}
                      </div>
                      <p className="form-hint" style={{ marginTop: 6 }}>
                        Status tetap "Ditandatangani" selama berkas atau tanggal belum lengkap (AT-08).
                      </p>
                    </div>
                  </div>

                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── Panel Paraf / TTD (Sekretaris / Kepala Dinas) ── */}
        {(isSekdis && surat.status === 'menunggu_paraf') && (
          <div className="card" style={{ marginTop: 24 }} id="panel-paraf-sekdis">
            <div className="card-header"><h2 style={{ fontSize: 14 }}>Paraf Koordinasi — Sekretaris</h2></div>
            <div className="card-body" style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-primary" onClick={handleParaf}><CheckCircle2 size={15} aria-hidden="true" /> Berikan Paraf</button>
              <button className="btn btn-ghost" onClick={() => setModalTolak(true)}>Kembalikan</button>
            </div>
          </div>
        )}

        {(isKadis && surat.status === 'menunggu_ttd') && (
          <div className="card" style={{ marginTop: 24 }} id="panel-ttd-kadis">
            <div className="card-header"><h2 style={{ fontSize: 14 }}>Tanda Tangan Kepala Dinas</h2></div>
            <div className="card-body" style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-primary" onClick={() => setModalTtd(true)}><CheckCircle2 size={15} aria-hidden="true" /> Tanda Tangani</button>
              <button className="btn btn-ghost" onClick={() => setModalTolak(true)}>Kembalikan</button>
            </div>
          </div>
        )}

        {/* ─── Riwayat Status ──────────────────────────────── */}
        {riwayat.length > 0 && (
          <div className="card" style={{ marginTop: 24 }}>
            <div className="card-header"><h2 style={{ fontSize: 14 }}>Riwayat Status</h2></div>
            <div className="card-body" style={{ padding: 0 }}>
              <table className="data-table">
                <tbody>
                  {riwayat.map((r) => {
                    const pel = getUser(r.pelakuId);
                    return (
                      <tr key={r.id}>
                        <td style={{ whiteSpace: 'nowrap', fontSize: 12, color: 'var(--tinta-redup)' }}>
                          {new Date(r.waktu).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}<br />
                          {new Date(r.waktu).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ fontWeight: 600, fontSize: 13 }}>{r.status}</td>
                        <td style={{ fontSize: 12, color: 'var(--tinta-redup)' }}>{r.catatan}</td>
                        <td style={{ fontSize: 12 }}>{pel?.nama}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── Modal TTD ─────────────────────────────────────── */}
        {showModalTtd && (
          <div className="modal-overlay" onClick={() => setModalTtd(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
              <div className="modal-header">
                <h2>Konfirmasi Tanda Tangan</h2>
                <button className="modal-close" onClick={() => setModalTtd(false)}>✕</button>
              </div>
              <div className="modal-body">
                <p style={{ fontSize: 13, marginBottom: 14 }}>Masukkan kata sandi untuk mengkonfirmasi tanda tangan elektronik Anda.</p>
                <div className="form-group">
                  <label className="form-label" htmlFor="password-ttd">Kata Sandi</label>
                  <input id="password-ttd" className="form-input" type="password" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} autoFocus />
                </div>
                {errorMsg && <div className="modal-error" role="alert"><AlertCircle size={14} aria-hidden="true" /> {errorMsg}</div>}
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setModalTtd(false)}>Batal</button>
                <button className="btn btn-primary" onClick={handleTtd}>Tanda Tangani</button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Modal Tolak / Kembalikan ───────────────────────── */}
        {showModalTolak && (
          <div className="modal-overlay" onClick={() => setModalTolak(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
              <div className="modal-header">
                <h2>Kembalikan untuk Revisi</h2>
                <button className="modal-close" onClick={() => setModalTolak(false)}>✕</button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label" htmlFor="catatan-revisi">Catatan Revisi <span className="required">*</span></label>
                  <textarea id="catatan-revisi" className="form-input" rows={3} value={catatanRevisi} onChange={(e) => setCatatanRevisi(e.target.value)} placeholder="Jelaskan alasan pengembalian…" style={{ resize: 'vertical' }} />
                </div>
                {errorMsg && <div className="modal-error" role="alert"><AlertCircle size={14} aria-hidden="true" /> {errorMsg}</div>}
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setModalTolak(false)}>Batal</button>
                <button className="btn btn-danger" onClick={handleTolak} disabled={!catatanRevisi.trim()}>Kembalikan</button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Dialog Konfirmasi Kirim ────────────────────────── */}
        <ModalStandar
          open={showKonfirmasi}
          onClose={() => setKonfirmasi(false)}
          judul="Tandai Terkirim?"
          variant="konfirmasi"
          size="sm"
          footerSecondary={
            <button type="button" className="btn btn-ghost" onClick={() => setKonfirmasi(false)}>Batal</button>
          }
          footerPrimary={
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => { setKonfirmasi(false); handleKirim(); }}
            >
              Ya, Tandai Terkirim
            </button>
          }
        >
          <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0 }}>
            Surat keluar "{surat.perihal}" akan ditandai terkirim dan arsip digital dibuat otomatis. Tindakan ini tidak dapat dibatalkan.
          </p>
        </ModalStandar>
      </div>
    </DashboardLayout>
  );
}
