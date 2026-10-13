'use client';
import React, { useMemo } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { ChipStatus, BadgeSifat, PenandaBatasWaktu } from '@/components/ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Inbox, PenTool, AlertTriangle, Clock, ArrowRight, FileText, TrendingUp, CheckCircle2
} from 'lucide-react';

export default function KepalaDinasDashboard() {
  const { state } = useStore();
  const now = new Date();

  // ── Hitung ringkasan ───────────────────────────────────────────
  const menungguDisposisi = useMemo(
    () => state.suratMasuk.filter((s) => s.status === 'menunggu_disposisi').length,
    [state.suratMasuk]
  );

  const menungguTTD = useMemo(
    () => state.suratKeluar.filter((s) => s.status === 'menunggu_ttd').length,
    [state.suratKeluar]
  );

  const prioritas = useMemo(
    () => state.suratMasuk.filter((s) => s.sifat === 'segera' || s.sifat === 'penting').length,
    [state.suratMasuk]
  );

  const terlambat = useMemo(
    () => state.suratMasuk.filter((s) => {
      const bw = (s as any).batasWaktuSurat;
      if (!bw || s.status === 'selesai') return false;
      return new Date(bw) < now;
    }).length,
    [state.suratMasuk]
  );

  // ── Kinerja ────────────────────────────────────────────────────
  const totalDisp = state.disposisi.length;
  const selesaiDisp = state.disposisi.filter((d) => d.status === 'selesai').length;
  const terlambatDisp = state.disposisi.filter((d) => {
    if (!d.tenggat || d.status === 'selesai') return false;
    return new Date(d.tenggat) < now;
  }).length;

  // ── Daftar "Perlu Tindakan" — diurutkan prioritas lalu batas waktu ──
  const perluTindakanSM = useMemo(() => {
    return state.suratMasuk
      .filter((s) => s.status === 'menunggu_disposisi')
      .sort((a, b) => {
        // prioritas: segera > segera > penting > rahasia > lain
        const pRank = (s: any) => {
          if (s.sifat === 'segera') return 0;
          if (s.sifat === 'segera') return 1;
          if (s.sifat === 'penting') return 2;
          if (s.sifat === 'rahasia') return 3;
          return 4;
        };
        const pr = pRank(a) - pRank(b);
        if (pr !== 0) return pr;
        const bwA = (a as any).batasWaktuSurat ? new Date((a as any).batasWaktuSurat).getTime() : Infinity;
        const bwB = (b as any).batasWaktuSurat ? new Date((b as any).batasWaktuSurat).getTime() : Infinity;
        return bwA - bwB;
      });
  }, [state.suratMasuk]);

  const perluTTD = useMemo(
    () => state.suratKeluar.filter((s) => s.status === 'menunggu_ttd'),
    [state.suratKeluar]
  );

  // ── Grafik 6 bulan terakhir ────────────────────────────────────
  const chartData = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - (5 - i));
    const year = d.getFullYear();
    const month = d.getMonth();
    const monthName = d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
    const masuk = state.suratMasuk.filter((s) => {
      const sd = new Date(s.createdAt);
      return sd.getFullYear() === year && sd.getMonth() === month;
    }).length;
    const keluar = state.suratKeluar.filter((s) => {
      const sd = new Date(s.createdAt);
      return sd.getFullYear() === year && sd.getMonth() === month;
    }).length;
    return { name: monthName, masuk, keluar };
  }), [state.suratMasuk, state.suratKeluar]);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Dashboard Kepala Dinas</h1>
          <p>Ringkasan persuratan dan antrean tindakan</p>
        </div>
      </div>

      {/* ─── Kartu Ringkasan ─────────────────────────────── */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card primary" id="stat-kd-disposisi">
          <div className="stat-icon primary"><Inbox size={24} aria-hidden="true" /></div>
          <div className="stat-content">
            <div className="stat-label">Menunggu Disposisi</div>
            <div className="stat-value">{menungguDisposisi}</div>
          </div>
        </div>
        <div className="stat-card warning" id="stat-kd-ttd">
          <div className="stat-icon warning"><PenTool size={24} aria-hidden="true" /></div>
          <div className="stat-content">
            <div className="stat-label">Menunggu Tanda Tangan</div>
            <div className="stat-value">{menungguTTD}</div>
          </div>
        </div>
        <div className="stat-card danger" id="stat-kd-prioritas">
          <div className="stat-icon danger"><AlertTriangle size={24} aria-hidden="true" /></div>
          <div className="stat-content">
            <div className="stat-label">Surat Prioritas</div>
            <div className="stat-value">{prioritas}</div>
          </div>
        </div>
        <div className="stat-card danger" id="stat-kd-terlambat">
          <div className="stat-icon danger"><Clock size={24} aria-hidden="true" /></div>
          <div className="stat-content">
            <div className="stat-label">Melewati Batas Waktu</div>
            <div className="stat-value">{terlambat}</div>
          </div>
        </div>
      </div>

      {/* ─── Perlu Tindakan Langsung ─────────────────────── */}
      <div className="card" style={{ marginBottom: 24 }} id="panel-perlu-tindakan">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 14 }}>Perlu Tindakan Langsung ({perluTindakanSM.length + perluTTD.length})</h2>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {perluTindakanSM.length === 0 && perluTTD.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <CheckCircle2 size={40} style={{ color: 'var(--success)', marginBottom: 12 }} />
              <p style={{ color: 'var(--text-muted)' }}>Tidak ada item yang perlu tindakan saat ini.</p>
            </div>
          ) : (
            <table className="data-table compact-table">
              <tbody>
                {/* Surat masuk menunggu disposisi */}
                {perluTindakanSM.length > 0 && (
                  <tr>
                    <td colSpan={5} style={{ background: 'var(--latar)', fontSize: 12, fontWeight: 700, color: 'var(--tinta-redup)', textTransform: 'uppercase', letterSpacing: '0.04em', padding: '6px 16px' }}>
                      Menunggu Disposisi ({perluTindakanSM.length})
                    </td>
                  </tr>
                )}
                {perluTindakanSM.map((s) => {
                  const disp = state.disposisi.find((d) => d.suratMasukId === s.id);
                  return (
                    <tr key={`sm-${s.id}`}>
                      <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--tinta-redup)', whiteSpace: 'nowrap' }}>{s.nomorAgenda}</td>
                      <td>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{s.perihal}</div>
                        <div style={{ fontSize: 11, color: 'var(--tinta-redup)' }}>{s.asalSurat}</div>
                      </td>
                      <td><BadgeSifat sifat={s.sifat} /></td>
                      <td>
                        {(s as any).batasWaktuSurat
                          ? <PenandaBatasWaktu tanggal={(s as any).batasWaktuSurat} sekarang={now} />
                          : <span style={{ color: 'var(--tinta-redup)', fontSize: 12 }}>—</span>}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Link
                          href={disp ? `/disposisi/${disp.id}` : `/surat-masuk/${s.id}`}
                          className="btn btn-sm btn-primary"
                          style={{ whiteSpace: 'nowrap' }}
                        >
                          Disposisikan <ArrowRight size={13} aria-hidden="true" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}

                {/* Surat keluar menunggu TTD */}
                {perluTTD.length > 0 && (
                  <tr>
                    <td colSpan={5} style={{ background: 'var(--latar)', fontSize: 12, fontWeight: 700, color: 'var(--tinta-redup)', textTransform: 'uppercase', letterSpacing: '0.04em', padding: '6px 16px' }}>
                      Menunggu Tanda Tangan ({perluTTD.length})
                    </td>
                  </tr>
                )}
                {perluTTD.map((s) => (
                  <tr key={`sk-${s.id}`}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--tinta-redup)' }}>SK</td>
                    <td>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{s.perihal}</div>
                      <div style={{ fontSize: 11, color: 'var(--tinta-redup)' }}>Tujuan: {s.tujuan}</div>
                    </td>
                    <td><BadgeSifat sifat={(s as any).sifat || 'biasa'} /></td>
                    <td><span style={{ color: 'var(--tinta-redup)', fontSize: 12 }}>—</span></td>
                    <td style={{ textAlign: 'right' }}>
                      <Link href={`/surat-keluar/${s.id}`} className="btn btn-sm btn-primary" style={{ whiteSpace: 'nowrap' }}>
                        Tanda Tangani <ArrowRight size={13} aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ─── Grafik + Ringkasan Kinerja ──────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Grafik rekap 6 bulan */}
        <div className="card" id="panel-grafik-rekap">
          <div className="card-header">
            <h2 style={{ fontSize: 14 }}>Rekap Persuratan 6 Bulan</h2>
          </div>
          <div className="card-body" style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ left: 0, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--garis)" horizontal={false} />
                <XAxis dataKey="name" fontSize={11} axisLine={false} tickLine={false} />
                <YAxis fontSize={11} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: 'var(--pinus-tint)' }} />
                <Bar dataKey="masuk" fill="var(--pinus)" name="Surat Masuk" radius={[4, 4, 0, 0]} barSize={12} />
                <Bar dataKey="keluar" fill="var(--menunggu)" name="Surat Keluar" radius={[4, 4, 0, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Ringkasan kinerja */}
        <div className="card" id="panel-kinerja">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 14 }}>Ringkasan Kinerja Disposisi</h2>
            <Link href="/laporan" className="btn btn-sm btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <TrendingUp size={13} aria-hidden="true" /> Detail
            </Link>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { label: 'Total Disposisi', val: totalDisp, icon: <FileText size={16} aria-hidden="true" />, color: 'var(--tinta)' },
                { label: 'Selesai', val: selesaiDisp, icon: <CheckCircle2 size={16} aria-hidden="true" />, color: 'var(--pinus)' },
                { label: 'Terlambat / Melewati Tenggat', val: terlambatDisp, icon: <AlertTriangle size={16} aria-hidden="true" />, color: terlambatDisp > 0 ? 'var(--rahasia)' : 'var(--tinta)' },
              ].map((item) => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: item.color, fontSize: 13 }}>
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  <span style={{ fontWeight: 700, fontSize: 20, fontVariantNumeric: 'tabular-nums', color: item.color }}>
                    {item.val}
                  </span>
                </div>
              ))}
              {/* Progress bar selesai */}
              <div style={{ marginTop: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--tinta-redup)', marginBottom: 4 }}>
                  <span>Tingkat Penyelesaian</span>
                  <span>{totalDisp > 0 ? Math.round((selesaiDisp / totalDisp) * 100) : 0}%</span>
                </div>
                <div style={{ height: 8, background: 'var(--garis)', borderRadius: 100, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: 'var(--pinus)', borderRadius: 100, width: `${totalDisp > 0 ? (selesaiDisp / totalDisp) * 100 : 0}%`, transition: 'width 0.6s ease' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
