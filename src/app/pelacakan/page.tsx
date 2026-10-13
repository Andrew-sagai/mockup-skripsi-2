'use client';
import React, { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useStore } from '@/lib/store';
import { Search, MapPin } from 'lucide-react';
import { ChipStatus } from '@/components/ui';

export default function PelacakanPage() {
  const { state, getUser, getScopedSuratMasuk } = useStore();
  const user = state.currentUser;
  const [search, setSearch] = useState('');
  const [result, setResult] = useState<typeof state.riwayat>([]);
  const [suratInfo, setSuratInfo] = useState<{ type: string; perihal: string; nomor: string; suratMasukId?: string; suratKeluarId?: string; statusPerBidang?: Record<string, any>; buktiTerima?: boolean; sifat?: string } | null>(null);

  const handleSearch = () => {
    if (!search.trim()) return;
    const q = search.toLowerCase();

    // Cari surat masuk hanya dalam cakupan role pengguna —
    // kepala_bidang/staf tidak bisa melacak surat di luar bidangnya,
    // menghindari kebocoran informasi lewat "oracle" pencarian.
    const sm = getScopedSuratMasuk().find(s =>
      s.nomorAgenda.toLowerCase().includes(q) ||
      s.perihal.toLowerCase().includes(q) ||
      s.nomorSuratAsal.toLowerCase().includes(q)
    );
    if (sm) {
      const riwayat = state.riwayat
        .filter(r => r.suratMasukId === sm.id)
        .sort((a, b) => new Date(a.waktu).getTime() - new Date(b.waktu).getTime());
      
      const disp = state.disposisi.find(d => d.suratMasukId === sm.id);
      const sk = state.suratKeluar.find(k => k.suratMasukAsalId === sm.id);

      setResult(riwayat);
      setSuratInfo({ 
        type: 'Surat Masuk', perihal: sm.perihal, nomor: sm.nomorAgenda, 
        suratMasukId: sm.id, suratKeluarId: sk?.id,
        statusPerBidang: disp?.statusPerBidang, sifat: sm.sifat
      });
      return;
    }

    // Surat keluar: semua peran yang punya akses Pelacakan boleh mencari surat keluar
    // (tidak ada disposisi per-bidang untuk surat keluar — visibilitas penuh sesuai desain)
    const sk = state.suratKeluar.find(s =>
      (s.nomorSurat || '').toLowerCase().includes(q) || s.perihal.toLowerCase().includes(q)
    );
    if (sk) {
      const riwayat = state.riwayat
        .filter(r => r.suratKeluarId === sk.id)
        .sort((a, b) => new Date(a.waktu).getTime() - new Date(b.waktu).getTime());
      setResult(riwayat);
      setSuratInfo({ 
        type: 'Surat Keluar', perihal: sk.perihal, nomor: sk.nomorSurat || 'Belum bernomor',
        suratKeluarId: sk.id, suratMasukId: sk.suratMasukAsalId, buktiTerima: true
      });
      return;
    }

    // Surat tidak ditemukan (atau ada tapi di luar cakupan — pesan yang sama, tidak bocor)
    setResult([]);
    setSuratInfo(null);
  };

  return (
    <DashboardLayout>
      <div className="animate-fadeIn">
        <div className="page-header">
          <div className="page-header-left">
            <h1>Pelacakan Status Surat</h1>
            <p>Cari dan lacak perjalanan surat secara kronologis</p>
          </div>
        </div>

        <div className="card" style={{ maxWidth: 700, marginBottom: 24 }}>
          <div className="card-body">
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="search-input-wrapper" style={{ flex: 1 }}>
                <Search size={18} />
                <input className="search-input" placeholder="Masukkan nomor agenda, nomor surat, atau perihal..."
                  value={search} onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()} />
              </div>
              <button className="btn btn-primary" onClick={handleSearch}>
                <MapPin size={16} /> Lacak
              </button>
            </div>
          </div>
        </div>

        {suratInfo && (
          <div className="card" style={{ maxWidth: 700 }}>
            <div className="card-header">
              <div>
                <span className={`badge ${suratInfo.type === 'Surat Masuk' ? 'badge-info' : 'badge-primary'}`}>{suratInfo.type}</span>
                {suratInfo.sifat === 'rahasia' && <span className="badge badge-danger" style={{ marginLeft: 8 }}>RAHASIA</span>}
                <h2 style={{ marginTop: 8 }}>{suratInfo.sifat === 'rahasia' && user?.role !== 'kepala_dinas' && suratInfo.type === 'Surat Masuk' ? '[RAHASIA] Teks disembunyikan' : suratInfo.perihal}</h2>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{suratInfo.nomor}</div>
                {/* Tautan Dua Arah */}
                {suratInfo.type === 'Surat Masuk' && suratInfo.suratKeluarId && (
                  <div style={{ marginTop: 8, fontSize: 13 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Telah dibalas dengan: </span>
                    <a style={{ color: 'var(--primary-600)', textDecoration: 'underline', cursor: 'pointer' }} onClick={() => { setSearch(state.suratKeluar.find(s => s.id === suratInfo.suratKeluarId)?.nomorSurat || ''); setTimeout(handleSearch, 100); }}>Lihat Surat Jawaban</a>
                  </div>
                )}
                {suratInfo.type === 'Surat Keluar' && suratInfo.suratMasukId && (
                  <div style={{ marginTop: 8, fontSize: 13 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Merupakan balasan untuk: </span>
                    <a style={{ color: 'var(--primary-600)', textDecoration: 'underline', cursor: 'pointer' }} onClick={() => { setSearch(state.suratMasuk.find(s => s.id === suratInfo.suratMasukId)?.nomorAgenda || ''); setTimeout(handleSearch, 100); }}>Lihat Surat Masuk</a>
                  </div>
                )}
              </div>
            </div>
            <div className="card-body">
              {/* Status Dua Tingkat untuk Surat Masuk */}
              {suratInfo.statusPerBidang && Object.keys(suratInfo.statusPerBidang).length > 0 && (
                <div style={{ marginBottom: 20, padding: 16, background: 'var(--gray-50)', borderRadius: 8 }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: 14 }}>Status per Bidang Tujuan</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {Object.entries(suratInfo.statusPerBidang).map(([bidangId, statusObj]) => (
                      <div key={bidangId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                        <span style={{ fontWeight: 500 }}>{state.unitKerja.find(u => u.id === bidangId)?.nama || 'Bidang'}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <ChipStatus jenis="disposisi" status={statusObj.status} compact />
                          {statusObj.diterimaOleh && (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Bukti Terima: {statusObj.diterimaOleh}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bukti Terima untuk Surat Keluar */}
              {suratInfo.type === 'Surat Keluar' && (
                <div style={{ marginBottom: 20, padding: 16, background: 'var(--success-light)', borderRadius: 8, display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--success)' }}>Bukti Terima Surat Keluar</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Telah diterima oleh tujuan</div>
                </div>
              )}

              {result.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>Belum ada riwayat status</div>
              ) : (
                <div className="timeline">
                  {result.map((r, idx) => {
                    const pelaku = getUser(r.pelakuId);
                    return (
                      <div key={r.id} className={`timeline-item ${idx === result.length - 1 ? '' : 'completed'}`}>
                        <div className="timeline-dot" />
                        <div className="timeline-content">
                          <div className="timeline-header">
                            <span className="timeline-title">{r.status}</span>
                            <span className="timeline-time">
                              {new Date(r.waktu).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                              {' '}
                              {new Date(r.waktu).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="timeline-body">{r.catatan}</div>
                          <div className="timeline-actor">{pelaku?.nama}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {!suratInfo && search && (
          <div className="card" style={{ maxWidth: 700 }}>
            <div className="card-body">
              <div className="empty-state">
                <Search size={48} />
                <h3>Surat tidak ditemukan</h3>
                <p>Coba masukkan nomor agenda, nomor surat keluar, atau kata kunci perihal yang berbeda</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
