'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useStore } from '@/lib/store';
import { useBusinessLogic } from '@/lib/api';
import { getTemplateNaskah } from '@/lib/templates';
import { ArrowLeft, Save, Send, Sparkles, AlertCircle, Info, FileText, AlertTriangle, Eye, Hash, Lock } from 'lucide-react';
import { ModalStandar, KonsepSuratPreview, ChipStatus } from '@/components/ui';

// ─── Komponen utama di dalam Suspense ──────────────────────
function SuratKeluarBaruContent() {
  const { state } = useStore();
  const { apiAjukanSuratKeluar } = useBusinessLogic();
  const router = useRouter();
  const params = useSearchParams();

  // Tautan dari L52/L53 disposisi → L54
  const disposisiId = params.get('disposisiId') || '';
  const smId = params.get('smId') || '';

  const disposisiAsal = disposisiId ? state.disposisi.find(d => d.id === disposisiId) : null;
  const smAsal = smId ? state.suratMasuk.find(s => s.id === smId) : null;
  const tindakLanjutDisp = disposisiId
    ? state.tindakLanjut.filter(t => t.disposisiId === disposisiId && t.status !== 'dikembalikan')
    : [];

  // Daftar surat balasan yang sudah pernah dikirim/dibuat untuk surat masuk ini (Tahap 4)
  const existingBalasan = smAsal
    ? state.suratKeluar.filter(sk => sk.suratMasukAsalId === smAsal.id || sk.refSuratMasukId === smAsal.id)
    : [];
  const [previewSk, setPreviewSk] = useState<any>(null);

  // Banner revisi (Perlu Revisi dari Sekretaris atau Kadis)
  const persetujuan = state.persetujuan || [];

  const user = state.currentUser;
  const unitKerja = user?.unitKerjaId
    ? state.unitKerja.find(u => u.id === user.unitKerjaId)
    : null;

  const [selectedSmId, setSelectedSmId] = useState<string>(smId || '');
  const [form, setForm] = useState({
    perihal: '',
    tujuan: '',
    jenisSuratId: '',
    klasifikasiId: '',
    sifat: 'biasa',
    isiRingkas: '',
  });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Perhitungan nomor urut agenda surat keluar otomatis (+1 tahun berjalan, reset ke 1 setiap tahun baru)
  const currentYear = new Date().getFullYear();
  const romanMonth = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][new Date().getMonth()];
  const skTahunIni = state.suratKeluar.filter((s) => {
    const tgl = s.tanggalKirim || s.createdAt;
    const thn = tgl ? new Date(tgl).getFullYear() : new Date().getFullYear();
    return thn === currentYear;
  });

  let maxUrutKeluar = 0;
  for (const s of skTahunIni) {
    let num = s.nomorUrut;
    if (!num || isNaN(num)) {
      if (s.nomorSurat) {
        const parts = s.nomorSurat.split('/');
        if (parts.length >= 2) {
          const parsed = parseInt(parts[1], 10);
          if (!isNaN(parsed)) num = parsed;
        }
      }
    }
    if (num && num > maxUrutKeluar) maxUrutKeluar = num;
  }

  const skCounter = state.nomorSuratCounter?.find(
    (c) => c.tahun === currentYear && (c.klasifikasiKode === 'SURAT_KELUAR' || !c.klasifikasiKode)
  );
  if (skCounter && skCounter.counter > maxUrutKeluar) {
    maxUrutKeluar = skCounter.counter;
  }
  const nextUrutKeluar = maxUrutKeluar + 1;

  const selectedKlas = state.klasifikasi.find((k) => k.id === form.klasifikasiId);
  const selectedKlasKode = selectedKlas?.kode || '[Kode Klasifikasi]';

  const sortedJenisSurat = [...state.jenisSurat.filter(j => j.aktif)].sort((a, b) => {
    if (a.utama && !b.utama) return -1;
    if (!a.utama && b.utama) return 1;
    return a.nama.localeCompare(b.nama);
  });

  const handleJenisChange = (newJenisId: string) => {
    const selectedJenis = state.jenisSurat.find(j => j.id === newJenisId);
    let newIsi = form.isiRingkas;
    if (selectedJenis && (!form.isiRingkas || form.isiRingkas.trim() === '')) {
      newIsi = getTemplateNaskah(selectedJenis.nama, {
        perihal: form.perihal || undefined,
        tujuan: form.tujuan || undefined,
      });
    }
    setForm({ ...form, jenisSuratId: newJenisId, isiRingkas: newIsi });
  };

  const handleApplyTemplate = () => {
    const selectedJenis = state.jenisSurat.find(j => j.id === form.jenisSuratId);
    if (!selectedJenis) return;
    setForm({ ...form, isiRingkas: getTemplateNaskah(selectedJenis.nama, { perihal: form.perihal, tujuan: form.tujuan }) });
  };

  const handleSubmit = async (e: React.FormEvent, asDraft: boolean) => {
    e.preventDefault();
    setErrorMsg('');
    if (!asDraft && !form.klasifikasiId) {
      setErrorMsg('Kode klasifikasi arsip wajib diisi sebelum mengajukan.');
      return;
    }
    setSaving(true);
    try {
      const linkedSmId = smAsal?.id || selectedSmId || undefined;
      await apiAjukanSuratKeluar({ ...form, suratMasukAsalId: linkedSmId, refSuratMasukId: linkedSmId } as any, asDraft);
      router.push('/surat-keluar');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="animate-fadeIn">
        <Link href={disposisiId ? `/disposisi/${disposisiId}` : '/surat-keluar'} className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }}>
          <ArrowLeft size={16} /> Kembali
        </Link>

        <div className="page-header">
          <div className="page-header-left">
            <h1>Susun Konsep Surat Keluar</h1>
            <p>
              {unitKerja ? `Pemrakarsa: ${unitKerja.nama}` : 'Susun konsep naskah dinas keluar'}
              {smAsal && <span> · Balasan atas: <strong>{smAsal.nomorAgenda}</strong></span>}
            </p>
          </div>
        </div>

        {/* ─── Peringatan Balasan Sebelumnya (Tahap 4) ─── */}
        {smAsal && existingBalasan.length > 0 && (
          <div style={{
            background: '#fffbeb',
            border: '1.5px solid #f59e0b',
            borderRadius: 8,
            padding: '14px 18px',
            marginBottom: 20,
            boxShadow: '0 2px 8px rgba(245, 158, 11, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <AlertTriangle size={22} style={{ color: '#d97706', flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#92400e', marginBottom: 4 }}>
                  Perhatian: Surat masuk ini sudah memiliki {existingBalasan.length} surat balasan sebelumnya
                </div>
                <div style={{ fontSize: 13, color: '#78350f', lineHeight: 1.5, marginBottom: 10 }}>
                  {existingBalasan.length === 1 ? (
                    <>
                      Surat ini sudah memiliki 1 balasan terkirim/dibuat pada{' '}
                      <strong>
                        {existingBalasan[0].tanggalKirim
                          ? new Date(existingBalasan[0].tanggalKirim).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                          : new Date(existingBalasan[0].createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </strong>
                      {existingBalasan[0].nomorSurat ? (
                        <> dengan nomor <strong>{existingBalasan[0].nomorSurat}</strong></>
                      ) : (
                        ' (status konsep/draf)'
                      )}
                      . Anda akan membuat <strong>balasan tambahan (ke-2)</strong>.
                    </>
                  ) : (
                    <>
                      Surat masuk ini telah memiliki {existingBalasan.length} surat balasan terdaftar. Anda sedang menyusun <strong>balasan tambahan (ke-{existingBalasan.length + 1})</strong>.
                    </>
                  )}
                </div>

                {/* Tabel Ringkas Surat Balasan Sebelumnya */}
                <div style={{ background: '#fff', border: '1px solid #fde68a', borderRadius: 6, overflow: 'hidden' }}>
                  <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#fef3c7', textAlign: 'left', borderBottom: '1px solid #fde68a' }}>
                        <th style={{ padding: '6px 10px', color: '#92400e', width: 36 }}>No.</th>
                        <th style={{ padding: '6px 10px', color: '#92400e' }}>Nomor Surat</th>
                        <th style={{ padding: '6px 10px', color: '#92400e' }}>Tanggal</th>
                        <th style={{ padding: '6px 10px', color: '#92400e' }}>Perihal</th>
                        <th style={{ padding: '6px 10px', color: '#92400e' }}>Status</th>
                        <th style={{ padding: '6px 10px', color: '#92400e', textAlign: 'right' }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {existingBalasan.map((sk, idx) => (
                        <tr key={sk.id} style={{ borderBottom: idx < existingBalasan.length - 1 ? '1px solid #fef3c7' : 'none' }}>
                          <td style={{ padding: '6px 10px', color: '#78350f' }}>{idx + 1}</td>
                          <td style={{ padding: '6px 10px', fontWeight: 600, color: '#111827' }}>
                            {sk.nomorSurat || <em style={{ color: '#6b7280' }}>(Konsep belum terbit)</em>}
                          </td>
                          <td style={{ padding: '6px 10px', color: '#4b5563', whiteSpace: 'nowrap' }}>
                            {new Date(sk.tanggalKirim || sk.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                          <td style={{ padding: '6px 10px', color: '#374151', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {sk.perihal}
                          </td>
                          <td style={{ padding: '6px 10px' }}>
                            <ChipStatus jenis="suratKeluar" status={sk.status} compact />
                          </td>
                          <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => setPreviewSk(sk)}
                              style={{ fontSize: 11, padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            >
                              <Eye size={12} /> Pratinjau
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: smAsal ? '1fr 380px' : '1fr', gap: 24, alignItems: 'start' }}>

          {/* ─── Form Utama ─────────────────────────────── */}
          <div className="card">
            <div className="card-body">

              {/* Banner perlu revisi */}
              {errorMsg && (
                <div className="modal-error" role="alert" style={{ marginBottom: 16 }}>
                  <AlertCircle size={14} aria-hidden="true" /> {errorMsg}
                </div>
              )}

              {/* Surat masuk asal (otomatis bila dari disposisi) */}
              {smAsal && (
                <div className="admin-info-box" style={{ marginBottom: 20 }}>
                  <Info size={14} aria-hidden="true" />
                  <span>
                    Surat ini merupakan jawaban atas <strong>{smAsal.nomorAgenda}</strong> — {smAsal.perihal}{' '}
                    dari <em>{smAsal.asalSurat}</em>. Nomor agenda terhubung secara otomatis (relasi 1 surat masuk ke banyak balasan).
                  </span>
                </div>
              )}

              {/* Unit pemrakarsa (otomatis, hanya baca — K-1) */}
              {unitKerja && (
                <div className="form-group">
                  <label className="form-label">Unit Pemrakarsa</label>
                  <input className="form-input" value={unitKerja.nama} readOnly style={{ background: 'var(--latar)', color: 'var(--tinta-redup)' }} />
                  <div className="form-hint">Terisi otomatis dari unit kerja Anda (K-1).</div>
                </div>
              )}

              <form onSubmit={e => handleSubmit(e, false)}>
                {/* Opsi Tautkan ke Surat Masuk Asal jika surat keluar merupakan surat balasan */}
                {!smAsal && (
                  <div className="form-group" style={{ marginBottom: 20 }}>
                    <label className="form-label">
                      Tautkan ke Surat Masuk Asal (Surat Balasan / Jawaban)
                      <span style={{ fontSize: 11, color: 'var(--tinta-redup)', marginLeft: 8, fontWeight: 400 }}>(Opsional)</span>
                    </label>
                    <select
                      className="form-select"
                      id="select-sm-asal-sk"
                      value={selectedSmId}
                      onChange={e => setSelectedSmId(e.target.value)}
                    >
                      <option value="">— Bukan Surat Balasan / Surat Mandiri —</option>
                      {state.suratMasuk.map(sm => (
                        <option key={sm.id} value={sm.id}>
                          No. Agenda {sm.nomorAgenda}: {sm.perihal} (Pengirim: {sm.asalSurat})
                        </option>
                      ))}
                    </select>
                    <div className="form-hint">
                      Pilih jika surat keluar ini merupakan jawaban/tanggapan atas surat masuk pada buku agenda.
                    </div>
                  </div>
                )}

                {/* Field Nomor Urut Agenda & Penomoran Resmi (Otomatis & Read-Only) */}
                <div className="form-group" style={{ background: 'var(--latar)', padding: '14px 18px', borderRadius: 8, border: '1px solid var(--garis)', marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Hash size={16} style={{ color: 'var(--pinus)' }} aria-hidden="true" />
                      <strong>Nomor Agenda / No. Urut Surat Keluar</strong>
                      <span style={{ fontSize: 11, background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>
                        Otomatis Saat Tanda Tangan Kadis
                      </span>
                    </label>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        className="form-input"
                        value={nextUrutKeluar}
                        readOnly
                        style={{
                          width: 80,
                          textAlign: 'center',
                          fontFamily: 'monospace',
                          fontWeight: 800,
                          fontSize: 16,
                          color: 'var(--pinus)',
                          background: '#f1f5f9',
                          cursor: 'not-allowed',
                        }}
                      />
                      <Lock size={14} style={{ color: 'var(--tinta-redup)' }} aria-hidden="true" />
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--tinta-redup)', lineHeight: 1.4 }}>
                      Pola Format Resmi Tata Naskah Dinas:{' '}
                      <code style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0369a1', background: '#fff', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--garis)' }}>
                        {selectedKlasKode}/{nextUrutKeluar}/DISTAN-MS/{romanMonth}/{currentYear}
                      </code>
                      <div style={{ marginTop: 2, fontSize: 11 }}>
                        Nomor surat resmi dibangkitkan otomatis dalam satu transaksi penguncian baris (row locking) saat Kepala Dinas menyetujui surat.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Perihal <span className="required">*</span></label>
                  <input
                    className="form-input"
                    required
                    id="input-perihal-sk"
                    value={form.perihal}
                    onChange={e => setForm({ ...form, perihal: e.target.value })}
                    placeholder="Perihal surat keluar"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Tujuan Penerima <span className="required">*</span></label>
                  <input
                    className="form-input"
                    required
                    id="input-tujuan-sk"
                    value={form.tujuan}
                    onChange={e => setForm({ ...form, tujuan: e.target.value })}
                    placeholder="Nama instansi / pejabat / penerima"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Jenis Surat <span className="required">*</span></label>
                    <select
                      className="form-select"
                      id="select-jenis-sk"
                      value={form.jenisSuratId}
                      onChange={e => handleJenisChange(e.target.value)}
                    >
                      <option value="">— Pilih Jenis Surat —</option>
                      {sortedJenisSurat.map(j => (
                        <option key={j.id} value={j.id}>{j.nama}{j.utama ? ' ★' : ''}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Kode Klasifikasi Arsip <span className="required">*</span></label>
                    <select
                      className="form-select"
                      id="select-klasifikasi-sk"
                      value={form.klasifikasiId}
                      onChange={e => setForm({ ...form, klasifikasiId: e.target.value })}
                    >
                      <option value="">— Pilih Kode Klasifikasi —</option>
                      {state.klasifikasi.filter(k => k.aktif).map(k => (
                        <option key={k.id} value={k.id}>{k.kode} — {k.nama}</option>
                      ))}
                    </select>
                    {!form.klasifikasiId && (
                      <div className="form-hint" style={{ color: 'var(--rahasia)' }}>Wajib diisi sebelum mengajukan.</div>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Sifat Surat <span className="required">*</span></label>
                  <select
                    className="form-select"
                    id="select-sifat-sk"
                    value={form.sifat}
                    onChange={e => setForm({ ...form, sifat: e.target.value })}
                  >
                    {[
                      { key: 'biasa', label: 'Biasa' },
                      { key: 'umum', label: 'Umum/Pemberitahuan' },
                      { key: 'penting', label: 'Penting' },
                      { key: 'segera', label: 'Segera' },
                      { key: 'rahasia', label: 'Rahasia' },
                    ].map(s => (
                      <option key={s.key} value={s.key}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label className="form-label" style={{ margin: 0 }}>Isi Konsep Naskah Dinas</label>
                    {form.jenisSuratId && (
                      <button type="button" className="btn btn-sm btn-ghost" onClick={handleApplyTemplate} style={{ fontSize: 12, color: 'var(--pinus)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Sparkles size={14} /> Muat Ulang Template
                      </button>
                    )}
                  </div>
                  <textarea
                    className="form-textarea"
                    id="textarea-isi-sk"
                    value={form.isiRingkas}
                    onChange={e => setForm({ ...form, isiRingkas: e.target.value })}
                    placeholder="Pilih Jenis Surat untuk memuat kerangka naskah dinas otomatis, atau ketik langsung..."
                    style={{ minHeight: 280, fontFamily: 'monospace', fontSize: 13, lineHeight: 1.7 }}
                  />
                  <div className="form-hint">Nomor surat akan terbit otomatis saat Petugas memrosesnya (K-5). Kop dan format cetak ditangani sistem.</div>
                </div>

                <div className="form-actions" style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                  <button
                    type="submit"
                    id="btn-ajukan-sk"
                    className="btn btn-primary"
                    disabled={saving || !form.klasifikasiId}
                    title={!form.klasifikasiId ? 'Pilih kode klasifikasi terlebih dahulu' : ''}
                  >
                    <Send size={16} /> {saving ? 'Menyimpan...' : 'Ajukan untuk Paraf Koordinasi'}
                  </button>
                  <button
                    type="button"
                    id="btn-simpan-draf-sk"
                    className="btn btn-secondary"
                    disabled={saving}
                    onClick={e => handleSubmit(e, true)}
                  >
                    <Save size={16} /> Simpan Draf
                  </button>
                  <Link href={disposisiId ? `/disposisi/${disposisiId}` : '/surat-keluar'} className="btn btn-ghost">Batal</Link>
                </div>
              </form>
            </div>
          </div>

          {/* ─── Panel Samping: Laporan Staf sebagai Bahan ── */}
          {smAsal && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Info surat masuk asal */}
              <div className="card">
                <div className="card-header"><h2 style={{ fontSize: 13 }}>Surat Masuk Asal</h2></div>
                <div className="card-body">
                  <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                    <tbody>
                      {[
                        ['No. Agenda', smAsal.nomorAgenda],
                        ['Asal', smAsal.asalSurat],
                        ['Perihal', smAsal.perihal],
                        ['No. Surat', smAsal.nomorSuratAsal],
                        ['Sudah Dibalas', `${existingBalasan.length}x`],
                      ].map(([label, val]) => (
                        <tr key={String(label)} style={{ borderBottom: '1px solid var(--garis)' }}>
                          <td style={{ padding: '5px 0', color: 'var(--tinta-redup)', width: '38%' }}>{label}</td>
                          <td style={{ padding: '5px 0', fontWeight: label === 'Sudah Dibalas' && existingBalasan.length > 0 ? 700 : 500, color: label === 'Sudah Dibalas' && existingBalasan.length > 0 ? 'var(--primary-700)' : 'inherit' }}>{val}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <Link href={`/surat-masuk/${smAsal.id}`} className="btn btn-sm btn-ghost" style={{ marginTop: 10, fontSize: 12 }}>
                    <FileText size={12} /> Lihat Surat Masuk
                  </Link>
                </div>
              </div>

              {/* Laporan tindak lanjut staf sebagai bahan */}
              {tindakLanjutDisp.length > 0 && (
                <div className="card">
                  <div className="card-header"><h2 style={{ fontSize: 13 }}>Laporan Staf (Bahan)</h2></div>
                  <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {tindakLanjutDisp.map(tl => {
                      const pel = state.users.find(u => u.id === tl.pelakuId);
                      return (
                        <div key={tl.id} style={{ fontSize: 12, background: 'var(--latar)', borderRadius: 6, padding: 10 }}>
                          <div style={{ fontWeight: 700, marginBottom: 4 }}>{pel?.nama || '—'}</div>
                          <div style={{ whiteSpace: 'pre-wrap', color: 'var(--tinta)', lineHeight: 1.6 }}>{tl.uraianHasil}</div>
                          {tl.berkasUrl && (
                            <a href={tl.berkasUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--pinus)', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                              <FileText size={11} /> Berkas PDF
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Pratinjau Surat Balasan Sebelumnya (Tahap 4 & Tahap 1) */}
        {previewSk && (
          <ModalStandar
            open={true}
            onClose={() => setPreviewSk(null)}
            judul={`Pratinjau Surat Balasan Sebelumnya: ${previewSk.nomorSurat || previewSk.perihal}`}
            size="lg"
            footerSecondary={
              <button className="btn btn-ghost" onClick={() => setPreviewSk(null)}>
                Tutup Pratinjau
              </button>
            }
          >
            <div style={{ padding: '8px 0' }}>
              <KonsepSuratPreview
                surat={previewSk}
                jenisSurat={state.jenisSurat.find(j => j.id === previewSk.jenisSuratId)}
                klasifikasi={state.klasifikasi.find(k => k.id === previewSk.klasifikasiId)}
                penyusun={state.users.find(usr => usr.id === previewSk.penyusunId)}
                getUser={(uid) => state.users.find(u => u.id === uid)}
              />
            </div>
          </ModalStandar>
        )}
      </div>
    </DashboardLayout>
  );
}

// ─── Export dengan Suspense (useSearchParams wajib) ──────────
export default function SuratKeluarBaruPage() {
  return (
    <Suspense fallback={<DashboardLayout><div style={{ padding: 48 }}>Memuat formulir...</div></DashboardLayout>}>
      <SuratKeluarBaruContent />
    </Suspense>
  );
}
