'use client';
import React, { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useStore } from '@/lib/store';
import { useApi } from '@/lib/api';
import { Search, Archive, Download, FileText, Eye, CheckCircle2 } from 'lucide-react';
import { ModalStandar, PdfViewerEmbedded } from '@/components/ui';
import { urutkanTerbaru } from '@/lib/utils';

export default function ArsipPage() {
  const { state, getKlasifikasi, getJenisSurat, getScopedArsip } = useStore();
  const api = useApi();
  const [search, setSearch] = useState('');
  const [filterArah, setFilterArah] = useState('all'); // Arah Surat (Masuk/Keluar)
  const [filterJenisSurat, setFilterJenisSurat] = useState('all'); // Jenis Surat (Fungsi)
  const [filterKlasifikasi, setFilterKlasifikasi] = useState('all'); // Kode Klasifikasi Arsip
  const [filterTahun, setFilterTahun] = useState('all');
  const [selectedArsip, setSelectedArsip] = useState<typeof state.arsip[0] | null>(null);
  const [pesanSukses, setPesanSukses] = useState<string | null>(null);

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

  const handleVerifikasi = async (arsipId: string) => {
    try {
      await api.apiVerifikasiArsip(arsipId);
      setPesanSukses('Kode klasifikasi berhasil diverifikasi dan status dokumen resmi menjadi Diarsipkan (terkunci/read-only).');
      setTimeout(() => setPesanSukses(null), 4000);
      if (selectedArsip && selectedArsip.id === arsipId) {
        setSelectedArsip({ ...selectedArsip, statusArsip: 'diarsipkan' });
      }
    } catch (e: any) {
      alert(e.message || 'Gagal memverifikasi arsip.');
    }
  };

  const handleDownload = (arsip: typeof state.arsip[0], type: 'asli' | 'salinan' = 'asli') => {
    // Generate text/pdf dummy blob with official header & metadata
    const content = `%PDF-1.4
% ARSIP DIGITAL DINAS PERTANIAN KABUPATEN MINAHASA SELATAN
% Kode Arsip: ${arsip.kodeArsip}
% Nomor Surat: ${arsip.nomorSurat}
% Perihal: ${arsip.perihal}
% Tahun: ${arsip.tahun}
% Status: ${arsip.statusArsip === 'diarsipkan' ? 'Diarsipkan (Terkunci/Read-Only)' : 'Terverifikasi dalam Sistem Manajemen Persuratan Minsel'}
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
            <p>Pengarsipan dinamis dan temu balik dokumen digital berdasarkan kode klasifikasi arsip</p>
          </div>
        </div>

        {pesanSukses && (
          <div style={{ background: '#ecfdf5', border: '1px solid #10b981', color: '#065f46', padding: '10px 14px', borderRadius: 6, marginBottom: 14, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={16} />
            <span>{pesanSukses}</span>
          </div>
        )}

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
                <th>Status Arsip</th>
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
                        const st = (a as any).statusArsip || 'diarsipkan';
                        const cfg: Record<string, { cls: string; label: string }> = {
                          disposisi: { cls: 'badge-warning', label: 'Dalam Proses Disposisi' },
                          selesai: { cls: 'badge-info', label: 'Selesai Tindak Lanjut' },
                          terkirim: { cls: 'badge-info', label: 'Terkirim' },
                          menunggu_verifikasi: { cls: 'badge-warning', label: 'Menunggu Verifikasi' },
                          diarsipkan: { cls: 'badge-success', label: 'Diarsipkan (Terkunci)' },
                        };
                        const c = cfg[st] || { cls: 'badge-gray', label: st };
                        return <span className={`badge ${c.cls}`} style={{ fontSize: 11, fontWeight: 600 }}>{c.label}</span>;
                      })()}
                    </td>
                    <td>
                      <div className="table-actions">
                        {isPetugas && a.statusArsip === 'menunggu_verifikasi' && (
                          <button
                            className="btn btn-sm btn-outline-success"
                            title="Verifikasi Kode Klasifikasi & Kunci Arsip"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', fontSize: 12 }}
                            onClick={() => handleVerifikasi(a.id)}
                          >
                            <CheckCircle2 size={13} /> Verifikasi
                          </button>
                        )}
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

        {/* Modal Preview Berkas Arsip Embedded */}
        {selectedArsip && (
          <ModalStandar
            open={!!selectedArsip}
            onClose={() => setSelectedArsip(null)}
            judul={`Pratinjau Berkas Arsip Digital — Kode: ${selectedArsip.kodeArsip}`}
            size="lg"
            footerSecondary={
              <button className="btn btn-ghost" onClick={() => setSelectedArsip(null)}>
                Tutup Pratinjau
              </button>
            }
            footerPrimary={
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {isPetugas && selectedArsip.statusArsip === 'menunggu_verifikasi' && (
                  <button className="btn btn-outline-success" onClick={() => handleVerifikasi(selectedArsip.id)}>
                    <CheckCircle2 size={14} aria-hidden="true" /> Verifikasi & Kunci Arsip
                  </button>
                )}
                {selectedArsip.jenisSurat === 'keluar' ? (
                  <>
                    <button className="btn btn-secondary" onClick={() => handleDownload(selectedArsip, 'asli')}>
                      <Download size={14} aria-hidden="true" /> Unduh Berkas Kirim
                    </button>
                    <button className="btn btn-primary" onClick={() => handleDownload(selectedArsip, 'salinan')}>
                      <Download size={14} aria-hidden="true" /> Unduh Salinan Arsip
                    </button>
                  </>
                ) : (
                  <button className="btn btn-primary" onClick={() => handleDownload(selectedArsip)}>
                    <Download size={14} aria-hidden="true" /> Unduh Berkas Asli
                  </button>
                )}
              </div>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--latar, #F3F5F4)', padding: '10px 14px', borderRadius: 6, fontSize: 13 }}>
                <div>
                  <strong>No. Surat:</strong> {selectedArsip.nomorSurat} | <strong>Tahun:</strong> {selectedArsip.tahun}
                </div>
                <span className={`chip ${selectedArsip.jenisSurat === 'masuk' ? 'chip-info' : 'chip-sukses'}`} style={{ fontSize: 11, fontWeight: 600 }}>
                  {selectedArsip.jenisSurat === 'masuk' ? 'Surat Masuk' : 'Surat Keluar Final'}
                </span>
              </div>

              {selectedArsip.perihal.toLowerCase().includes('rahasia') && (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, padding: '8px 14px', fontSize: 12, color: '#991b1b' }}>
                  <strong>SURAT RAHASIA:</strong> Dokumen ini bersifat rahasia dan akses log Anda tercatat dalam audit sistem.
                </div>
              )}

              <PdfViewerEmbedded
                fileUrl={
                  selectedArsip.berkasUrl ||
                  (selectedArsip.jenisSurat === 'masuk' ? '/docs/sample-surat-masuk.pdf' : '/docs/sample-surat-keluar.pdf')
                }
                judul={`Arsip ${selectedArsip.kodeArsip} — ${selectedArsip.perihal}`}
                metadata={{
                  nomor: selectedArsip.nomorSurat,
                  perihal: selectedArsip.perihal,
                  klasifikasi: getKlasifikasi(selectedArsip.klasifikasiId)?.nama,
                  tanggal: String(selectedArsip.tahun),
                  isiRingkas: `Berkas arsip digital resmi tersimpan dalam basis data kearsipan Dinas Pertanian Kabupaten Minahasa Selatan. Kode klasifikasi: ${getKlasifikasi(selectedArsip.klasifikasiId)?.kode || '-'}.`,
                }}
                onDownload={() => handleDownload(selectedArsip)}
                height={520}
              />
            </div>
          </ModalStandar>
        )}
      </div>
    </DashboardLayout>
  );
}
