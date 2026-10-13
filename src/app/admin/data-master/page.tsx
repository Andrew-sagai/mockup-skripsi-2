'use client';
import React, { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useStore } from '@/lib/store';
import { useBusinessLogic } from '@/lib/api';
import { KlasifikasiSurat } from '@/lib/types';
import { KonfirmasiDialog } from '@/components/ui';
import {
  Plus, Building2, FolderTree, Hash,
  CheckCircle2, AlertCircle, Edit3, Power, Trash2
} from 'lucide-react';

// ─── Format contoh nomor surat keluar ─────────────────────────────────────
function contohNomor(kodeKlas: string): string {
  const now = new Date();
  const bulanRomawi = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'][now.getMonth()];
  return `${kodeKlas}/123/DISTAN-MS/${bulanRomawi}/${now.getFullYear()}`;
}

export default function DataMasterPage() {
  const { state, dispatch, generateId, addLog } = useStore();
  const { apiHapusUnitKerja, apiToggleUnitKerja } = useBusinessLogic();

  const [tab, setTab] = useState<'unit' | 'klasifikasi' | 'penomoran'>('unit');

  // --- State modal Unit Kerja ---
  const [showUnitModal, setShowUnitModal]   = useState(false);
  const [editUnitId, setEditUnitId]         = useState<string | null>(null);
  const [formUnit, setFormUnit]             = useState({ kode: '', nama: '', jenis: 'bidang' as 'sekretariat' | 'bidang' });
  const [unitError, setUnitError]           = useState('');
  const [deleteUnitId, setDeleteUnitId]     = useState<string | null>(null);
  const [deleteError, setDeleteError]       = useState('');
  const [toggleError, setToggleError]       = useState('');

  // --- State modal Klasifikasi ---
  const [showKlasModal, setShowKlasModal]   = useState(false);
  const [editKlasId, setEditKlasId]         = useState<string | null>(null);
  const [formKlas, setFormKlas]             = useState({ kode: '', nama: '', unitKerjaId: '' });
  const [klasError, setKlasError]           = useState('');

  const isAdmin = state.currentUser?.role === 'admin';

  // ──────────────────────────────────────────────────────────────
  // Handler: Unit Kerja
  // ──────────────────────────────────────────────────────────────
  const openAddUnit = () => {
    setEditUnitId(null);
    setFormUnit({ kode: '', nama: '', jenis: 'bidang' });
    setUnitError('');
    setShowUnitModal(true);
  };

  const openEditUnit = (u: typeof state.unitKerja[0]) => {
    setEditUnitId(u.id);
    setFormUnit({ kode: u.kode, nama: u.nama, jenis: u.jenis });
    setUnitError('');
    setShowUnitModal(true);
  };

  const handleSaveUnit = () => {
    const cleanKode = formUnit.kode.trim().toUpperCase();
    const cleanNama = formUnit.nama.trim();
    if (!cleanKode || !cleanNama) { setUnitError('Kode dan nama unit kerja wajib diisi.'); return; }
    if (state.unitKerja.some((u) => u.id !== editUnitId && u.kode.toUpperCase() === cleanKode)) {
      setUnitError(`Kode "${cleanKode}" sudah terdaftar. Gunakan kode yang unik.`); return;
    }
    if (state.unitKerja.some((u) => u.id !== editUnitId && u.nama.toLowerCase() === cleanNama.toLowerCase())) {
      setUnitError(`Nama "${cleanNama}" sudah terdaftar. Gunakan nama yang unik.`); return;
    }
    if (editUnitId) {
      dispatch({ type: 'UPDATE_UNIT_KERJA', payload: { id: editUnitId, kode: cleanKode, nama: cleanNama, labelLembar: cleanNama } });
      addLog('Ubah Unit Kerja', `Memperbarui unit kerja: ${cleanNama} (${cleanKode})`);
    } else {
      const id = generateId('uk');
      dispatch({ type: 'ADD_UNIT_KERJA', payload: { id, kode: cleanKode, nama: cleanNama, jenis: formUnit.jenis, labelLembar: cleanNama, urutanLembar: state.unitKerja.length + 1, aktif: true } });
      addLog('Tambah Unit Kerja', `Menambahkan unit kerja baru: ${cleanNama} (${cleanKode})`);
    }
    setShowUnitModal(false);
    setEditUnitId(null);
  };

  const handleToggleUnit = (id: string) => {
    setToggleError('');
    try { apiToggleUnitKerja(id); } catch (e: any) { setToggleError(e.message); }
  };

  const handleDeleteUnit = () => {
    if (!deleteUnitId) return;
    setDeleteError('');
    try { apiHapusUnitKerja(deleteUnitId); setDeleteUnitId(null); } catch (e: any) { setDeleteError(e.message); }
  };

  // ──────────────────────────────────────────────────────────────
  // Handler: Klasifikasi
  // ──────────────────────────────────────────────────────────────
  const openAddKlas = () => {
    setEditKlasId(null);
    setFormKlas({ kode: '', nama: '', unitKerjaId: '' });
    setKlasError('');
    setShowKlasModal(true);
  };

  const openEditKlas = (k: KlasifikasiSurat) => {
    setEditKlasId(k.id);
    setFormKlas({ kode: k.kode, nama: k.nama, unitKerjaId: k.unitKerjaId || '' });
    setKlasError('');
    setShowKlasModal(true);
  };

  const handleSaveKlas = () => {
    const cleanKode = formKlas.kode.trim();
    const cleanNama = formKlas.nama.trim();
    if (!cleanKode || !cleanNama) { setKlasError('Kode dan nama klasifikasi wajib diisi.'); return; }
    if (state.klasifikasi.some((k) => k.id !== editKlasId && k.kode.toLowerCase() === cleanKode.toLowerCase())) {
      setKlasError(`Kode klasifikasi "${cleanKode}" sudah terdaftar. Gunakan kode yang unik.`); return;
    }
    if (editKlasId) {
      dispatch({ type: 'UPDATE_KLASIFIKASI', payload: { id: editKlasId, kode: cleanKode, nama: cleanNama, unitKerjaId: formKlas.unitKerjaId || undefined } });
      addLog('Ubah Klasifikasi Arsip', `Memperbarui kode klasifikasi: ${cleanKode} — ${cleanNama}`);
    } else {
      const id = generateId('kl');
      dispatch({ type: 'ADD_KLASIFIKASI', payload: { id, kode: cleanKode, nama: cleanNama, unitKerjaId: formKlas.unitKerjaId || undefined, aktif: true } });
      addLog('Tambah Klasifikasi Arsip', `Menambahkan kode klasifikasi baru: ${cleanKode} — ${cleanNama}`);
    }
    setShowKlasModal(false);
    setEditKlasId(null);
  };

  const toggleKlas = (id: string, aktif: boolean) => {
    const k = state.klasifikasi.find((x) => x.id === id);
    dispatch({ type: 'UPDATE_KLASIFIKASI', payload: { id, aktif: !aktif } });
    addLog(aktif ? 'Nonaktifkan Klasifikasi' : 'Aktifkan Klasifikasi', `${aktif ? 'Menonaktifkan' : 'Mengaktifkan'} kode klasifikasi ${k?.kode || id}`);
  };

  // ──────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="animate-fadeIn">
        <div className="page-header">
          <div className="page-header-left">
            <h1>Data Master Persuratan</h1>
            <p>Kelola unit kerja, kode klasifikasi arsip, dan format penomoran surat</p>
          </div>
          {isAdmin && (
            <button
              id="btn-tambah-master"
              className="btn btn-primary"
              onClick={() => {
                if (tab === 'unit') openAddUnit();
                else if (tab === 'klasifikasi') openAddKlas();
              }}
              style={{ display: tab === 'penomoran' ? 'none' : undefined }}
            >
              <Plus size={16} aria-hidden="true" />
              Tambah {tab === 'unit' ? 'Unit Kerja' : 'Kode Klasifikasi'}
            </button>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="tabs" style={{ marginBottom: 20 }}>
          <button id="tab-unit" className={`tab ${tab === 'unit' ? 'active' : ''}`} onClick={() => setTab('unit')}>
            <Building2 size={14} aria-hidden="true" style={{ display: 'inline', marginRight: 6 }} />
            Unit Kerja
          </button>
          <button id="tab-klasifikasi" className={`tab ${tab === 'klasifikasi' ? 'active' : ''}`} onClick={() => setTab('klasifikasi')}>
            <FolderTree size={14} aria-hidden="true" style={{ display: 'inline', marginRight: 6 }} />
            Klasifikasi Surat
          </button>
          <button id="tab-penomoran" className={`tab ${tab === 'penomoran' ? 'active' : ''}`} onClick={() => setTab('penomoran')}>
            <Hash size={14} aria-hidden="true" style={{ display: 'inline', marginRight: 6 }} />
            Kode Penomoran
          </button>
        </div>

        {/* ─── TAB 1: UNIT KERJA ───────────────────────────── */}
        {tab === 'unit' && (
          <div>
            {toggleError && (
              <div className="modal-error" role="alert" style={{ marginBottom: 12 }}>
                <AlertCircle size={15} aria-hidden="true" /> {toggleError}
                <button style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }} onClick={() => setToggleError('')}>✕</button>
              </div>
            )}
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Kode</th>
                    <th>Nama Unit Kerja</th>
                    <th>Jenis</th>
                    <th>Status</th>
                    {isAdmin && <th>Aksi</th>}
                  </tr>
                </thead>
                <tbody>
                  {state.unitKerja.map((u) => (
                    <tr key={u.id}>
                      <td><code style={{ fontFamily: 'monospace', fontWeight: 700 }}>{u.kode}</code></td>
                      <td style={{ fontWeight: 500 }}>{u.nama}</td>
                      <td>
                        <span className={`chip ${u.jenis === 'sekretariat' ? 'chip-info' : 'chip-netral'}`} style={{ fontSize: 11 }}>
                          {u.jenis === 'sekretariat' ? 'Sekretariat' : 'Bidang'}
                        </span>
                      </td>
                      <td>
                        <span className={`chip ${u.aktif ? 'chip-sukses' : 'chip-netral'}`} style={{ fontSize: 11 }}>
                          {u.aktif ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      {isAdmin && (
                        <td>
                          <div className="table-actions">
                            <button className="btn btn-sm btn-ghost" title="Ubah" onClick={() => openEditUnit(u)}><Edit3 size={14} /></button>
                            {u.jenis !== 'sekretariat' && (
                              <>
                                <button
                                  className="btn btn-sm btn-ghost"
                                  title={u.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                                  onClick={() => handleToggleUnit(u.id)}
                                >
                                  <Power size={14} />
                                </button>
                                <button
                                  className="btn btn-sm btn-danger"
                                  title="Hapus"
                                  onClick={() => { setDeleteError(''); setDeleteUnitId(u.id); }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── TAB 2: KLASIFIKASI SURAT ────────────────────── */}
        {tab === 'klasifikasi' && (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Kode</th>
                  <th>Nama Klasifikasi</th>
                  <th>Unit Kerja Terkait</th>
                  <th>Status</th>
                  {isAdmin && <th>Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {state.klasifikasi.map((k) => {
                  const unit = k.unitKerjaId ? state.unitKerja.find((u) => u.id === k.unitKerjaId) : null;
                  return (
                    <tr key={k.id}>
                      <td>
                        <code style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--pinus)' }}>{k.kode}</code>
                      </td>
                      <td style={{ fontWeight: 500 }}>{k.nama}</td>
                      <td style={{ fontSize: 13 }}>
                        {unit ? unit.nama : <span style={{ color: 'var(--tinta-redup)', fontSize: 12 }}>Semua Unit / Umum</span>}
                      </td>
                      <td>
                        <span className={`chip ${k.aktif ? 'chip-sukses' : 'chip-netral'}`} style={{ fontSize: 11 }}>
                          {k.aktif ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      {isAdmin && (
                        <td>
                          <div className="table-actions">
                            <button className="btn btn-sm btn-ghost" title="Ubah" onClick={() => openEditKlas(k)}><Edit3 size={14} /></button>
                            <button className="btn btn-sm btn-ghost" title={k.aktif ? 'Nonaktifkan' : 'Aktifkan'} onClick={() => toggleKlas(k.id, k.aktif)}>
                              <Power size={14} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ─── TAB 3: KODE PENOMORAN ───────────────────────── */}
        {tab === 'penomoran' && (
          <div>
            {/* Format baku */}
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="card-header">
                <h2 style={{ fontSize: 14 }}>Format Nomor Surat Keluar Dinas</h2>
              </div>
              <div className="card-body">
                <div style={{
                  background: 'var(--sidebar)', color: '#a3e635',
                  borderRadius: 'var(--border-radius)', padding: '14px 20px',
                  fontFamily: 'monospace', fontSize: 15, marginBottom: 16, letterSpacing: '0.03em'
                }}>
                  [KODE_KLASIFIKASI] / [NO_URUT] / DISTAN-MS / [BULAN_ROMAWI] / [TAHUN]
                </div>
                <div style={{ fontSize: 13, color: 'var(--tinta-redup)', lineHeight: 1.8 }}>
                  <strong>Kode instansi:</strong> <code>DISTAN-MS</code> (Dinas Pertanian Minahasa Selatan)<br />
                  <strong>Nomor urut:</strong> dihitung per kode klasifikasi + tahun berjalan (auto-reset setiap tahun)<br />
                  <strong>Contoh:</strong> <code>800/123/DISTAN-MS/VII/2026</code>
                </div>
              </div>
            </div>

            {/* Pratinjau per kode klasifikasi aktif */}
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Kode Klasifikasi</th>
                    <th>Nama</th>
                    <th>Contoh Nomor Surat</th>
                    <th>Counter Berjalan</th>
                  </tr>
                </thead>
                <tbody>
                  {state.klasifikasi.filter((k) => k.aktif).map((k) => {
                    const counter = state.nomorSuratCounter?.find(
                      (c) => c.klasifikasiKode === k.kode && c.tahun === new Date().getFullYear()
                    );
                    return (
                      <tr key={k.id}>
                        <td><code style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--pinus)' }}>{k.kode}</code></td>
                        <td style={{ fontSize: 13 }}>{k.nama}</td>
                        <td>
                          <code style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--tinta-redup)' }}>
                            {contohNomor(k.kode)}
                          </code>
                        </td>
                        <td style={{ fontVariantNumeric: 'tabular-nums', fontSize: 13 }}>
                          {counter ? counter.counter : 0}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Modal Tambah/Ubah Unit Kerja ─────────────────── */}
        {showUnitModal && (
          <div className="modal-overlay" onClick={() => setShowUnitModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{editUnitId ? 'Ubah Unit Kerja' : 'Tambah Unit Kerja'}</h2>
                <button className="modal-close" onClick={() => setShowUnitModal(false)} aria-label="Tutup">✕</button>
              </div>
              <div className="modal-body">
                {unitError && (
                  <div className="modal-error" role="alert"><AlertCircle size={15} aria-hidden="true" /> {unitError}</div>
                )}
                <div className="form-group">
                  <label className="form-label" htmlFor="unit-kode">Kode <span className="required">*</span></label>
                  <input id="unit-kode" className="form-input" value={formUnit.kode} onChange={(e) => setFormUnit({ ...formUnit, kode: e.target.value })} placeholder="Contoh: BID-PK" />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="unit-nama">Nama Unit Kerja <span className="required">*</span></label>
                  <input id="unit-nama" className="form-input" value={formUnit.nama} onChange={(e) => setFormUnit({ ...formUnit, nama: e.target.value })} placeholder="Nama lengkap unit/bidang" />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="unit-jenis">Jenis</label>
                  <select id="unit-jenis" className="form-select" value={formUnit.jenis} onChange={(e) => setFormUnit({ ...formUnit, jenis: e.target.value as any })}>
                    <option value="bidang">Bidang</option>
                    <option value="sekretariat">Sekretariat</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setShowUnitModal(false)}>Batal</button>
                <button id="btn-simpan-unit" className="btn btn-primary" onClick={handleSaveUnit}>
                  <CheckCircle2 size={15} aria-hidden="true" /> Simpan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Modal Tambah/Ubah Klasifikasi ────────────────── */}
        {showKlasModal && (
          <div className="modal-overlay" onClick={() => setShowKlasModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
              <div className="modal-header">
                <h2>{editKlasId ? 'Ubah Kode Klasifikasi' : 'Tambah Kode Klasifikasi'}</h2>
                <button className="modal-close" onClick={() => setShowKlasModal(false)} aria-label="Tutup">✕</button>
              </div>
              <div className="modal-body">
                {klasError && (
                  <div className="modal-error" role="alert"><AlertCircle size={15} aria-hidden="true" /> {klasError}</div>
                )}
                <div className="form-group">
                  <label className="form-label" htmlFor="klas-kode">Kode Klasifikasi <span className="required">*</span></label>
                  <input id="klas-kode" className="form-input" value={formKlas.kode} onChange={(e) => setFormKlas({ ...formKlas, kode: e.target.value })} placeholder="Contoh: 800 atau 5.20" />
                  <p className="form-hint">Kode harus unik. Format mengikuti buku penuntun kearsipan dinas.</p>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="klas-nama">Nama Klasifikasi <span className="required">*</span></label>
                  <input id="klas-nama" className="form-input" value={formKlas.nama} onChange={(e) => setFormKlas({ ...formKlas, nama: e.target.value })} placeholder="Contoh: Kepegawaian" />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="klas-unit">Unit Kerja Terkait (opsional)</label>
                  <select id="klas-unit" className="form-select" value={formKlas.unitKerjaId} onChange={(e) => setFormKlas({ ...formKlas, unitKerjaId: e.target.value })}>
                    <option value="">— Tidak terikat unit khusus (Umum) —</option>
                    {state.unitKerja.filter((u) => u.aktif).map((u) => (
                      <option key={u.id} value={u.id}>{u.kode} — {u.nama}</option>
                    ))}
                  </select>
                </div>

                {/* Pratinjau nomor surat */}
                {formKlas.kode && (
                  <div className="admin-info-box" style={{ marginTop: 4 }}>
                    <Hash size={14} aria-hidden="true" />
                    <span>
                      Contoh nomor: <code style={{ fontFamily: 'monospace' }}>{contohNomor(formKlas.kode)}</code>
                    </span>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setShowKlasModal(false)}>Batal</button>
                <button id="btn-simpan-klas" className="btn btn-primary" onClick={handleSaveKlas}>
                  <CheckCircle2 size={15} aria-hidden="true" /> Simpan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Dialog Hapus Unit Kerja ───────────────────────── */}
        {deleteUnitId && deleteError && (
          <div className="modal-error" role="alert" style={{ margin: '12px 0' }}>
            <AlertCircle size={15} aria-hidden="true" /> {deleteError}
          </div>
        )}
        <KonfirmasiDialog
          open={!!deleteUnitId}
          onClose={() => { setDeleteUnitId(null); setDeleteError(''); }}
          onConfirm={handleDeleteUnit}
          judul="Hapus Unit Kerja?"
          pesan={`Unit kerja "${state.unitKerja.find((u) => u.id === deleteUnitId)?.nama}" akan dihapus. Unit yang masih memiliki data terkait tidak dapat dihapus — nonaktifkan sebagai gantinya.`}
          labelKonfirmasi="Hapus"
          bahaya
        />
      </div>
    </DashboardLayout>
  );
}
