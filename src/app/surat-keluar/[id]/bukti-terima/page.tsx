'use client';
import React, { use, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useStore } from '@/lib/store';
import { useBusinessLogic } from '@/lib/api';
import { ArrowLeft, CheckCircle2, AlertCircle, Lock, ClipboardCheck } from 'lucide-react';

export default function BuktiTerimaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { state, getKlasifikasi } = useStore();
  const { apiBuktiTerima } = useBusinessLogic();

  const surat = state.suratKeluar.find((s) => s.id === id);

  const [tanggal, setTanggal]     = useState('');
  const [nama, setNama]           = useState('');
  const [errorMsg, setErrorMsg]   = useState('');
  const [saved, setSaved]         = useState(false);

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

  if (surat.status !== 'terkirim') {
    return (
      <DashboardLayout>
        <div style={{ maxWidth: 560, margin: '40px auto' }}>
          <div className="admin-banner-warning">
            <Lock size={18} aria-hidden="true" />
            <div>
              <strong>Form Terkunci</strong>
              <p style={{ margin: '4px 0 0', fontSize: 13 }}>
                Bukti terima hanya dapat diisi setelah surat berstatus <strong>Terkirim</strong>. Status saat ini: <strong>{surat.status}</strong>.
              </p>
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <Link href={`/surat-keluar/${surat.id}`} className="btn btn-ghost btn-sm">
              <ArrowLeft size={14} aria-hidden="true" /> Kembali ke Detail Surat
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const sudahAda = !!(surat as any).buktiTerimaNama;
  const riwayatBukti = state.riwayat.filter(
    (r) => r.suratKeluarId === surat.id && r.status === 'Bukti Terima Dicatat'
  ).sort((a, b) => new Date(b.waktu).getTime() - new Date(a.waktu).getTime());

  const handleSimpan = () => {
    setErrorMsg('');
    try {
      apiBuktiTerima(surat.id, tanggal, nama);
      setSaved(true);
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const siapSimpan = tanggal !== '' && nama.trim() !== '';

  return (
    <DashboardLayout>
      <div className="animate-fadeIn" style={{ maxWidth: 600, margin: '0 auto', paddingBottom: 48 }}>
        <Link href={`/surat-keluar/${surat.id}`} className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }}>
          <ArrowLeft size={15} aria-hidden="true" /> Kembali ke Detail Surat
        </Link>

        <div className="page-header">
          <div className="page-header-left">
            <h1>Bukti Terima Tujuan</h1>
            <p>Catat konfirmasi penerimaan di pihak tujuan</p>
          </div>
        </div>

        {/* Info: satu-satunya isian yang boleh diubah setelah arsip */}
        <div className="admin-info-box" style={{ marginBottom: 20 }}>
          <ClipboardCheck size={15} aria-hidden="true" />
          <span>
            Ini adalah satu-satunya isian yang dapat dilengkapi setelah surat diarsipkan (AT-13). Bagian lain surat terkunci.
          </span>
        </div>

        {/* Data surat — terkunci */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Lock size={14} aria-hidden="true" />
            <h2 style={{ fontSize: 14 }}>Data Surat (Terkunci)</h2>
          </div>
          <div className="card-body">
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <tbody>
                {[
                  ['Nomor Surat', <code key="n" style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--pinus)' }}>{surat.nomorSurat}</code>],
                  ['Perihal', surat.perihal],
                  ['Tujuan', surat.tujuan],
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

        {/* Riwayat bukti lama */}
        {sudahAda && (
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <h2 style={{ fontSize: 14, color: 'var(--pinus)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={15} aria-hidden="true" /> Bukti Terima Tercatat
              </h2>
            </div>
            <div className="card-body">
              <div className="konfirmasi-row">
                <span className="konfirmasi-label">Diterima Oleh</span>
                <span className="konfirmasi-value">{(surat as any).buktiTerimaNama}</span>
              </div>
              <div className="konfirmasi-row">
                <span className="konfirmasi-label">Tanggal Diterima</span>
                <span className="konfirmasi-value">
                  {(surat as any).buktiTerimaTanggal
                    ? new Date((surat as any).buktiTerimaTanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                    : '—'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        {(saved || sudahAda) ? (
          <div className="disp-banner-sukses">
            <CheckCircle2 size={22} aria-hidden="true" />
            <div>
              <strong>Bukti terima berhasil dicatat</strong>
              <p style={{ margin: '4px 0 0', fontSize: 13 }}>Perubahan dicatat dalam riwayat surat.</p>
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="card-header"><h2 style={{ fontSize: 14 }}>Isi Bukti Terima</h2></div>
            <div className="card-body">
              {errorMsg && (
                <div className="modal-error" role="alert" style={{ marginBottom: 14 }}>
                  <AlertCircle size={15} aria-hidden="true" /> {errorMsg}
                </div>
              )}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="tgl-diterima">
                    Tanggal Diterima <span className="required">*</span>
                  </label>
                  <input id="tgl-diterima" className="form-input" type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="nama-penerima">
                    Nama Penerima di Tujuan <span className="required">*</span>
                  </label>
                  <input id="nama-penerima" className="form-input" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama lengkap penerima" />
                </div>
              </div>
              <div className="form-actions">
                <button id="btn-simpan-bukti" className="btn btn-primary" onClick={handleSimpan} disabled={!siapSimpan}>
                  <CheckCircle2 size={15} aria-hidden="true" /> Simpan Bukti Terima
                </button>
                <Link href={`/surat-keluar/${surat.id}`} className="btn btn-ghost">Batal</Link>
              </div>
            </div>
          </div>
        )}

        {/* Riwayat perubahan */}
        {riwayatBukti.length > 0 && (
          <div className="card" style={{ marginTop: 20 }}>
            <div className="card-header"><h2 style={{ fontSize: 14 }}>Riwayat Perubahan Bukti</h2></div>
            <div className="card-body" style={{ padding: 0 }}>
              <table className="data-table">
                <tbody>
                  {riwayatBukti.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontSize: 12, color: 'var(--tinta-redup)', whiteSpace: 'nowrap' }}>
                        {new Date(r.waktu).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ fontSize: 13 }}>{r.catatan}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
