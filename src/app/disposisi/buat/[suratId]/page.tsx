'use client';
import React, { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useStore } from '@/lib/store';
import { useBusinessLogic } from '@/lib/api';
import { SIFAT_SURAT_LABELS } from '@/lib/types';
import { BadgeSifat, PenandaBatasWaktu } from '@/components/ui';
import {
  ArrowLeft, Send, CheckCircle2, AlertCircle, FileText, Lock, Bell
} from 'lucide-react';

export default function BuatDisposisiPage({ params }: { params: Promise<{ suratId: string }> }) {
  const { suratId } = use(params);
  const router = useRouter();
  const { state, getKlasifikasi } = useStore();
  const { apiBuatDisposisi } = useBusinessLogic();

  const [errorMsg, setErrorMsg] = useState('');
  const [sending, setSending]   = useState(false);

  const sm         = state.suratMasuk.find((s) => s.id === suratId);
  const disposisi  = state.disposisi.find((d) => d.suratMasukId === suratId);
  const klasifikasi = sm ? getKlasifikasi(sm.klasifikasiId) : null;
  const now        = new Date();

  if (!sm) {
    return (
      <DashboardLayout>
        <div className="empty-state" style={{ padding: '60px 24px' }}>
          <AlertCircle size={48} style={{ color: 'var(--rahasia)' }} aria-hidden="true" />
          <h3>Data Surat Tidak Ditemukan</h3>
          <p style={{ color: 'var(--tinta-redup)', marginBottom: 16 }}>
            Surat masuk dengan ID tersebut tidak ada dalam sistem.
          </p>
          <button className="btn btn-primary" onClick={() => router.push('/surat-masuk')}>
            Kembali ke Daftar Surat
          </button>
        </div>
      </DashboardLayout>
    );
  }

  // Sudah diajukan bila disposisi ada atau status bukan 'diagenda'
  const sudahDiajukan = !!disposisi || sm.status !== 'diagenda';

  // ── Kirim ke Kepala Dinas ─────────────────────────────────────
  const handleAjukan = async () => {
    setErrorMsg('');
    setSending(true);
    try {
      apiBuatDisposisi(sm.id);
      // State otomatis berubah — komponen akan re-render ke keadaan sudahDiajukan
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setSending(false);
    }
  };

  // ── Sifat checklist mengikuti format lembar disposisi fisik ──
  const sifatChecklist = [
    { key: 'segera',  label: 'Segera' },
    { key: 'penting', label: 'Penting' },
    { key: 'rahasia', label: 'Rahasia' },
    { key: 'biasa',   label: 'Biasa' },
  ];

  const isSifatChecked = (key: string) => {
    if (key === 'segera')  return sm.sifat === 'segera';
    if (key === 'penting') return sm.sifat === 'penting';
    if (key === 'rahasia') return sm.sifat === 'rahasia';
    if (key === 'biasa')   return sm.sifat === 'biasa' || sm.sifat === 'umum';
    return false;
  };

  // Bidang tujuan — dikosongkan, diisi Kepala Dinas
  const bidangTujuan = state.unitKerja.filter((u) => u.aktif);

  return (
    <DashboardLayout>
      <div className="animate-fadeIn" style={{ maxWidth: 860, margin: '0 auto', paddingBottom: 48 }}>

        {/* Navigasi */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <Link href={`/surat-masuk/${sm.id}`} className="btn btn-ghost btn-sm">
            <ArrowLeft size={16} aria-hidden="true" /> Kembali ke Detail Surat
          </Link>
          <code style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--pinus)', background: 'var(--pinus-tint)', padding: '4px 10px', borderRadius: 4 }}>
            No. Agenda: {sm.nomorAgenda}
          </code>
        </div>

        {/* ─── Banner: sudah diajukan ─────────────────────────── */}
        {sudahDiajukan && (
          <div className="disp-banner-sukses" id="banner-disposisi-terkirim" role="status">
            <CheckCircle2 size={24} aria-hidden="true" />
            <div>
              <strong>Kartu Disposisi Berhasil Diajukan</strong>
              <p style={{ margin: '4px 0 0', fontSize: 13 }}>
                Status surat berubah menjadi <strong>"Menunggu Disposisi"</strong>. Notifikasi diteruskan ke Kepala Dinas.
              </p>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexShrink: 0 }}>
              <button className="btn btn-sm btn-ghost" onClick={() => router.push(`/surat-masuk/${sm.id}`)}>
                Detail Surat
              </button>
              <button
                className="btn btn-sm btn-primary"
                onClick={() => router.push(disposisi ? `/disposisi/${disposisi.id}` : '/disposisi')}
              >
                Lihat di Disposisi
              </button>
            </div>
          </div>
        )}

        {/* ─── Banner: siap diajukan ──────────────────────────── */}
        {!sudahDiajukan && (
          <div className="disp-banner-info" id="banner-disposisi-siap">
            <FileText size={20} aria-hidden="true" />
            <div>
              <strong>Kartu Disposisi Digital — Siap Diajukan</strong>
              <p style={{ margin: '4px 0 0', fontSize: 13 }}>
                Data surat telah terisi otomatis dari agenda. Periksa kelengkapan sebelum mengajukan ke Kepala Dinas.
              </p>
            </div>
          </div>
        )}

        {/* Galat */}
        {errorMsg && (
          <div className="modal-error" role="alert" style={{ marginTop: 12 }}>
            <AlertCircle size={16} aria-hidden="true" />
            {errorMsg}
          </div>
        )}

        {/* ─── Lembar Disposisi ──────────────────────────────── */}
        <div className="lembar-disposisi">

          {/* KOP */}
          <div className="lembar-kop">
            <img src="/logo.png" alt="Logo Minahasa Selatan" className="lembar-kop-logo" />
            <div className="lembar-kop-teks">
              <div className="lembar-kop-instansi">Pemerintah Kabupaten Minahasa Selatan</div>
              <div className="lembar-kop-dinas">Dinas Pertanian</div>
              <div className="lembar-kop-alamat">Kompleks Perkantoran Pemerintah Kabupaten Minahasa Selatan — Amurang</div>
              <div className="lembar-kop-judul">Lembar Disposisi Digital</div>
            </div>
          </div>

          {/* BAGIAN I: Data Surat — hanya baca, terisi otomatis */}
          <div className="lembar-seksi">
            <div className="lembar-seksi-judul">
              <span>Bagian I — Data Surat Masuk (Terisi Otomatis)</span>
              <span className="lembar-seksi-tag">✓ Diagendakan</span>
            </div>

            <table className="lembar-tabel-data">
              <tbody>
                <tr>
                  <td className="lembar-td-label">Surat Dari</td>
                  <td className="lembar-td-isi">{sm.asalSurat}</td>
                  <td className="lembar-td-label">Diterima Tgl.</td>
                  <td className="lembar-td-isi">
                    {new Date(sm.tanggalTerima).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </td>
                </tr>
                <tr>
                  <td className="lembar-td-label">No. Surat</td>
                  <td className="lembar-td-isi">{sm.nomorSuratAsal}</td>
                  <td className="lembar-td-label">No. Agenda</td>
                  <td className="lembar-td-isi" style={{ fontWeight: 700, color: 'var(--menunggu)', fontFamily: 'monospace' }}>
                    {sm.nomorAgenda}
                  </td>
                </tr>
                <tr>
                  <td className="lembar-td-label">Tgl. Surat</td>
                  <td className="lembar-td-isi">
                    {sm.tanggalSuratAsal
                      ? new Date(sm.tanggalSuratAsal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                      : '—'}
                  </td>
                  <td className="lembar-td-label">Sifat</td>
                  <td className="lembar-td-isi">
                    <BadgeSifat sifat={sm.sifat} />
                  </td>
                </tr>
                <tr>
                  <td className="lembar-td-label">Batas Waktu</td>
                  <td className="lembar-td-isi">
                    {(sm as any).batasWaktu
                      ? <PenandaBatasWaktu tanggal={(sm as any).batasWaktu} sekarang={now} />
                      : <span style={{ color: 'var(--tinta-redup)', fontSize: 12 }}>Tidak ditetapkan</span>}
                  </td>
                  <td className="lembar-td-label" />
                  <td className="lembar-td-isi" />
                </tr>
                <tr>
                  <td className="lembar-td-label" style={{ verticalAlign: 'top', paddingTop: 10 }}>Perihal</td>
                  <td className="lembar-td-isi" colSpan={3} style={{ fontWeight: 600 }}>
                    {sm.perihal}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Sifat checklist mengikuti lembar fisik */}
            <div className="lembar-sifat-grid">
              {sifatChecklist.map((opt) => {
                const checked = isSifatChecked(opt.key);
                return (
                  <label
                    key={opt.key}
                    className={`lembar-sifat-item${checked ? ' lembar-sifat-item-aktif' : ''}`}
                  >
                    <input type="checkbox" checked={checked} readOnly disabled aria-hidden="true" />
                    <span>{opt.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* BAGIAN II: Wewenang Kepala Dinas — TERKUNCI */}
          <div className="lembar-seksi lembar-seksi-terkunci">
            <div className="lembar-terkunci-label">
              <Lock size={13} aria-hidden="true" />
              Diisi Kepala Dinas
            </div>

            <div className="lembar-grid-2">
              {/* Diteruskan kepada */}
              <div className="lembar-kotak">
                <div className="lembar-kotak-judul">Diteruskan kepada:</div>
                <div style={{ fontSize: 11, color: 'var(--tinta-redup)', fontStyle: 'italic', marginBottom: 10 }}>
                  Pilihan bidang merupakan wewenang mutlak Kepala Dinas
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, opacity: 0.5 }}>
                  {bidangTujuan.map((u) => (
                    <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'not-allowed' }}>
                      <input type="checkbox" disabled readOnly style={{ width: 14, height: 14 }} aria-hidden="true" />
                      <span style={{ color: 'var(--tinta-redup)' }}>{u.nama}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Instruksi + Paraf */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="lembar-kotak" style={{ flex: 1 }}>
                  <div className="lembar-kotak-judul">Dengan hormat harap:</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, opacity: 0.5, fontSize: 12 }}>
                    {['Tanggapan dan Saran', 'Proses Lebih Lanjut', 'Koordinasi / Konfirmasi', 'Lainnya'].map((teks) => (
                      <label key={teks} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'not-allowed' }}>
                        <input type="checkbox" disabled readOnly style={{ width: 14, height: 14 }} aria-hidden="true" />
                        <span style={{ color: 'var(--tinta-redup)' }}>{teks}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="lembar-kotak lembar-kotak-catatan">
                  <div className="lembar-kotak-judul">Catatan:</div>
                  <div style={{ height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.4, fontSize: 12, fontStyle: 'italic' }}>
                    (Kosong — diisi Kepala Dinas)
                  </div>
                </div>

                <div className="lembar-kotak lembar-kotak-paraf">
                  <div className="lembar-kotak-judul" style={{ textAlign: 'center' }}>Paraf dan Tanggal</div>
                  <div style={{ height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.4, fontSize: 12, fontStyle: 'italic' }}>
                    (Menunggu Paraf Kadis)
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AKSI TUNGGAL — Ajukan ke Kepala Dinas */}
          {!sudahDiajukan && (
            <div className="lembar-aksi">
              <div style={{ fontSize: 13, color: 'var(--tinta-redup)' }}>
                Petugas: <strong>{state.currentUser?.nama}</strong>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn-ghost" onClick={() => router.push(`/surat-masuk/${sm.id}`)}>
                  Batal
                </button>
                <button
                  id="btn-ajukan-kadin"
                  className="btn btn-primary"
                  onClick={handleAjukan}
                  disabled={sending}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 600 }}
                >
                  {sending
                    ? <><Send size={16} aria-hidden="true" /> Mengajukan…</>
                    : <><Send size={16} aria-hidden="true" /> Ajukan ke Kepala Dinas</>
                  }
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Notifikasi info */}
        {!sudahDiajukan && (
          <div className="admin-info-box" style={{ marginTop: 16 }}>
            <Bell size={15} aria-hidden="true" />
            <span>
              Setelah diajukan, Kepala Dinas akan menerima notifikasi dan mengisi bagian disposisi (Bagian II).
              Setiap surat masuk wajib diproses melalui disposisi ke Kepala Bidang (AT-02).
            </span>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
