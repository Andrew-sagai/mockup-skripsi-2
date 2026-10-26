'use client';
import React, { useState, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useStore } from '@/lib/store';
import { Search, MapPin, ChevronRight, FileText, Filter, X } from 'lucide-react';
import { ChipStatus, ModalStandar, PdfViewerEmbedded } from '@/components/ui';

export default function PelacakanPage() {
  const { state, getUser, getScopedSuratMasuk } = useStore();
  const user = state.currentUser;
  const [search, setSearch] = useState('');
  const [filterJenis, setFilterJenis] = useState<'all' | 'masuk' | 'keluar'>('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<'masuk' | 'keluar' | null>(null);
  const [showPreviewBerkas, setShowPreviewBerkas] = useState(false);

  // Tahap 10/11: Bangun daftar gabungan surat masuk + keluar sesuai RBAC
  const allItems = useMemo(() => {
    const items: Array<{
      id: string; type: 'masuk' | 'keluar';
      nomor: string; perihal: string; status: string;
      tanggal: string; sifat?: string;
    }> = [];

    // Surat masuk — scoped sesuai role
    getScopedSuratMasuk().forEach(sm => {
      items.push({
        id: sm.id, type: 'masuk',
        nomor: sm.nomorAgenda,
        perihal: sm.perihal,
        status: sm.status,
        tanggal: sm.createdAt,
        sifat: sm.sifat,
      });
    });

    // Surat keluar — visibilitas penuh (tidak ada disposisi per-bidang)
    state.suratKeluar.forEach(sk => {
      items.push({
        id: sk.id, type: 'keluar',
        nomor: sk.nomorSurat || 'Belum bernomor',
        perihal: sk.perihal,
        status: sk.status,
        tanggal: sk.createdAt,
      });
    });

    // Sort terbaru dulu
    return items.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
  }, [state.suratMasuk, state.suratKeluar, state.disposisi, user?.id]);

  const q = search.toLowerCase();
  const filtered = allItems.filter(item => {
    const matchSearch = !q || item.nomor.toLowerCase().includes(q)
      || item.perihal.toLowerCase().includes(q);
    const matchJenis = filterJenis === 'all' || item.type === filterJenis;
    const matchStatus = filterStatus === 'all' || item.status === filterStatus;
    return matchSearch && matchJenis && matchStatus;
  });

  // Detail data untuk surat yang dipilih
  const detailData = useMemo(() => {
    if (!selectedId || !selectedType) return null;

    if (selectedType === 'masuk') {
      const sm = state.suratMasuk.find(s => s.id === selectedId);
      if (!sm) return null;
      const riwayat = state.riwayat
        .filter(r => r.suratMasukId === sm.id)
        .sort((a, b) => new Date(a.waktu).getTime() - new Date(b.waktu).getTime());
      const disp = state.disposisi.find(d => d.suratMasukId === sm.id);
      const skList = state.suratKeluar.filter(k => k.suratMasukAsalId === sm.id || k.refSuratMasukId === sm.id);
      return {
        id: sm.id,
        type: 'Surat Masuk' as const,
        perihal: sm.perihal,
        nomor: sm.nomorAgenda,
        status: sm.status,
        sifat: sm.sifat,
        berkasUrl: sm.berkasUrl,
        riwayat,
        statusPerBidang: disp?.statusPerBidang,
        suratKeluarList: skList,
        suratKeluarId: skList[0]?.id,
        suratKeluarNomor: skList[0]?.nomorSurat,
      };
    } else {
      const sk = state.suratKeluar.find(s => s.id === selectedId);
      if (!sk) return null;
      const riwayat = state.riwayat
        .filter(r => r.suratKeluarId === sk.id)
        .sort((a, b) => new Date(a.waktu).getTime() - new Date(b.waktu).getTime());
      return {
        id: sk.id,
        type: 'Surat Keluar' as const,
        perihal: sk.perihal,
        nomor: sk.nomorSurat || 'Belum bernomor',
        status: sk.status,
        berkasUrl: sk.berkasUrl,
        riwayat,
        suratMasukId: sk.suratMasukAsalId,
      };
    }
  }, [selectedId, selectedType, state.riwayat, state.suratMasuk, state.suratKeluar, state.disposisi]);

  const statusLabels: Record<string, string> = {
    diagenda: 'Diagenda', menunggu_disposisi: 'Menunggu Disposisi',
    didisposisikan: 'Didisposisikan', diterima_bidang: 'Diterima Bidang',
    diteruskan_ke_staf: 'Diteruskan ke Staf', menunggu_pemeriksaan: 'Menunggu Pemeriksaan',
    selesai: 'Selesai', draf: 'Draf', menunggu_paraf: 'Menunggu Paraf',
    menunggu_ttd: 'Menunggu TTD', ditandatangani: 'Ditandatangani',
    nomor_diterbitkan: 'Nomor Diterbitkan', terkirim: 'Terkirim',
    perlu_revisi: 'Perlu Revisi',
  };

  const handleSelect = (id: string, type: 'masuk' | 'keluar') => {
    if (selectedId === id && selectedType === type) {
      setSelectedId(null);
      setSelectedType(null);
    } else {
      setSelectedId(id);
      setSelectedType(type);
    }
  };

  return (
    <DashboardLayout>
      <div className="animate-fadeIn">
        <div className="page-header">
          <div className="page-header-left">
            <h1>Pelacakan Status Surat</h1>
            <p>Lacak perjalanan surat secara kronologis — klik surat untuk lihat riwayat</p>
          </div>
        </div>

        {/* Filter bar */}
        <div className="filter-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
          <div className="search-input-wrapper" style={{ flex: '1 1 260px' }}>
            <Search size={18} />
            <input className="search-input" placeholder="Cari nomor agenda, nomor surat, atau perihal..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="filter-select" value={filterJenis}
            onChange={e => setFilterJenis(e.target.value as any)} title="Filter Jenis">
            <option value="all">Semua Jenis</option>
            <option value="masuk">Surat Masuk</option>
            <option value="keluar">Surat Keluar</option>
          </select>
          <select className="filter-select" value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)} title="Filter Status">
            <option value="all">Semua Status</option>
            {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        {/* Layout: daftar + detail */}
        <div style={{ display: 'grid', gridTemplateColumns: detailData ? '1fr 1fr' : '1fr', gap: 20, alignItems: 'start' }}>

          {/* Daftar surat */}
          <div className="card">
            <div className="card-header" style={{ padding: '12px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>
                  {filtered.length} surat ditemukan
                </span>
                {(search || filterJenis !== 'all' || filterStatus !== 'all') && (
                  <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setFilterJenis('all'); setFilterStatus('all'); }}>
                    <X size={14} /> Reset Filter
                  </button>
                )}
              </div>
            </div>
            <div style={{ maxHeight: 600, overflowY: 'auto' }}>
              {filtered.length === 0 ? (
                <div className="empty-state" style={{ padding: 40 }}>
                  <Search size={48} />
                  <h3>Surat tidak ditemukan</h3>
                  <p>Coba sesuaikan kata kunci atau filter pencarian</p>
                </div>
              ) : filtered.map(item => {
                const isActive = selectedId === item.id && selectedType === item.type;
                const isRahasia = item.sifat === 'rahasia' && user?.role !== 'kepala_dinas' && item.type === 'masuk';
                return (
                  <div
                    key={`${item.type}-${item.id}`}
                    onClick={() => handleSelect(item.id, item.type)}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--border-color)',
                      cursor: 'pointer',
                      background: isActive ? 'var(--primary-50)' : 'transparent',
                      display: 'flex', alignItems: 'center', gap: 12,
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'var(--gray-50)'; }}
                    onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span className={`badge ${item.type === 'masuk' ? 'badge-info' : 'badge-primary'}`} style={{ fontSize: 10 }}>
                          {item.type === 'masuk' ? 'Masuk' : 'Keluar'}
                        </span>
                        {item.sifat === 'rahasia' && (
                          <span className="badge badge-danger" style={{ fontSize: 10 }}>RAHASIA</span>
                        )}
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{item.nomor}</span>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {isRahasia ? '[RAHASIA] Teks disembunyikan' : item.perihal}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        {new Date(item.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <ChipStatus jenis={item.type === 'masuk' ? 'suratMasuk' : 'suratKeluar'} status={item.status} compact />
                      <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Panel detail riwayat */}
          {detailData && (
            <div className="card" style={{ position: 'sticky', top: 80 }}>
              <div className="card-header" style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span className={`badge ${detailData.type === 'Surat Masuk' ? 'badge-info' : 'badge-primary'}`}>{detailData.type}</span>
                      {'sifat' in detailData && detailData.sifat === 'rahasia' && <span className="badge badge-danger">RAHASIA</span>}
                    </div>
                    <h2 style={{ fontSize: 15, margin: 0, lineHeight: 1.4 }}>
                      {'sifat' in detailData && detailData.sifat === 'rahasia' && user?.role !== 'kepala_dinas'
                        ? '[RAHASIA] Teks disembunyikan'
                        : detailData.perihal}
                    </h2>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, fontFamily: 'monospace' }}>{detailData.nomor}</div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setSelectedId(null); setSelectedType(null); }} title="Tutup detail">
                    <X size={16} />
                  </button>
                </div>

                {/* Tautan dua arah */}
                {'suratKeluarList' in detailData && detailData.suratKeluarList && (detailData.suratKeluarList as any[]).length > 0 && (
                  <div style={{ marginTop: 8, fontSize: 13 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Dibalas dengan ({(detailData.suratKeluarList as any[]).length}x): </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                      {(detailData.suratKeluarList as any[]).map((sk: any, idx: number) => (
                        <div key={sk.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>#{idx + 1}</span>
                          <a
                            style={{ color: 'var(--primary-600)', textDecoration: 'underline', cursor: 'pointer', fontWeight: 500 }}
                            onClick={() => { setSelectedId(sk.id); setSelectedType('keluar'); }}
                          >
                            {sk.nomorSurat || '(Konsep belum terbit)'} — {sk.perihal}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {'suratMasukId' in detailData && detailData.suratMasukId && (
                  <div style={{ marginTop: 8, fontSize: 13 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Balasan untuk: </span>
                    <a style={{ color: 'var(--primary-600)', textDecoration: 'underline', cursor: 'pointer' }}
                      onClick={() => { setSelectedId(detailData.suratMasukId!); setSelectedType('masuk'); }}>
                      Lihat Surat Masuk
                    </a>
                  </div>
                )}

                {/* Tombol preview berkas PDF (Gambar 23 / Bab 4) */}
                <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShowPreviewBerkas(true)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 38 }}
                  >
                    <FileText size={15} />
                    Lihat Berkas (PDF)
                  </button>
                </div>
              </div>
              <div className="card-body" style={{ maxHeight: 500, overflowY: 'auto' }}>
                {/* Status per bidang (surat masuk dengan disposisi) */}
                {'statusPerBidang' in detailData && detailData.statusPerBidang && Object.keys(detailData.statusPerBidang).length > 0 && (
                  <div style={{ marginBottom: 20, padding: 14, background: 'var(--gray-50)', borderRadius: 8 }}>
                    <h4 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600 }}>Status per Bidang</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {Object.entries(detailData.statusPerBidang).map(([bidangId, statusObj]: [string, any]) => (
                        <div key={bidangId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                          <span style={{ fontWeight: 500 }}>{state.unitKerja.find(u => u.id === bidangId)?.nama || 'Bidang'}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <ChipStatus jenis="disposisi" status={statusObj.status} compact />
                            {statusObj.diterimaOleh && (
                              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Terima: {statusObj.diterimaOleh}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Timeline riwayat */}
                {detailData.riwayat.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>Belum ada riwayat status</div>
                ) : (
                  <div className="timeline">
                    {detailData.riwayat.map((r, idx) => {
                      const pelaku = getUser(r.pelakuId);
                      return (
                        <div key={r.id} className={`timeline-item ${idx === detailData.riwayat.length - 1 ? '' : 'completed'}`}>
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
        </div>

        {/* Modal Embedded PDF Viewer (Gambar 23 / Subbab 4.8) */}
        {showPreviewBerkas && detailData && (
          <ModalStandar
            open={showPreviewBerkas}
            onClose={() => setShowPreviewBerkas(false)}
            judul={`Berkas ${detailData.type}: ${detailData.nomor}`}
            size="lg"
          >
            <PdfViewerEmbedded
              fileUrl={
                detailData.berkasUrl ||
                (detailData.type === 'Surat Masuk'
                  ? '/docs/sample-surat-masuk.pdf'
                  : '/docs/sample-surat-keluar.pdf')
              }
              judul={`${detailData.type}: ${detailData.perihal}`}
              metadata={{
                nomor: detailData.nomor,
                perihal: detailData.perihal,
                sifat: 'sifat' in detailData ? detailData.sifat : undefined,
              }}
            />
          </ModalStandar>
        )}
      </div>
    </DashboardLayout>
  );
}
