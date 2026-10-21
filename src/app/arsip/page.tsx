'use client';
import React, { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useStore } from '@/lib/store';
import { urutkanTerbaru } from '@/lib/utils';
import { Search, Archive, Download, FileText } from 'lucide-react';

export default function ArsipPage() {
  const { state, getKlasifikasi, getJenisSurat, getScopedArsip } = useStore();
  const [search, setSearch] = useState('');
  const [filterArah, setFilterArah] = useState('all'); // Arah Surat (Masuk/Keluar)
  const [filterJenisSurat, setFilterJenisSurat] = useState('all'); // Jenis Surat (Fungsi)
  const [filterKlasifikasi, setFilterKlasifikasi] = useState('all'); // Kode Klasifikasi Arsip
  const [filterTahun, setFilterTahun] = useState('all');
  const [selectedArsip, setSelectedArsip] = useState<typeof state.arsip[0] | null>(null);

  if (state.currentUser?.role === 'admin') {
    return (
      <DashboardLayout>
        <div className="empty-state">
          <h3>Akses Ditolak (403)</h3>
          <p>Administrator tidak memiliki akses ke arsip.</p>
        </div>
      </DashboardLayout>
    );
  }

  const user = state.currentUser;
  const isPetugas = user?.role === 'petugas_surat';

  const arsipList = urutkanTerbaru(getScopedArsip(), (a) => a.createdAt);

  const handleDownload = (arsip: typeof state.arsip[0], type: 'asli' | 'salinan' = 'asli') => {
    // Generate text/pdf dummy blob with official header & metadata
    const content = `%PDF-1.4
% ARSIP DIGITAL DINAS PERTANIAN KABUPATEN MINAHASA SELATAN
% Kode Arsip: ${arsip.kodeArsip}
% Nomor Surat: ${arsip.nomorSurat}
% Perihal: ${arsip.perihal}
% Tahun: ${arsip.tahun}
% Status: Terverifikasi dalam Sistem Manajemen Persuratan Minsel
${type === 'salinan' ? '% CATATAN: Ini adalah salinan arsip dengan riwayat paraf koordinasi.' : '% CATATAN: Ini adalah berkas kirim asli tanpa paraf koordinasi (bersih).'}
`;
    const blob = new Blob([content], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${arsip.kodeArsip.replace(/[\/\\]/g, '_')}_${type}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  const filtered = arsipList.filter(a => {
    const jenis = a.jenisSuratId ? getJenisSurat(a.jenisSuratId) : undefined;
    const matchSearch = search === '' ||
      a.perihal.toLowerCase().includes(search.toLowerCase()) ||
      a.nomorSurat.toLowerCase().includes(search.toLowerCase()) ||
      a.kodeArsip.toLowerCase().includes(search.toLowerCase()) ||
      (jenis && jenis.nama.toLowerCase().includes(search.toLowerCase()));

    const matchArah = filterArah === 'all' || a.jenisSurat === filterArah;
    const matchJenis = filterJenisSurat === 'all' || a.jenisSuratId === filterJenisSurat;
    const matchKlas = filterKlasifikasi === 'all' || a.klasifikasiId === filterKlasifikasi;
    const matchTahun = filterTahun === 'all' || a.tahun.toString() === filterTahun;

    return matchSearch && matchArah && matchJenis && matchKlas && matchTahun;
  });

  const years = [...new Set(arsipList.map(a => a.tahun))].sort((a, b) => b - a);

  return (
    <DashboardLayout>
      <div className="animate-fadeIn">
        <div className="page-header">
          <div className="page-header-left">
            <h1>Arsip Digital</h1>
            <p>Pusat temu balik arsip persuratan berdasarkan jenis surat dan kode klasifikasi kearsipan</p>
          </div>
        </div>

        <div className="filter-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <div className="search-input-wrapper" style={{ flex: '1 1 240px' }}>
            <Search size={18} />
            <input
              className="search-input"
              placeholder="Cari perihal, nomor, jenis surat, atau kode arsip..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <select
            className="filter-select"
            value={filterArah}
            onChange={e => setFilterArah(e.target.value)}
            title="Filter Arah Surat"
          >
            <option value="all">Semua Arah Surat</option>
            <option value="masuk">Surat Masuk</option>
            <option value="keluar">Surat Keluar</option>
          </select>

          <select
            className="filter-select"
            value={filterJenisSurat}
            onChange={e => setFilterJenisSurat(e.target.value)}
            title="Filter Jenis Surat"
          >
            <option value="all">Semua Jenis Surat</option>
            {state.jenisSurat.map(j => (
              <option key={j.id} value={j.id}>{j.nama}</option>
            ))}
          </select>

          <select
            className="filter-select"
            value={filterKlasifikasi}
            onChange={e => setFilterKlasifikasi(e.target.value)}
            title="Filter Kode Klasifikasi Arsip"
          >
            <option value="all">Semua Kode Klasifikasi</option>
            {state.klasifikasi.map(k => (
              <option key={k.id} value={k.id}>{k.kode} — {k.nama}</option>
            ))}
          </select>

          <select
            className="filter-select"
            value={filterTahun}
            onChange={e => setFilterTahun(e.target.value)}
            title="Filter Tahun"
          >
            <option value="all">Semua Tahun</option>
            {years.map(y => <option key={y} value={y.toString()}>{y}</option>)}
          </select>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Kode Arsip</th>
                <th>Arah Surat</th>
                <th>Jenis Surat</th>
                <th>Nomor Surat</th>
                <th>Perihal</th>
                <th>Kode Klasifikasi Arsip</th>
                <th>Tahun</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <div className="empty-state">
                      <Archive size={48} />
                      <h3>Arsip tidak ditemukan</h3>
                      <p>Coba sesuaikan kata kunci atau kombinasi filter pencarian</p>
                    </div>
                  </td>
                </tr>
              ) : filtered.map(a => {
                const klas = getKlasifikasi(a.klasifikasiId);
                const jenis = a.jenisSuratId ? getJenisSurat(a.jenisSuratId) : undefined;
                return (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 600, fontSize: 13, fontFamily: 'monospace' }}>
                      {a.kodeArsip}
                    </td>
                    <td>
                      <span className={`badge ${a.jenisSurat === 'masuk' ? 'badge-info' : 'badge-primary'}`}>
                        {a.jenisSurat === 'masuk' ? 'Surat Masuk' : 'Surat Keluar'}
                      </span>
                    </td>
                    <td>
                      {jenis ? (
                        <span className="badge badge-primary" style={{ fontWeight: 600 }}>
                          {jenis.nama}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                      )}
                    </td>
                    <td style={{ fontSize: 13, fontWeight: 500 }}>{a.nomorSurat}</td>
                    <td style={{ fontSize: 13, maxWidth: 260 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {a.perihal}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-gray" style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 600 }}>
                        {klas ? `${klas.kode} — ${klas.nama}` : '—'}
                      </span>
                    </td>
                    <td style={{ fontSize: 13 }}>{a.tahun}</td>
                    <td>
                      {(() => {
                        const st = (a as any).statusArsip || 'selesai';
                        const cfg: Record<string, { cls: string; label: string }> = {
                          disposisi: { cls: 'badge-warning', label: 'Dalam Proses' },
                          selesai: { cls: 'badge-success', label: 'Selesai' },
                          terkirim: { cls: 'badge-info', label: 'Terkirim' },
                        };
                        const c = cfg[st] || { cls: 'badge-gray', label: st };
                        return <span className={`badge ${c.cls}`} style={{ fontSize: 11 }}>{c.label}</span>;
                      })()}
                    </td>
                    <td>
                      <div className="table-actions">
                        <button 
                          className="btn btn-sm btn-ghost" 
                          title="Lihat Berkas"
                          onClick={() => setSelectedArsip(a)}
                        >
                          <FileText size={16} />
                        </button>
                        <button 
                          className="btn btn-sm btn-ghost" 
                          title="Unduh Berkas"
                          onClick={() => handleDownload(a)}
                        >
                          <Download size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Modal Preview Berkas Arsip (Bab 4 Poin 9) */}
        {selectedArsip && (
          <div className="modal-overlay" onClick={() => setSelectedArsip(null)}>
            <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: 680 }}>
              <div className="modal-header">
                <h2>Pratinjau Berkas Arsip Digital <span className="badge badge-success" style={{ marginLeft: 8 }}>🔒 DIARSIPKAN</span></h2>
                <button className="modal-close" onClick={() => setSelectedArsip(null)}>✕</button>
              </div>
              <div className="modal-body">
                {selectedArsip.perihal.toLowerCase().includes('rahasia') && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, padding: '8px 14px', fontSize: 13, color: '#991b1b', marginBottom: 16 }}>
                    <strong>SURAT RAHASIA:</strong> Dokumen ini bersifat rahasia dan akses log Anda sedang direkam.
                  </div>
                )}
                <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, padding: 24, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                  <div style={{ textAlign: 'center', borderBottom: '2px solid #334155', paddingBottom: 16, marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#475569' }}>PEMERINTAH KABUPATEN MINAHASA SELATAN</div>
                    <div style={{ fontSize: 16, fontWeight: 800, textTransform: 'uppercase', color: '#0f172a', margin: '4px 0' }}>DINAS PERTANIAN</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Kompleks Perkantoran Pemerintah Kabupaten Minahasa Selatan, Jl. Trans Sulawesi, Amurang</div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px 16px', fontSize: 13, marginBottom: 20 }}>
                    <div style={{ fontWeight: 600, color: '#64748b' }}>Kode Arsip:</div>
                    <div style={{ fontWeight: 700, fontFamily: 'monospace' }}>{selectedArsip.kodeArsip}</div>

                    <div style={{ fontWeight: 600, color: '#64748b' }}>Nomor Surat:</div>
                    <div style={{ fontWeight: 600 }}>{selectedArsip.nomorSurat}</div>

                    <div style={{ fontWeight: 600, color: '#64748b' }}>Arah / Jenis:</div>
                    <div>
                      <span className={`badge ${selectedArsip.jenisSurat === 'masuk' ? 'badge-info' : 'badge-primary'}`}>
                        {selectedArsip.jenisSurat === 'masuk' ? 'Surat Masuk' : 'Surat Keluar'}
                      </span>
                    </div>

                    <div style={{ fontWeight: 600, color: '#64748b' }}>Perihal:</div>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{selectedArsip.perihal}</div>

                    <div style={{ fontWeight: 600, color: '#64748b' }}>Klasifikasi:</div>
                    <div>{getKlasifikasi(selectedArsip.klasifikasiId)?.nama || '-'}</div>

                    <div style={{ fontWeight: 600, color: '#64748b' }}>Tahun Arsip:</div>
                    <div>{selectedArsip.tahun}</div>
                  </div>

                  <div style={{ background: '#ffffff', border: '1px dashed #cbd5e1', borderRadius: 6, padding: 20, textAlign: 'center', margin: '16px 0' }}>
                    <FileText size={40} style={{ color: '#0284c7', margin: '0 auto 8px auto', display: 'block' }} />
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>Dokumen Digital Terautentikasi</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                      Berkas digital ini tersimpan dalam basis data arsip resmi Dinas Pertanian Kabupaten Minahasa Selatan.
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button className="btn btn-ghost" onClick={() => setSelectedArsip(null)}>Tutup</button>
                {isPetugas && (
                  <>
                    <button className="btn btn-secondary btn-sm" onClick={() => alert('Koreksi Metadata (L27)')}>Koreksi Metadata</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => alert('Lengkapi Bukti Terima (L26)')}>Lengkapi Bukti Terima</button>
                  </>
                )}
                {selectedArsip.jenisSurat === 'keluar' ? (
                  <>
                    <button className="btn btn-secondary" onClick={() => handleDownload(selectedArsip, 'asli')}>
                      <Download size={16} aria-hidden="true" /> Unduh Berkas Kirim
                    </button>
                    <button className="btn btn-primary" onClick={() => handleDownload(selectedArsip, 'salinan')}>
                      <Download size={16} aria-hidden="true" /> Unduh Salinan Arsip (Paraf)
                    </button>
                  </>
                ) : (
                  <button className="btn btn-primary" onClick={() => handleDownload(selectedArsip)}>
                    <Download size={16} aria-hidden="true" /> Unduh Berkas PDF
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
