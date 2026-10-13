'use client';
import React, { useMemo } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { ChipStatus, BadgeSifat, PenandaBatasWaktu } from '@/components/ui';
import { FileCheck, GitBranch, Clock, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function SekretarisDashboard() {
  const { state, getScopedDisposisi } = useStore();
  const now = new Date();

  const menungguParaf = useMemo(
    () => state.suratKeluar.filter(s => s.status === 'menunggu_paraf'),
    [state.suratKeluar]
  );

  const isKoordinasi = (d: typeof state.disposisi[0]) =>
    d.bidangTujuan.length > 1 || Boolean(d.lintasBidang) ||
    d.instruksi === 'koordinasi_konfirmasi' ||
    (d.instruksiList && d.instruksiList.some(i => i.jenis === 'koordinasi_konfirmasi'));

  const myDisposisi = getScopedDisposisi();
  const disposisiKoordinasi = useMemo(() => myDisposisi.filter(isKoordinasi), [myDisposisi]);

  const terlambat = useMemo(() =>
    state.suratMasuk.filter(s => {
      const bw = (s as any).batasWaktuSurat;
      if (!bw || s.status === 'selesai') return false;
      return new Date(bw) < now;
    }).length,
    [state.suratMasuk]
  );

  const terlambatDisp = useMemo(() =>
    myDisposisi.filter(d => d.status !== 'selesai' && d.tenggat && new Date(d.tenggat) < now).length,
    [myDisposisi]
  );

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Dashboard Sekretaris Dinas</h1>
          <p>Koordinasi paraf surat keluar dan disposisi lintas bidang</p>
        </div>
      </div>

      {/* ─── Kartu Ringkasan ──────────────────────────────── */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card primary" id="stat-sekdis-paraf">
          <div className="stat-icon primary"><FileCheck size={24} aria-hidden="true" /></div>
          <div className="stat-content">
            <div className="stat-label">Menunggu Paraf</div>
            <div className="stat-value">{menungguParaf.length}</div>
          </div>
        </div>
        <div className="stat-card warning" id="stat-sekdis-koordinasi">
          <div className="stat-icon warning"><GitBranch size={24} aria-hidden="true" /></div>
          <div className="stat-content">
            <div className="stat-label">Disposisi Lintas Bidang</div>
            <div className="stat-value">{disposisiKoordinasi.length}</div>
          </div>
        </div>
        <div className="stat-card danger" id="stat-sekdis-bataswaktu">
          <div className="stat-icon danger"><AlertTriangle size={24} aria-hidden="true" /></div>
          <div className="stat-content">
            <div className="stat-label">Melewati Batas Waktu</div>
            <div className="stat-value">{terlambat}</div>
          </div>
        </div>
        <div className="stat-card danger" id="stat-sekdis-terlambat">
          <div className="stat-icon danger"><Clock size={24} aria-hidden="true" /></div>
          <div className="stat-content">
            <div className="stat-label">Disposisi Terlambat</div>
            <div className="stat-value">{terlambatDisp}</div>
          </div>
        </div>
      </div>

      {/* ─── Konsep Menunggu Paraf Koordinasi ────────────── */}
      <div className="card" style={{ marginBottom: 24 }} id="panel-sekdis-paraf">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 14 }}>Konsep Menunggu Paraf Koordinasi ({menungguParaf.length})</h2>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {menungguParaf.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <CheckCircle2 size={40} style={{ color: 'var(--success)', marginBottom: 12 }} />
              <p style={{ color: 'var(--text-muted)' }}>Tidak ada konsep yang menunggu paraf koordinasi.</p>
            </div>
          ) : (
            <table className="data-table compact-table">
              <thead>
                <tr>
                  <th>Perihal</th>
                  <th>Tujuan</th>
                  <th>Sifat</th>
                  <th>Penyusun</th>
                  <th style={{ textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {menungguParaf.map(s => {
                  const penyusun = state.users.find(u => u.id === s.penyusunId);
                  return (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 500, fontSize: 13 }}>{s.perihal}</td>
                      <td style={{ fontSize: 12, color: 'var(--tinta-redup)' }}>{s.tujuan}</td>
                      <td><BadgeSifat sifat={(s as any).sifat || 'biasa'} /></td>
                      <td style={{ fontSize: 12 }}>{penyusun?.nama || '—'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <Link href={`/surat-keluar/${s.id}`} className="btn btn-sm btn-primary">
                          Beri Paraf <ArrowRight size={13} aria-hidden="true" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ─── Disposisi Koordinasi Lintas Bidang ─────────── */}
      <div className="card" style={{ marginBottom: 24 }} id="panel-sekdis-koordinasi">
        <div className="card-header">
          <h2 style={{ fontSize: 14 }}>Disposisi Koordinasi Lintas Bidang ({disposisiKoordinasi.length})</h2>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {disposisiKoordinasi.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <CheckCircle2 size={40} style={{ color: 'var(--success)', marginBottom: 12 }} />
              <p style={{ color: 'var(--text-muted)' }}>Tidak ada disposisi koordinasi aktif.</p>
            </div>
          ) : (
            <table className="data-table compact-table">
              <thead>
                <tr>
                  <th>No. Agenda</th>
                  <th>Perihal</th>
                  <th>Bidang Tujuan</th>
                  <th>Status per Bidang</th>
                  <th style={{ textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {disposisiKoordinasi.map(d => {
                  const sm = state.suratMasuk.find(s => s.id === d.suratMasukId);
                  return (
                    <tr key={d.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--tinta-redup)', whiteSpace: 'nowrap' }}>{sm?.nomorAgenda}</td>
                      <td style={{ fontWeight: 500, fontSize: 13, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sm?.perihal}</td>
                      <td style={{ fontSize: 12 }}>
                        {d.bidangTujuan.map(b => {
                          const uk = state.unitKerja.find(u => u.id === b.unitKerjaId);
                          return uk?.nama.replace('Bidang ', '') || '';
                        }).join(', ')}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {d.bidangTujuan.map(b => {
                            const uk = state.unitKerja.find(u => u.id === b.unitKerjaId);
                            const statusBidang = d.statusPerBidang?.[b.unitKerjaId]?.status || b.statusTerima;
                            const chipClass = statusBidang === 'diterima' || statusBidang === 'ditindak_langsung' ? 'chip-sukses'
                              : statusBidang === 'belum' ? 'chip-pending'
                              : 'chip-netral';

                            return (
                              <span key={b.id} className={`chip ${chipClass}`} style={{ fontSize: 10 }}>
                                {uk?.nama.replace('Bidang ', '') || '—'}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Link href={`/disposisi/${d.id}`} className="btn btn-sm btn-ghost">Buka</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ─── Surat Melewati Batas Waktu ──────────────────── */}
      {terlambat > 0 && (
        <div className="card" id="panel-sekdis-terlambat">
          <div className="card-header">
            <h2 style={{ fontSize: 14, color: 'var(--rahasia)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={15} aria-hidden="true" /> Surat Melewati Batas Waktu ({terlambat})
            </h2>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <table className="data-table compact-table">
              <tbody>
                {state.suratMasuk
                  .filter(s => (s as any).batasWaktuSurat && s.status !== 'selesai' && new Date((s as any).batasWaktuSurat) < now)
                  .map(s => (
                    <tr key={s.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--tinta-redup)' }}>{s.nomorAgenda}</td>
                      <td style={{ fontWeight: 500, fontSize: 13 }}>{s.perihal}</td>
                      <td><PenandaBatasWaktu tanggal={(s as any).batasWaktuSurat} sekarang={now} /></td>
                      <td style={{ textAlign: 'right' }}>
                        <Link href={`/surat-masuk/${s.id}`} className="btn btn-sm btn-ghost">Lihat</Link>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
