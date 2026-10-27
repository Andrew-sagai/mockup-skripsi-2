'use client';
import React, { useMemo } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { STATUS_SURAT_KELUAR_LABELS } from '@/lib/types';
import { ChipStatus, PenandaBatasWaktu } from '@/components/ui';
import { MailOpen, Send, Clock, FileCheck, Book, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { urutkanTerbaru } from '@/lib/utils';

export default function PetugasDashboard() {
  const { state } = useStore();
  const now = new Date();

  // ── Ringkasan bulan berjalan ────────────────────────────────
  const bulanIni = useMemo(() => {
    const m = now.getMonth();
    const y = now.getFullYear();
    return {
      suratMasuk: state.suratMasuk.filter((s) => {
        const d = new Date(s.createdAt);
        return d.getMonth() === m && d.getFullYear() === y;
      }).length,
      suratKeluar: state.suratKeluar.filter((s) => {
        const d = new Date(s.createdAt);
        return d.getMonth() === m && d.getFullYear() === y;
      }).length,
    };
  }, [state.suratMasuk, state.suratKeluar]);

  const menungguDisposisi = state.suratMasuk.filter((s) => s.status === 'menunggu_disposisi').length;
  const menungguNomor     = state.suratKeluar.filter((s) => s.status === 'ditandatangani').length;
  const terkirim          = state.suratKeluar.filter((s) => s.status === 'terkirim').length;

  // Surat masuk diagenda (belum diajukan disposisi) — perlu tindakan Petugas
  // P5: terbaru di atas agar entri baru langsung tampil pertama
  const perluDisposisi = urutkanTerbaru(
    state.suratMasuk.filter((s) => s.status === 'diagenda'),
    (s) => s.createdAt,
  );

  // Surat masuk terbaru
  const suratMasukTerbaru = urutkanTerbaru(state.suratMasuk, (s) => s.createdAt).slice(0, 5);

  // Peringatan batas waktu: surat masuk batas waktu ≤ 2 hari ke depan, belum selesai
  const peringatanBatasWaktu = state.suratMasuk.filter((s) => {
    if (!(s as any).batasWaktu || s.status === 'selesai') return false;
    const sisa = (new Date((s as any).batasWaktu).getTime() - now.getTime()) / 86400000;
    return sisa <= 2;
  });

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Dashboard Petugas Surat</h1>
          <p>Ringkasan aktivitas dan antrean tindakan hari ini</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link id="btn-catat-surat-masuk" href="/surat-masuk/baru" className="btn btn-primary">
            Catat Surat Masuk
          </Link>
          <Link id="btn-buat-surat-keluar" href="/surat-keluar/baru" className="btn btn-ghost">
            Buat Surat Keluar
          </Link>
        </div>
      </div>

      {/* ─── Kartu Ringkasan ─────────────────────────────── */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card primary" id="stat-masuk-bulan">
          <div className="stat-icon primary"><MailOpen size={24} aria-hidden="true" /></div>
          <div className="stat-content">
            <div className="stat-label">Surat Masuk Bulan Ini</div>
            <div className="stat-value">{bulanIni.suratMasuk}</div>
          </div>
        </div>
        <div className="stat-card warning" id="stat-menunggu-disposisi">
          <div className="stat-icon warning"><Clock size={24} aria-hidden="true" /></div>
          <div className="stat-content">
            <div className="stat-label">Menunggu Disposisi</div>
            <div className="stat-value">{menungguDisposisi}</div>
          </div>
        </div>
        <div className="stat-card danger" id="stat-menunggu-nomor">
          <div className="stat-icon danger"><FileCheck size={24} aria-hidden="true" /></div>
          <div className="stat-content">
            <div className="stat-label">SK Menunggu Penomoran</div>
            <div className="stat-value">{menungguNomor}</div>
          </div>
        </div>
        <div className="stat-card success" id="stat-sk-terkirim">
          <div className="stat-icon success"><Send size={24} aria-hidden="true" /></div>
          <div className="stat-content">
            <div className="stat-label">Surat Keluar Terkirim</div>
            <div className="stat-value">{terkirim}</div>
          </div>
        </div>
      </div>

      {/* ─── Peringatan Batas Waktu ─────────────────────── */}
      {peringatanBatasWaktu.length > 0 && (
        <div className="card" style={{ marginBottom: 24, borderLeft: '4px solid var(--rahasia)' }} id="panel-peringatan-batas">
          <div className="card-header">
            <h2 style={{ fontSize: 14, color: 'var(--rahasia)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={16} aria-hidden="true" />
              Peringatan Batas Waktu ({peringatanBatasWaktu.length})
            </h2>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <table className="data-table compact-table">
              <tbody>
                {peringatanBatasWaktu.map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--tinta-redup)', whiteSpace: 'nowrap' }}>{s.nomorAgenda}</td>
                    <td style={{ fontWeight: 500, fontSize: 13 }}>{s.perihal}</td>
                    <td><PenandaBatasWaktu tanggal={(s as any).batasWaktu} sekarang={now} /></td>
                    <td style={{ textAlign: 'right' }}>
                      <Link href={`/surat-masuk/${s.id}`} className="btn btn-sm btn-ghost">Buka</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

        {/* ─── Antrean Disposisi ───────────────────────── */}
        <div className="card" id="panel-antrean-disposisi">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 14 }}>Perlu Kartu Disposisi ({perluDisposisi.length})</h2>
            <Link href="/surat-masuk" className="btn btn-sm btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              Lihat semua <ArrowRight size={13} aria-hidden="true" />
            </Link>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {perluDisposisi.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px 0' }}>
                <CheckCircle2 size={40} style={{ color: 'var(--success)', marginBottom: 12 }} />
                <p style={{ color: 'var(--text-muted)' }}>Tidak ada surat yang perlu dibuatkan kartu disposisi.</p>
              </div>
            ) : (
              <table className="data-table compact-table">
                <tbody>
                  {perluDisposisi.slice(0, 6).map((s) => (
                    <tr key={s.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--tinta-redup)', whiteSpace: 'nowrap' }}>{s.nomorAgenda}</td>
                      <td style={{ fontWeight: 500, fontSize: 13 }}>{s.perihal}</td>
                      <td style={{ textAlign: 'right' }}>
                        <Link
                          href={`/disposisi/buat/${s.id}`}
                          className="btn btn-sm btn-primary"
                          style={{ whiteSpace: 'nowrap' }}
                        >
                          Buat Disposisi
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ─── Surat Masuk Terbaru ─────────────────────── */}
        <div className="card" id="panel-sm-terbaru">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 14 }}>Surat Masuk Terbaru</h2>
            <Link href="/surat-masuk" className="btn btn-sm btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              Semua <ArrowRight size={13} aria-hidden="true" />
            </Link>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {suratMasukTerbaru.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px 0' }}>
                <CheckCircle2 size={40} style={{ color: 'var(--success)', marginBottom: 12 }} />
                <p style={{ color: 'var(--text-muted)' }}>Belum ada surat masuk.</p>
              </div>
            ) : (
              <table className="data-table compact-table">
                <tbody>
                  {suratMasukTerbaru.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{s.perihal}</div>
                        <div style={{ fontSize: 11, color: 'var(--tinta-redup)' }}>{s.asalSurat}</div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <ChipStatus jenis="suratMasuk" status={s.status} compact />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* ─── Pintasan Buku Agenda ────────────────────────── */}
      <div className="card" style={{ marginTop: 24 }} id="panel-pintasan-agenda">
        <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 24px' }}>
          <Book size={20} style={{ color: 'var(--pinus)' }} aria-hidden="true" />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>Buku Agenda Digital</div>
            <div style={{ fontSize: 12, color: 'var(--tinta-redup)' }}>
              Catatan lengkap semua surat masuk yang telah diagendakan
            </div>
          </div>
          <Link href="/surat-masuk" className="btn btn-ghost btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            Buka Agenda <ArrowRight size={13} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
