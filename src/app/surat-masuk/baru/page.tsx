'use client';
import React, { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useStore } from '@/lib/store';
import { useBusinessLogic } from '@/lib/api';
import { SIFAT_SURAT_LABELS, SifatSurat } from '@/lib/types';
import { BadgeSifat } from '@/components/ui';
import {
  ArrowLeft, Save, CheckCircle2, FileText, AlertCircle, Send, Upload, X, Eye, Hash, Lock
} from 'lucide-react';
import Link from 'next/link';
import { savePdfToStorage } from '@/lib/pdf-storage';

const PDF_MAX_MB = 10;
const SIFAT_KETERANGAN: Record<SifatSurat, string> = {
  biasa: 'Surat rutin, penyelesaian berjangka wajar.',
  umum: 'Umum/Pemberitahuan resmi berjangka wajar.',
  penting: 'Perlu perhatian pimpinan, selesai tepat waktu.',
  segera: 'Ditindaklanjuti hari ini atau batas waktu ketat.',
  rahasia: 'Dokumen tertutup, akses terbatas. PDF tetap wajib diunggah.',
};

type Keadaan = 'isian' | 'berhasil';

export default function SuratMasukBaruPage() {
  const { state } = useStore();
  const { apiCatatSuratMasuk } = useBusinessLogic();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── State formulir ──────────────────────────────────────────
  const [file, setFile]               = useState<File | null>(null);
  const [pdfUrl, setPdfUrl]           = useState<string | null>(null);
  const [pdfError, setPdfError]       = useState('');
  const [form, setForm]               = useState({
    nomorSuratAsal: '',
    asalSurat: '',
    tanggalSuratAsal: '',
    tanggalTerima: new Date().toISOString().slice(0, 10), // bawaan: hari ini
    perihal: '',
    sifat: 'biasa' as SifatSurat,
    klasifikasiId: '',
    jenisSuratId: '',
    batasWaktu: '',
  });

  const [saving, setSaving]           = useState(false);
  const [errorMsg, setErrorMsg]       = useState('');
  const [keadaan, setKeadaan]         = useState<Keadaan>('isian');
  const [hasilSuratId, setHasilSuratId] = useState('');
  const hasilAgenda = state.suratMasuk.find((s) => s.id === hasilSuratId)?.nomorAgenda || '';

  const user = state.currentUser;
  const isAdmin = user?.role === 'admin';
  const [customAgenda, setCustomAgenda] = useState<string>('');

  // Perhitungan nomor agenda otomatis (+1 tahun berjalan, reset ke 1 setiap tahun baru)
  const tahunBuku = form.tanggalTerima ? new Date(form.tanggalTerima).getFullYear() : new Date().getFullYear();
  const suratTahunIni = state.suratMasuk.filter((s) => {
    const tgl = s.tanggalTerima || s.createdAt;
    const thn = tgl ? new Date(tgl).getFullYear() : new Date().getFullYear();
    return thn === tahunBuku;
  });

  let maxAgenda = 0;
  for (const s of suratTahunIni) {
    let num = s.nomorUrut;
    if (!num || isNaN(num)) {
      const parsed = parseInt(s.nomorAgenda, 10);
      if (!isNaN(parsed)) num = parsed;
      else {
        const match = s.nomorAgenda.match(/\d+/);
        if (match) num = parseInt(match[0], 10);
      }
    }
    if (num && num > maxAgenda) maxAgenda = num;
  }
  const counterItem = state.nomorSuratCounter?.find(
    (c) => c.tahun === tahunBuku && (c.klasifikasiKode === 'SURAT_MASUK' || !c.klasifikasiKode)
  );
  if (counterItem && counterItem.counter > maxAgenda) {
    maxAgenda = counterItem.counter;
  }
  const nextNomorAgenda = maxAgenda + 1;
  const nomorAgendaTampil = customAgenda || String(nextNomorAgenda);

  // Urutkan jenis surat: utama lebih dahulu
  const sortedJenisSurat = [...state.jenisSurat.filter((j) => j.aktif)].sort((a, b) => {
    if (a.utama && !b.utama) return -1;
    if (!a.utama && b.utama) return 1;
    return a.nama.localeCompare(b.nama);
  });

  // Ambil daftar sifat surat aktif dari Data Master (Tahap 6)
  const masterSifatList = (state.dataMaster || [])
    .filter((d) => d.kategori === 'sifat_surat' && d.aktif)
    .sort((a, b) => (a.urutan ?? 99) - (b.urutan ?? 99));

  const daftarSifat = masterSifatList.length > 0
    ? masterSifatList.map((d) => ({
        kode: d.kode,
        label: d.label,
        keterangan: d.keterangan || (SIFAT_KETERANGAN as Record<string, string>)[d.kode] || '',
      }))
    : (['biasa', 'umum', 'penting', 'segera', 'rahasia'] as SifatSurat[]).map((k) => ({
        kode: k,
        label: SIFAT_SURAT_LABELS[k] || k,
        keterangan: (SIFAT_KETERANGAN as Record<string, string>)[k] || '',
      }));

  // ── Validasi & simpan File dari input native ─────────────────
  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setPdfError('');
    if (!f) return;
    if (f.type !== 'application/pdf' && !f.name.endsWith('.pdf')) {
      setPdfError('Berkas harus berformat PDF. Berkas selain PDF tidak dapat diterima.');
      e.target.value = '';
      return;
    }
    if (f.size > PDF_MAX_MB * 1024 * 1024) {
      setPdfError(`Ukuran berkas melebihi batas ${PDF_MAX_MB} MB. Kompres atau gunakan berkas yang lebih kecil.`);
      e.target.value = '';
      return;
    }
    setFile(f);
    setPdfUrl(URL.createObjectURL(f));
  }, []);

  const hapusPdf = () => {
    setFile(null);
    setPdfUrl(null);
    setPdfError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Validasi isian sebelum tombol aktif ──────────────────────
  const wajibLengkap =
    !!file &&
    !pdfError &&
    form.nomorSuratAsal.trim() !== '' &&
    form.asalSurat.trim() !== '' &&
    form.tanggalSuratAsal !== '' &&
    form.tanggalTerima !== '' &&
    form.perihal.trim() !== '' &&
    form.klasifikasiId !== '' &&
    form.jenisSuratId !== '';

  // Alasan tombol nonaktif (ditampilkan sebagai hint)
  const alasanNonaktif = (): string | null => {
    if (!file) return 'Berkas PDF surat wajib diunggah.';
    if (pdfError) return pdfError;
    if (!form.nomorSuratAsal.trim()) return 'Nomor surat asal wajib diisi.';
    if (!form.asalSurat.trim()) return 'Asal surat wajib diisi.';
    if (!form.tanggalSuratAsal) return 'Tanggal surat wajib diisi.';
    if (!form.perihal.trim()) return 'Perihal wajib diisi.';
    if (!form.klasifikasiId) return 'Kode klasifikasi arsip wajib dipilih.';
    if (!form.jenisSuratId) return 'Jenis surat wajib dipilih.';
    return null;
  };

  // ── Simpan ───────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wajibLengkap) return;
    setSaving(true);
    setErrorMsg('');
    await new Promise((r) => setTimeout(r, 500));
    try {
      const result = apiCatatSuratMasuk(
        {
          nomorAgenda: nomorAgendaTampil,
          nomorUrut: parseInt(nomorAgendaTampil, 10),
          asalSurat: form.asalSurat,
          nomorSuratAsal: form.nomorSuratAsal,
          tanggalSuratAsal: form.tanggalSuratAsal,
          tanggalTerima: form.tanggalTerima,
          perihal: form.perihal,
          sifat: form.sifat,
          klasifikasiId: form.klasifikasiId,
          jenisSuratId: form.jenisSuratId,
          batasWaktu: form.batasWaktu || undefined,
        } as any,
        file
      );

      // Simpan berkas fisik ke IndexedDB agar pratinjau PDF dapat diakses secara lokal
      if (file && result) {
        try {
          await savePdfToStorage(`sm_${result}`, file);
          await savePdfToStorage(file.name, file);
          await savePdfToStorage(`/docs/${file.name}`, file);
          if (nomorAgendaTampil) {
            await savePdfToStorage(`sm_agenda_${nomorAgendaTampil}`, file);
          }
        } catch (storageErr) {
          console.warn('Gagal menyimpan PDF ke IndexedDB:', storageErr);
        }
      }

      // apiCatatSuratMasuk mengembalikan id surat baru; state belum ter-update di render ini,
      // jadi nomor agenda dibaca dari state saat layar konfirmasi dirender.
      setHasilSuratId(result as string);
      setKeadaan('berhasil');

    } catch (err: any) {
      // Bila gagal: data tidak tersimpan, isian tetap terisi
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Layar konfirmasi pasca-simpan ────────────────────────────
  if (keadaan === 'berhasil') {
    return (
      <DashboardLayout>
        <div className="animate-fadeIn" style={{ maxWidth: 600, margin: '40px auto', textAlign: 'center' }}>
          <div style={{ marginBottom: 24 }}>
            <CheckCircle2 size={56} style={{ color: 'var(--pinus)', marginBottom: 16 }} aria-hidden="true" />
            <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Surat Berhasil Diagendakan</h1>
            <p style={{ color: 'var(--tinta-redup)', fontSize: 14, marginBottom: 20 }}>
              Nomor agenda telah terbit secara otomatis.
            </p>
          </div>

          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-body" style={{ textAlign: 'left' }}>
              <div className="konfirmasi-row">
                <span className="konfirmasi-label">Nomor Agenda</span>
                <strong className="konfirmasi-value" style={{ fontFamily: 'monospace', color: 'var(--pinus)', fontSize: 16 }}>
                  {hasilAgenda}
                </strong>
              </div>
              <div className="konfirmasi-row">
                <span className="konfirmasi-label">Perihal</span>
                <span className="konfirmasi-value">{form.perihal}</span>
              </div>
              <div className="konfirmasi-row">
                <span className="konfirmasi-label">Asal Surat</span>
                <span className="konfirmasi-value">{form.asalSurat}</span>
              </div>
              <div className="konfirmasi-row">
                <span className="konfirmasi-label">Berkas PDF</span>
                <span className="konfirmasi-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FileText size={14} aria-hidden="true" />
                  {file?.name}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href={`/surat-masuk/${hasilSuratId}`} className="btn btn-ghost">
              <FileText size={15} aria-hidden="true" />
              Lihat Detail Surat
            </Link>
            {hasilSuratId && (
              <Link
                id="btn-buat-disposisi"
                href={`/disposisi/buat/${hasilSuratId}`}
                className="btn btn-primary"
              >
                <Send size={15} aria-hidden="true" />
                Buat Kartu Disposisi
              </Link>
            )}
            <Link href="/surat-masuk/baru" className="btn btn-ghost" onClick={() => {
              setKeadaan('isian');
              setFile(null);
              setPdfUrl(null);
              setForm({
                nomorSuratAsal: '', asalSurat: '', tanggalSuratAsal: '',
                tanggalTerima: new Date().toISOString().slice(0, 10),
                perihal: '', sifat: 'biasa', klasifikasiId: '', jenisSuratId: '', batasWaktu: '',
              });
            }}>
              Catat Surat Lain
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ── Formulir ─────────────────────────────────────────────────
  const alasan = alasanNonaktif();
  return (
    <DashboardLayout>
      <div className="animate-fadeIn">
        <Link href="/surat-masuk" className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }}>
          <ArrowLeft size={16} aria-hidden="true" /> Kembali
        </Link>

        <div className="page-header">
          <div className="page-header-left">
            <h1>Catat Surat Masuk Baru</h1>
            <p>Isi semua kolom bertanda <span className="required">*</span> — PDF surat wajib diunggah</p>
          </div>
        </div>

        <div className="card" style={{ maxWidth: 820 }}>
          <div className="card-body">
            {errorMsg && (
              <div className="modal-error" role="alert" style={{ marginBottom: 20 }}>
                <AlertCircle size={16} aria-hidden="true" />
                <span><strong>Gagal Menyimpan:</strong> {errorMsg}. Data tidak tersimpan — isian tetap ada.</span>
              </div>
            )}

            <form id="form-catat-surat-masuk" onSubmit={handleSubmit} noValidate>

              {/* 1. Unggah PDF — WAJIB (termasuk rahasia, K-4) */}
              <div className="form-group">
                <label className="form-label" htmlFor="unggah-pdf-input">
                  Berkas Surat (PDF) <span className="required">*</span>
                </label>
                <p className="form-hint" style={{ marginBottom: 8 }}>
                  Wajib untuk semua sifat surat termasuk rahasia (K-4). Maks. {PDF_MAX_MB} MB, format PDF saja.
                </p>

                {/* Zona unggah / pratinjau */}
                {!pdfUrl ? (
                  <div
                    className={`unggah-pdf-drop${pdfError ? ' unggah-pdf-drop-error' : ''}`}
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
                    role="button"
                    tabIndex={0}
                    aria-describedby={pdfError ? 'pdf-error-msg' : undefined}
                  >
                    <Upload size={20} aria-hidden="true" />
                    <span>Klik atau seret berkas PDF ke sini</span>
                    <span className="unggah-pdf-hint">PDF saja · maks. {PDF_MAX_MB} MB</span>
                    <input
                      ref={fileInputRef}
                      id="unggah-pdf-input"
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={handleFileInput}
                      hidden
                    />
                  </div>
                ) : (
                  <div className="unggah-pdf-filled">
                    <FileText size={18} aria-hidden="true" />
                    <span className="unggah-pdf-name">{file?.name}</span>
                    <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-ghost" title="Pratinjau">
                      <Eye size={14} aria-hidden="true" />
                    </a>
                    <button type="button" className="btn btn-sm btn-ghost" onClick={hapusPdf} title="Hapus berkas">
                      <X size={14} aria-hidden="true" />
                    </button>
                  </div>
                )}

                {pdfError && (
                  <p id="pdf-error-msg" className="unggah-pdf-error" role="alert">{pdfError}</p>
                )}
              </div>

              {/* 1b. Nomor Agenda / No. Urut Surat Masuk (Otomatis & Read-Only) */}
              <div className="form-group" style={{ background: 'var(--latar)', padding: '14px 18px', borderRadius: 8, border: '1px solid var(--garis)', marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label className="form-label" htmlFor="nomor-agenda-auto" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Hash size={16} style={{ color: 'var(--pinus)' }} aria-hidden="true" />
                    <strong>Nomor Agenda / No. Urut Surat Masuk</strong>
                    <span style={{ fontSize: 11, background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>
                      Otomatis (+1 Tahun {tahunBuku})
                    </span>
                  </label>
                  {isAdmin && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setCustomAgenda(customAgenda ? '' : String(nextNomorAgenda))}
                      style={{ fontSize: 11, padding: '2px 8px' }}
                    >
                      {customAgenda ? 'Kunci Otomatis' : 'Ubah Khusus (Admin)'}
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      id="nomor-agenda-auto"
                      className="form-input"
                      value={nomorAgendaTampil}
                      onChange={(e) => setCustomAgenda(e.target.value)}
                      readOnly={!isAdmin || !customAgenda}
                      style={{
                        maxWidth: 160,
                        fontFamily: 'monospace',
                        fontWeight: 800,
                        fontSize: 16,
                        color: 'var(--pinus)',
                        background: (!isAdmin || !customAgenda) ? '#f1f5f9' : '#fff',
                        cursor: (!isAdmin || !customAgenda) ? 'not-allowed' : 'text',
                        textAlign: 'center',
                      }}
                    />
                    {(!isAdmin || !customAgenda) && <Lock size={14} style={{ color: 'var(--tinta-redup)' }} aria-hidden="true" />}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--tinta-redup)', lineHeight: 1.4 }}>
                    Angka urut sederhana sesuai buku fisik surat masuk (KIKY). Dihasilkan otomatis (+1) dari agenda tertinggi tahun buku berjalan dan di-reset ke 1 setiap pergantian tahun.
                  </div>
                </div>
              </div>

              {/* 2. Nomor Surat */}
              <div className="form-group">
                <label className="form-label" htmlFor="nomor-surat-asal">
                  Nomor Surat <span className="required">*</span>
                </label>
                <input
                  id="nomor-surat-asal"
                  className="form-input"
                  value={form.nomorSuratAsal}
                  onChange={(e) => setForm({ ...form, nomorSuratAsal: e.target.value })}
                  placeholder="Contoh: B-1234/INSTANSI/IX/2026"
                />
              </div>

              {/* 3. Asal Surat (Daftar Master Instansi Pengirim + Opsi Ketik Bebas) */}
              <div className="form-group">
                <label className="form-label" htmlFor="asal-surat">
                  Asal Surat <span className="required">*</span>
                </label>
                <input
                  id="asal-surat"
                  list="instansi-asal-list"
                  className="form-input"
                  value={form.asalSurat}
                  onChange={(e) => setForm({ ...form, asalSurat: e.target.value })}
                  placeholder="Ketik atau pilih instansi pengirim terdaftar"
                />
                <datalist id="instansi-asal-list">
                  {(state.dataMaster || [])
                    .filter((d) => d.kategori === 'instansi_asal' && d.aktif)
                    .sort((a, b) => (a.urutan ?? 99) - (b.urutan ?? 99))
                    .map((item) => (
                      <option key={item.id} value={item.label}>
                        {item.keterangan ? `${item.label} (${item.keterangan})` : item.label}
                      </option>
                    ))}
                </datalist>
                <p className="form-hint">
                  Pilih dari instansi master terdaftar atau ketik instansi baru bila belum ada dalam daftar master.
                </p>
              </div>

              {/* 4 & 5. Tanggal Surat + Tanggal Terima */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="tanggal-surat">
                    Tanggal Surat <span className="required">*</span>
                  </label>
                  <input
                    id="tanggal-surat"
                    className="form-input"
                    type="date"
                    value={form.tanggalSuratAsal}
                    onChange={(e) => setForm({ ...form, tanggalSuratAsal: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="tanggal-terima">
                    Tanggal Diterima <span className="required">*</span>
                  </label>
                  <input
                    id="tanggal-terima"
                    className="form-input"
                    type="date"
                    value={form.tanggalTerima}
                    onChange={(e) => setForm({ ...form, tanggalTerima: e.target.value })}
                  />
                  <p className="form-hint">Bawaan: hari ini</p>
                </div>
              </div>

              {/* 6. Perihal */}
              <div className="form-group">
                <label className="form-label" htmlFor="perihal">
                  Perihal <span className="required">*</span>
                </label>
                <input
                  id="perihal"
                  className="form-input"
                  value={form.perihal}
                  onChange={(e) => setForm({ ...form, perihal: e.target.value })}
                  placeholder="Perihal surat"
                />
              </div>

              {/* 7. Sifat Surat (Diambil dinamis dari Data Master) */}
              <div className="form-group">
                <label className="form-label" id="label-sifat">
                  Sifat Surat <span className="required">*</span>
                </label>
                <div className="sifat-grid" role="radiogroup" aria-labelledby="label-sifat">
                  {daftarSifat.map((item) => (
                    <label
                      key={item.kode}
                      className={`sifat-opsi${form.sifat === item.kode ? ' sifat-opsi-aktif' : ''}`}
                    >
                      <input
                        type="radio"
                        name="sifat"
                        value={item.kode}
                        checked={form.sifat === item.kode}
                        onChange={() => setForm({ ...form, sifat: item.kode as SifatSurat })}
                        style={{ display: 'none' }}
                      />
                      <BadgeSifat sifat={item.kode as SifatSurat} />
                      {item.keterangan && <span className="sifat-keterangan">{item.keterangan}</span>}
                    </label>
                  ))}
                </div>
              </div>

              {/* 8. Klasifikasi Surat — WAJIB */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="klasifikasi-id">
                    Kode Klasifikasi Arsip <span className="required">*</span>
                  </label>
                  <select
                    id="klasifikasi-id"
                    className="form-select"
                    value={form.klasifikasiId}
                    onChange={(e) => setForm({ ...form, klasifikasiId: e.target.value })}
                  >
                    <option value="">— Pilih Kode Klasifikasi —</option>
                    {state.klasifikasi.filter((k) => k.aktif).map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.kode} — {k.nama}
                      </option>
                    ))}
                  </select>
                  <p className="form-hint">Kode penuntun kearsipan dinas untuk pengarsipan dokumen.</p>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="jenis-surat-id">
                    Jenis Surat <span className="required">*</span>
                  </label>
                  <select
                    id="jenis-surat-id"
                    className="form-select"
                    value={form.jenisSuratId}
                    onChange={(e) => setForm({ ...form, jenisSuratId: e.target.value })}
                  >
                    <option value="">— Pilih Jenis Surat —</option>
                    {sortedJenisSurat.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.nama}{j.utama ? ' ★' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 9. Batas Waktu — opsional */}
              <div className="form-group">
                <label className="form-label" htmlFor="batas-waktu">
                  Batas Waktu Tindak Lanjut{' '}
                  <span style={{ fontWeight: 400, color: 'var(--tinta-redup)', fontSize: 12 }}>(opsional)</span>
                </label>
                <input
                  id="batas-waktu"
                  className="form-input"
                  type="date"
                  value={form.batasWaktu}
                  onChange={(e) => setForm({ ...form, batasWaktu: e.target.value })}
                  min={new Date().toISOString().slice(0, 10)}
                  style={{ maxWidth: 220 }}
                />
                <p className="form-hint">Diisi bila surat mewajibkan penyelesaian sebelum tanggal tertentu.</p>
              </div>

              {/* Aksi — tombol nonaktif + alasan bila belum lengkap */}
              <div className="form-actions" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    id="btn-simpan-agenda"
                    type="submit"
                    className="btn btn-primary"
                    disabled={!wajibLengkap || saving}
                    aria-describedby={!wajibLengkap ? 'alasan-nonaktif' : undefined}
                  >
                    <Save size={16} aria-hidden="true" />
                    {saving ? 'Menyimpan…' : 'Simpan & Agendakan'}
                  </button>
                  <Link href="/surat-masuk" className="btn btn-ghost">Batal</Link>
                </div>
                {alasan && (
                  <p id="alasan-nonaktif" style={{ fontSize: 12, color: 'var(--segera)', display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                    <AlertCircle size={13} aria-hidden="true" />
                    {alasan}
                  </p>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
