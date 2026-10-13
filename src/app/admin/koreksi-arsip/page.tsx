'use client';
import React, { useState, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useStore } from '@/lib/store';
import { useBusinessLogic } from '@/lib/api';
import { KonfirmasiDialog } from '@/components/ui';
import { AlertCircle, CheckCircle2, ArrowRight, FileText, Info } from 'lucide-react';
import Link from 'next/link';

export default function KoreksiArsipPage() {
  const { state } = useStore();
  const { apiKoreksiMetadataArsip } = useBusinessLogic();

  const [arsipId, setArsipId]             = useState('');
  const [perihalBaru, setPerihalBaru]     = useState('');
  const [klasId, setKlasId]               = useState('');
  const [alasan, setAlasan]               = useState('');
  const [errorMsg, setErrorMsg]           = useState('');
  const [showKonfirmasi, setKonfirmasi]   = useState(false);
  const [berhasil, setBerhasil]           = useState(false);

  const arsipList = useMemo(() => (state as any).arsip || [], [state]);
  const arsipTerpilih = arsipList.find((a: any) => a.id === arsipId);
  const klasTerpilih  = state.klasifikasi.find((k) => k.id === klasId);

  const resetForm = () => {
    setArsipId(''); setPerihalBaru(''); setKlasId('');
    setAlasan(''); setErrorMsg(''); setBerhasil(false);
  };

  // Ringkasan perubahan untuk konfirmasi
  const perubahan = useMemo(() => {
    if (!arsipTerpilih) return [];
    const list: { label: string; lama: string; baru: string }[] = [];
    if (perihalBaru.trim() && perihalBaru.trim() !== arsipTerpilih.perihal) {
      list.push({ label: 'Perihal', lama: arsipTerpilih.perihal, baru: perihalBaru.trim() });
    }
    if (klasId && klasId !== arsipTerpilih.klasifikasiId && klasTerpilih) {
      list.push({ label: 'Klasifikasi', lama: arsipTerpilih.kodeArsip || arsipTerpilih.klasifikasiId, baru: `${klasTerpilih.kode} — ${klasTerpilih.nama}` });
    }
    return list;
  }, [arsipTerpilih, perihalBaru, klasId, klasTerpilih]);

  const siapKonfirmasi = arsipId !== '' && alasan.trim() !== '' && perubahan.length > 0;

  const handleKonfirmasi = () => {
    setErrorMsg('');
    try {
      apiKoreksiMetadataArsip(arsipId, perihalBaru.trim() || null, klasId || null, alasan.trim());
      setBerhasil(true);
      setKonfirmasi(false);
    } catch (e: any) {
      setErrorMsg(e.message);
      setKonfirmasi(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="animate-fadeIn" style={{ maxWidth: 720, margin: '0 auto', paddingBottom: 48 }}>
        <div className="page-header">
          <div className="page-header-left">
            <h1>Koreksi Metadata Arsip</h1>
            <p>Ubah perihal atau kode klasifikasi arsip — berkas tidak dapat diganti</p>
          </div>
        </div>

        {/* Info penting */}
        <div className="admin-info-box" style={{ marginBottom: 20 }}>
          <Info size={15} aria-hidden="true" />
          <span>
            Hanya <strong>Petugas Surat</strong> yang dapat melakukan koreksi ini. Berkas PDF arsip <strong>tidak dapat diganti</strong> melalui halaman ini. Semua perubahan dicatat di log aktivitas.
          </span>
        </div>

        {berhasil ? (
          <div>
            <div className="disp-banner-sukses" style={{ marginBottom: 20 }}>
              <CheckCircle2 size={22} aria-hidden="true" />
              <div>
                <strong>Koreksi Berhasil Disimpan</strong>
                <p style={{ margin: '4px 0 0', fontSize: 13 }}>Perubahan metadata arsip telah dicatat dalam log aktivitas.</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" onClick={resetForm}>Koreksi Arsip Lain</button>
              <Link href="/arsip" className="btn btn-primary">Lihat Daftar Arsip</Link>
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="card-body">
              {errorMsg && (
                <div className="modal-error" role="alert" style={{ marginBottom: 16 }}>
                  <AlertCircle size={15} aria-hidden="true" /> {errorMsg}
                </div>
              )}

              {/* 1. Pilih Arsip */}
              <div className="form-group">
                <label className="form-label" htmlFor="pilih-arsip">
                  Pilih Arsip <span className="required">*</span>
                </label>
                <select id="pilih-arsip" className="form-select" value={arsipId} onChange={(e) => { setArsipId(e.target.value); setPerihalBaru(''); setKlasId(''); }}>
                  <option value="">— Pilih arsip yang akan dikoreksi —</option>
                  {arsipList.map((a: any) => (
                    <option key={a.id} value={a.id}>
                      [{a.kodeArsip || '—'}] {a.perihal} ({a.jenisSurat === 'keluar' ? 'Keluar' : 'Masuk'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Data arsip terpilih */}
              {arsipTerpilih && (
                <div className="card" style={{ marginBottom: 20, background: 'var(--latar)' }}>
                  <div className="card-header">
                    <h2 style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <FileText size={14} aria-hidden="true" /> Data Arsip Saat Ini
                    </h2>
                  </div>
                  <div className="card-body">
                    <div className="konfirmasi-row">
                      <span className="konfirmasi-label">Kode Arsip</span>
                      <code style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--pinus)' }}>{arsipTerpilih.kodeArsip || '—'}</code>
                    </div>
                    <div className="konfirmasi-row">
                      <span className="konfirmasi-label">Perihal</span>
                      <span className="konfirmasi-value">{arsipTerpilih.perihal}</span>
                    </div>
                    <div className="konfirmasi-row">
                      <span className="konfirmasi-label">Nomor Surat</span>
                      <span className="konfirmasi-value" style={{ fontFamily: 'monospace', fontSize: 12 }}>{arsipTerpilih.nomorSurat}</span>
                    </div>
                    <div className="konfirmasi-row">
                      <span className="konfirmasi-label">Berkas PDF</span>
                      <span className="konfirmasi-value" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--tinta-redup)', fontSize: 12 }}>
                        <FileText size={13} aria-hidden="true" />
                        {arsipTerpilih.berkasUrl || '—'}
                        <span style={{ color: 'var(--segera)' }}>— tidak dapat diganti</span>
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Perihal Baru */}
              <div className="form-group">
                <label className="form-label" htmlFor="perihal-baru">Perihal Baru (opsional)</label>
                <input
                  id="perihal-baru"
                  className="form-input"
                  value={perihalBaru}
                  onChange={(e) => setPerihalBaru(e.target.value)}
                  placeholder={arsipTerpilih ? arsipTerpilih.perihal : 'Pilih arsip terlebih dahulu'}
                  disabled={!arsipTerpilih}
                />
              </div>

              {/* 3. Klasifikasi Baru */}
              <div className="form-group">
                <label className="form-label" htmlFor="klasifikasi-baru">Kode Klasifikasi Baru (opsional)</label>
                <select
                  id="klasifikasi-baru"
                  className="form-select"
                  value={klasId}
                  onChange={(e) => setKlasId(e.target.value)}
                  disabled={!arsipTerpilih}
                >
                  <option value="">— Tidak ubah klasifikasi —</option>
                  {state.klasifikasi.filter((k) => k.aktif && k.id !== arsipTerpilih?.klasifikasiId).map((k) => (
                    <option key={k.id} value={k.id}>{k.kode} — {k.nama}</option>
                  ))}
                </select>
              </div>

              {/* Pratinjau perubahan */}
              {perubahan.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tinta-redup)', marginBottom: 8, textTransform: 'uppercase' }}>Pratinjau Perubahan</div>
                  {perubahan.map((p) => (
                    <div key={p.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 8, padding: '8px 12px', background: 'var(--permukaan)', borderRadius: 'var(--border-radius)' }}>
                      <span style={{ color: 'var(--tinta-redup)', minWidth: 80 }}>{p.label}</span>
                      <span style={{ textDecoration: 'line-through', color: 'var(--rahasia)' }}>{p.lama}</span>
                      <ArrowRight size={13} aria-hidden="true" />
                      <span style={{ fontWeight: 600, color: 'var(--pinus)' }}>{p.baru}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* 4. Alasan Wajib */}
              <div className="form-group">
                <label className="form-label" htmlFor="alasan-koreksi">
                  Alasan Koreksi <span className="required">*</span>
                </label>
                <textarea
                  id="alasan-koreksi"
                  className="form-input"
                  rows={3}
                  value={alasan}
                  onChange={(e) => setAlasan(e.target.value)}
                  placeholder="Jelaskan alasan perlu dilakukan koreksi metadata…"
                  style={{ resize: 'vertical' }}
                  disabled={!arsipTerpilih}
                />
              </div>

              <div className="form-actions">
                <button
                  id="btn-koreksi-arsip"
                  className="btn btn-primary"
                  disabled={!siapKonfirmasi}
                  onClick={() => setKonfirmasi(true)}
                >
                  <CheckCircle2 size={15} aria-hidden="true" /> Simpan Koreksi
                </button>
                {!siapKonfirmasi && arsipTerpilih && (
                  <span style={{ fontSize: 12, color: 'var(--segera)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <AlertCircle size={13} aria-hidden="true" />
                    {perubahan.length === 0 ? 'Belum ada perubahan terdeteksi.' : 'Alasan koreksi wajib diisi.'}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Dialog Konfirmasi */}
        <KonfirmasiDialog
          open={showKonfirmasi}
          onClose={() => setKonfirmasi(false)}
          onConfirm={handleKonfirmasi}
          judul="Konfirmasi Koreksi Metadata Arsip"
          pesan={
            `Perubahan berikut akan disimpan:\n` +
            perubahan.map((p) => `• ${p.label}: "${p.lama}" → "${p.baru}"`).join('\n') +
            `\n\nAlasan: ${alasan}`
          }
          labelKonfirmasi="Simpan Koreksi"
          bahaya={false}
        />
      </div>
    </DashboardLayout>
  );
}
