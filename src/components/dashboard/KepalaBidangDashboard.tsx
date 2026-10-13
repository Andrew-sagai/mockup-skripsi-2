'use client';
import React, { useMemo } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { JENIS_INSTRUKSI_LABELS } from '@/lib/types';
import { ChipStatus, BadgeSifat, PenandaBatasWaktu } from '@/components/ui';
import { FileCheck, Users, Clock, AlertTriangle, ArrowRight, ClipboardList, CheckCircle2 } from 'lucide-react';

export default function KepalaBidangDashboard() {
  const { state, getScopedDisposisi } = useStore();
  const user = state.currentUser;
  const now = new Date();

  const myDisposisi = getScopedDisposisi();
  const unitKerja = state.unitKerja.find(u => u.id === user?.unitKerjaId);

  const menungguParafTerima = useMemo(() =>
    myDisposisi.filter(d =>
      d.bidangTujuan.find(b => b.unitKerjaId === user?.unitKerjaId)?.statusTerima === 'belum'
    ).length,
    [myDisposisi, user?.unitKerjaId]
  );

  const sedangProses = useMemo(() =>
    myDisposisi.filter(d =>
      d.status !== 'selesai' &&
      d.bidangTujuan.find(b => b.unitKerjaId === user?.unitKerjaId)?.statusTerima === 'diterima'
    ).length,
    [myDisposisi, user?.unitKerjaId]
  );

  const menungguPeriksa = useMemo(() =>
    myDisposisi.filter(d => {
      const statPerBidang = d.statusPerBidang?.[user?.unitKerjaId || ''];
      return statPerBidang?.status === 'menunggu_pemeriksaan';
    }).length,
    [myDisposisi, user?.unitKerjaId]
  );

  const terlambat = useMemo(() =>
    myDisposisi.filter(d => {
      if (d.status === 'selesai') return false;
      return d.tenggat && new Date(d.tenggat) < now;
    }).length,
    [myDisposisi]
  );

  if (!user) return null;

  const myStaf = state.users.filter(u => u.role === 'staf_pelaksana' && u.unitKerjaId === user.unitKerjaId);
  const stafBeban = myStaf.map(s => {
    const tugas = state.penugasan.filter(p => p.stafId === s.id);
    const aktif = tugas.filter(p => p.status !== 'selesai').length;
    return { ...s, totalTugas: tugas.length, tugasAktif: aktif };
  });

  const menungguTerimaBaris = myDisposisi.filter(d =>
    d.bidangTujuan.find(b => b.unitKerjaId === user.unitKerjaId)?.statusTerima === 'belum'
  );

  const sedangProsesBaris = myDisposisi.filter(d =>
    d.status !== 'selesai' &&
    d.bidangTujuan.find(b => b.unitKerjaId === user.unitKerjaId)?.statusTerima === 'diterima'
  );

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Dashboard Kepala Bidang</h1>
          <p>{unitKerja?.nama || 'Bidang'} — Disposisi dan tindak lanjut</p>
        </div>
      </div>

      {/* ─── Kartu Ringkasan ──────────────────────────────── */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card primary" id="stat-kabid-paraf-terima">
          <div className="stat-icon primary"><FileCheck size={24} aria-hidden="true" /></div>
          <div className="stat-content">
            <div className="stat-label">Menunggu Paraf Terima</div>
            <div className="stat-value">{menungguParafTerima}</div>
          </div>
        </div>
        <div className="stat-card warning" id="stat-kabid-proses">
          <div className="stat-icon warning"><ClipboardList size={24} aria-hidden="true" /></div>
          <div className="stat-content">
            <div className="stat-label">Sedang Ditindaklanjuti</div>
            <div className="stat-value">{sedangProses}</div>
          </div>
        </div>
        <div className="stat-card danger" id="stat-kabid-periksa">
          <div className="stat-icon danger"><AlertTriangle size={24} aria-hidden="true" /></div>
          <div className="stat-content">
            <div className="stat-label">Menunggu Pemeriksaan</div>
            <div className="stat-value">{menungguPeriksa}</div>
          </div>
        </div>
        <div className="stat-card danger" id="stat-kabid-terlambat">
          <div className="stat-icon danger"><Clock size={24} aria-hidden="true" /></div>
          <div className="stat-content">
            <div className="stat-label">Terlambat</div>
            <div className="stat-value">{terlambat}</div>
          </div>
        </div>
      </div>

      {/* ─── Antrean Tindakan ─────────────────────────────── */}
      <div className="card" style={{ marginBottom: 24 }} id="panel-kabid-antrean">
        <div className="card-header">
          <h2 style={{ fontSize: 14 }}>Disposisi Masuk — Perlu Tindakan</h2>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {menungguTerimaBaris.length === 0 && sedangProsesBaris.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <CheckCircle2 size={40} style={{ color: 'var(--success)', marginBottom: 12 }} />
              <p style={{ color: 'var(--text-muted)' }}>Tidak ada disposisi yang memerlukan tindakan.</p>
            </div>
          ) : (
            <table className="data-table compact-table">
              <thead>
                <tr>
                  <th>No. Agenda</th>
                  <th>Perihal</th>
                  <th>Instruksi</th>
                  <th>Sifat</th>
                  <th>Batas Waktu</th>
                  <th style={{ textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {menungguTerimaBaris.length > 0 && (
                  <tr><td colSpan={6} style={{ background: 'var(--latar)', fontSize: 12, fontWeight: 700, color: 'var(--tinta-redup)', textTransform: 'uppercase', letterSpacing: '0.04em', padding: '6px 16px' }}>
                    Menunggu Paraf Terima ({menungguTerimaBaris.length})
                  </td></tr>
                )}
                {menungguTerimaBaris.map(d => {
                  const sm = state.suratMasuk.find(s => s.id === d.suratMasukId);
                  return (
                    <tr key={`terima-${d.id}`}>
                      <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--tinta-redup)', whiteSpace: 'nowrap' }}>{sm?.nomorAgenda}</td>
                      <td style={{ fontWeight: 500, fontSize: 13 }}>{sm?.perihal}</td>
                      <td style={{ fontSize: 12 }}>{JENIS_INSTRUKSI_LABELS[d.instruksi]}</td>
                      <td><BadgeSifat sifat={sm?.sifat || 'biasa'} /></td>
                      <td>
                        {(sm as any)?.batasWaktuSurat
                          ? <PenandaBatasWaktu tanggal={(sm as any).batasWaktuSurat} sekarang={now} />
                          : <span style={{ fontSize: 12, color: 'var(--tinta-redup)' }}>—</span>}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Link href={`/disposisi/${d.id}`} className="btn btn-sm btn-primary">Terima & Paraf</Link>
                      </td>
                    </tr>
                  );
                })}
                {sedangProsesBaris.length > 0 && (
                  <tr><td colSpan={6} style={{ background: 'var(--latar)', fontSize: 12, fontWeight: 700, color: 'var(--tinta-redup)', textTransform: 'uppercase', letterSpacing: '0.04em', padding: '6px 16px' }}>
                    Sedang Ditindaklanjuti ({sedangProsesBaris.length})
                  </td></tr>
                )}
                {sedangProsesBaris.map(d => {
                  const sm = state.suratMasuk.find(s => s.id === d.suratMasukId);
                  return (
                    <tr key={`proses-${d.id}`}>
                      <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--tinta-redup)', whiteSpace: 'nowrap' }}>{sm?.nomorAgenda}</td>
                      <td style={{ fontWeight: 500, fontSize: 13 }}>
                        {sm?.perihal}
                        {d.catatanKoordinasiSekdin && <span style={{ fontSize: 10, color: 'var(--menunggu)', marginLeft: 6 }}>[Ada catatan Sekretaris]</span>}
                      </td>
                      <td style={{ fontSize: 12 }}>{JENIS_INSTRUKSI_LABELS[d.instruksi]}</td>
                      <td><BadgeSifat sifat={sm?.sifat || 'biasa'} /></td>
                      <td>
                        {d.tenggat
                          ? <PenandaBatasWaktu tanggal={d.tenggat} sekarang={now} />
                          : <span style={{ fontSize: 12, color: 'var(--tinta-redup)' }}>—</span>}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Link href={`/disposisi/${d.id}`} className="btn btn-sm btn-ghost">Tinjau</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ─── Beban Tugas Staf ─────────────────────────────── */}
      <div className="card" id="panel-kabid-staf">
        <div className="card-header">
          <h2 style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Users size={15} aria-hidden="true" /> Tindak Lanjut Staf di Bidang Saya
          </h2>
        </div>
        <div className="card-body">
          {stafBeban.length === 0 ? (
            <p style={{ color: 'var(--tinta-redup)', fontSize: 13 }}>Tidak ada staf di bidang ini.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {stafBeban.map(s => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 6, background: 'var(--pinus-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--pinus)', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                    {s.nama.split(' ')[0][0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{s.nama}</div>
                    <div style={{ fontSize: 11, color: 'var(--tinta-redup)' }}>{s.tugasAktif} aktif · {s.totalTugas} total</div>
                    <div style={{ marginTop: 4, height: 6, background: 'var(--garis)', borderRadius: 100, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 100, width: s.totalTugas > 0 ? `${(s.tugasAktif / Math.max(s.totalTugas, 1)) * 100}%` : '0%', background: s.tugasAktif > 3 ? 'var(--rahasia)' : 'var(--pinus)', transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                  <span className={`chip ${s.tugasAktif > 3 ? 'chip-bahaya' : s.tugasAktif > 0 ? 'chip-pending' : 'chip-sukses'}`} style={{ fontSize: 11 }}>
                    {s.tugasAktif > 3 ? 'Padat' : s.tugasAktif > 0 ? 'Aktif' : 'Tersedia'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
