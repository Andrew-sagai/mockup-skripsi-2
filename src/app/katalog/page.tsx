'use client';

import { useState } from 'react';
import {
  ChipStatus,
  BadgeSifat,
  PenandaBatasWaktu,
  KonfirmasiDialog,
  UnggahPdf,
} from '@/components/ui';
import type { StatusSuratMasuk, StatusSuratKeluar, SifatSurat } from '@/lib/types';
import type { StatusDisposisi } from '@/lib/types';

// Kumpulan semua status untuk iterasi
const ALL_SM: StatusSuratMasuk[] = [
  'diagenda', 'menunggu_disposisi', 'didisposisikan',
  'diterima_bidang', 'diteruskan_ke_staf', 'menunggu_pemeriksaan', 'selesai',
];

const ALL_DISP: StatusDisposisi[] = [
  'menunggu_disposisi', 'didisposisikan', 'diterima_bidang',
  'diteruskan_ke_staf', 'menunggu_pemeriksaan', 'selesai', 'dikembalikan',
];

const ALL_SK: StatusSuratKeluar[] = [
  'draf', 'menunggu_paraf', 'perlu_revisi',
  'menunggu_ttd', 'ditandatangani', 'nomor_diterbitkan', 'terkirim',
];

const ALL_SIFAT: SifatSurat[] = [
  'biasa', 'umum', 'pemberitahuan', 'penting', 'segera', 'segera', 'rahasia',
];

export default function KatalogPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // Tanggal untuk demo tenggat
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  return (
    <div className="page-content" style={{ maxWidth: 900, margin: '0 auto' }}>
      <h1>Katalog Komponen (L00)</h1>
      <p style={{ color: 'var(--tinta-redup)', marginBottom: 32 }}>
        Halaman ini menampilkan setiap komponen bersama yang dipakai di seluruh mockup.
        Gunakan sebagai referensi visual saat mengembangkan halaman.
      </p>

      {/* --- Chip Status: Surat Masuk --- */}
      <section className="katalog-section">
        <h2>ChipStatus — Surat Masuk</h2>
        <div className="katalog-grid">
          {ALL_SM.map((s) => (
            <div key={s} className="katalog-item">
              <ChipStatus jenis="suratMasuk" status={s} />
              <code>{s}</code>
            </div>
          ))}
        </div>
      </section>

      {/* --- Chip Status: Disposisi --- */}
      <section className="katalog-section">
        <h2>ChipStatus — Disposisi</h2>
        <div className="katalog-grid">
          {ALL_DISP.map((s) => (
            <div key={s} className="katalog-item">
              <ChipStatus jenis="disposisi" status={s} />
              <code>{s}</code>
            </div>
          ))}
        </div>
      </section>

      {/* --- Chip Status: Surat Keluar --- */}
      <section className="katalog-section">
        <h2>ChipStatus — Surat Keluar</h2>
        <div className="katalog-grid">
          {ALL_SK.map((s) => (
            <div key={s} className="katalog-item">
              <ChipStatus jenis="suratKeluar" status={s} />
              <code>{s}</code>
            </div>
          ))}
        </div>
      </section>

      {/* --- Compact variants --- */}
      <section className="katalog-section">
        <h2>ChipStatus — Compact</h2>
        <div className="katalog-grid">
          {ALL_SM.slice(0, 4).map((s) => (
            <div key={s} className="katalog-item">
              <ChipStatus jenis="suratMasuk" status={s} compact />
              <code>compact</code>
            </div>
          ))}
        </div>
      </section>

      {/* --- BadgeSifat --- */}
      <section className="katalog-section">
        <h2>BadgeSifat</h2>
        <div className="katalog-grid">
          {ALL_SIFAT.map((s) => (
            <div key={s} className="katalog-item">
              <BadgeSifat sifat={s} />
              <code>{s}</code>
            </div>
          ))}
        </div>
      </section>

      {/* --- PenandaBatasWaktu --- */}
      <section className="katalog-section">
        <h2>PenandaBatasWaktu</h2>
        <div className="katalog-grid">
          <div className="katalog-item">
            <PenandaBatasWaktu tanggal={nextWeek} sekarang={today} />
            <code>normal (7 hari)</code>
          </div>
          <div className="katalog-item">
            <PenandaBatasWaktu tanggal={tomorrow} sekarang={today} />
            <code>mendekati (1 hari)</code>
          </div>
          <div className="katalog-item">
            <PenandaBatasWaktu tanggal={yesterday} sekarang={today} />
            <code>terlambat</code>
          </div>
        </div>
      </section>

      {/* --- KonfirmasiDialog --- */}
      <section className="katalog-section">
        <h2>KonfirmasiDialog</h2>
        <button
          className="btn btn-primary"
          onClick={() => setDialogOpen(true)}
        >
          Buka Dialog
        </button>
        <KonfirmasiDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onConfirm={() => {
            // Demo: tidak melakukan apa-apa
          }}
          judul="Konfirmasi Simpan Arsip"
          pesan="Surat masuk SM-2026-0042 akan disimpan ke arsip final."
          labelKonfirmasi="Simpan"
          bahaya
        />
      </section>

      {/* --- UnggahPdf --- */}
      <section className="katalog-section">
        <h2>UnggahPdf</h2>
        <div style={{ maxWidth: 400 }}>
          <UnggahPdf value={pdfUrl} onChange={setPdfUrl} />
        </div>
      </section>
    </div>
  );
}
