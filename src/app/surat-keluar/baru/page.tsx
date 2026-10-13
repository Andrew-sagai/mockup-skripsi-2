'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useStore } from '@/lib/store';
import { useBusinessLogic } from '@/lib/api';
import { getTemplateNaskah } from '@/lib/templates';
import { ArrowLeft, Save, Send, Sparkles, AlertCircle, Info, FileText } from 'lucide-react';

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

  // Banner revisi (Perlu Revisi dari Sekretaris atau Kadis)
  const persetujuan = state.persetujuan || [];

  const user = state.currentUser;
  const unitKerja = user?.unitKerjaId
    ? state.unitKerja.find(u => u.id === user.unitKerjaId)
    : null;

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
      apiAjukanSuratKeluar({ ...form, suratMasukAsalId: smAsal?.id } as any, asDraft);
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
                    dari <em>{smAsal.asalSurat}</em>. Nomor agenda akan terhubung secara otomatis (K-1).
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
                  <label className="form-label">Sifat Surat</label>
                  <select
                    className="form-select"
                    id="select-sifat-sk"
                    value={form.sifat}
                    onChange={e => setForm({ ...form, sifat: e.target.value })}
                  >
                    {['biasa', 'penting', 'segera', 'segera', 'rahasia'].map(s => (
                      <option key={s} value={s}>{s.replace('_', ' ')}</option>
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
                      ].map(([label, val]) => (
                        <tr key={String(label)} style={{ borderBottom: '1px solid var(--garis)' }}>
                          <td style={{ padding: '5px 0', color: 'var(--tinta-redup)', width: '38%' }}>{label}</td>
                          <td style={{ padding: '5px 0', fontWeight: 500 }}>{val}</td>
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
