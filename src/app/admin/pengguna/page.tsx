'use client';
import React, { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useStore } from '@/lib/store';
import { useBusinessLogic } from '@/lib/api';
import { USER_ROLE_LABELS, UserRole, User } from '@/lib/types';
import { KonfirmasiDialog, ModalStandar } from '@/components/ui';
import { Plus, UserX, UserCheck, Search, Key, Edit3, AlertCircle, CheckCircle2, Mail, FilePen, Eye, Trash2, Upload } from 'lucide-react';
import { urutkanTerbaru } from '@/lib/utils';

export default function PenggunaPage() {
  const { state } = useStore();
  const {
    apiTambahPengguna,
    apiUbahPengguna,
    apiTogglePengguna,
    apiUploadTandaTangan,
    apiHapusTandaTangan,
  } = useBusinessLogic();

  const [signatureModalUser, setSignatureModalUser] = useState<User | null>(null);
  const [signatureUploadDataUrl, setSignatureUploadDataUrl] = useState<string | null>(null);

  const [search, setSearch]         = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'aktif' | 'nonaktif'>('all');

  // Modal tambah
  const [showModal, setShowModal]   = useState(false);
  const [form, setForm]             = useState({ nama: '', email: '', role: 'staf_pelaksana' as UserRole, unitKerjaId: '', dummyPassword: 'staf123' });
  const [formError, setFormError]   = useState('');

  // Modal ubah
  const [editModal, setEditModal]   = useState<{ id: string; nama: string; email: string; role: UserRole; unitKerjaId: string } | null>(null);
  const [editError, setEditError]   = useState('');

  // Modal toggle (aktifkan/nonaktifkan) — pakai KonfirmasiDialog
  const [toggleTarget, setToggleTarget] = useState<{ id: string; nama: string; aktif: boolean } | null>(null);

  // Modal reset password — simulasi Supabase Auth: tidak pernah menampilkan kata sandi
  const [resetTarget, setResetTarget]   = useState<{ id: string; nama: string; email: string } | null>(null);
  const [resetSent, setResetSent]       = useState(false);
  const [resetting, setResetting]       = useState(false);

  const isBidang     = (r: UserRole) => r === 'kepala_bidang' || r === 'staf_pelaksana';
  const isSekretariat= (r: UserRole) => r === 'sekretaris' || r === 'petugas_surat';
  const isNoUnit     = (r: UserRole) => r === 'kepala_dinas' || r === 'admin';

  const sekretariatUnit = state.unitKerja.find((u) => u.jenis === 'sekretariat');
  const bidangAktif     = state.unitKerja.filter((u) => u.jenis === 'bidang' && u.aktif);

  const filtered = urutkanTerbaru(
    state.users.filter((u) => {
      const q = search.toLowerCase();
      const matchSearch = !q || u.nama.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const matchRole   = filterRole === 'all' || u.role === filterRole;
      const matchStatus = filterStatus === 'all' || (filterStatus === 'aktif' ? u.aktif : !u.aktif);
      return matchSearch && matchRole && matchStatus;
    }),
    (u) => u.createdAt,
  );

  // ── Tambah ──────────────────────────────────────────────────
  const handleRoleChange = (newRole: UserRole) => {
    const passMap: Partial<Record<UserRole, string>> = {
      kepala_bidang: 'kabid123', kepala_dinas: 'kadis123',
      admin: 'admin123', petugas_surat: 'petugas123', sekretaris: 'sekretaris123',
    };
    const newUnitId = isSekretariat(newRole) ? (sekretariatUnit?.id || '') : '';
    setForm((prev) => ({ ...prev, role: newRole, unitKerjaId: newUnitId, dummyPassword: passMap[newRole] || 'staf123' }));
  };

  const handleAdd = async () => {
    setFormError('');
    const emailDup = state.users.some((u) => u.email.toLowerCase() === form.email.toLowerCase());
    if (emailDup) { setFormError('Email sudah terdaftar dalam sistem. Gunakan email yang berbeda.'); return; }
    if (!form.nama.trim() || !form.email.trim()) { setFormError('Nama dan email wajib diisi.'); return; }
    try {
      const unitId = isNoUnit(form.role) ? null
        : isSekretariat(form.role) ? (sekretariatUnit?.id || null)
        : (form.unitKerjaId || null);
      await apiTambahPengguna(form.nama, form.email, form.role, unitId, form.dummyPassword);
      setShowModal(false);
      setForm({ nama: '', email: '', role: 'staf_pelaksana', unitKerjaId: '', dummyPassword: 'staf123' });
    } catch (e: any) { setFormError(e.message); }
  };

  // ── Ubah ───────────────────────────────────────────────────
  const handleEditRoleChange = (newRole: UserRole) => {
    if (!editModal) return;
    const newUnitId = isSekretariat(newRole) ? (sekretariatUnit?.id || '') : '';
    setEditModal((prev) => prev ? { ...prev, role: newRole, unitKerjaId: newUnitId } : null);
  };

  const handleEdit = async () => {
    if (!editModal) return;
    setEditError('');
    const emailDup = state.users.some((u) => u.email.toLowerCase() === editModal.email.toLowerCase() && u.id !== editModal.id);
    if (emailDup) { setEditError('Email sudah dipakai akun lain.'); return; }
    try {
      const unitId = isNoUnit(editModal.role) ? null
        : isSekretariat(editModal.role) ? (sekretariatUnit?.id || null)
        : (editModal.unitKerjaId || null);
      await apiUbahPengguna(editModal.id, { nama: editModal.nama, email: editModal.email, role: editModal.role, unitKerjaId: unitId });
      setEditModal(null);
    } catch (e: any) { setEditError(e.message); }
  };

  // ── Toggle aktif/nonaktif ──────────────────────────────────
  const handleToggleConfirm = async () => {
    if (!toggleTarget) return;
    try { await apiTogglePengguna(toggleTarget.id); } catch (e: any) { alert(e.message); }
    setToggleTarget(null);
  };

  // ── Reset Password (simulasi Supabase Auth) ────────────────
  // Produksi: memanggil supabase.auth.admin.generateLink({ type: 'recovery', email })
  // Prototipe: simulasi kirim tautan atur ulang via email — kata sandi TIDAK pernah ditampilkan
  const handleResetPassword = async () => {
    if (!resetTarget) return;
    setResetting(true);
    await new Promise((r) => setTimeout(r, 800)); // simulasi API call
    setResetting(false);
    setResetSent(true);
    // Log dicatat oleh apiResetPassword di produksi — prototipe catat manual via addLog
  };

  const closeResetModal = () => { setResetTarget(null); setResetSent(false); };

  return (
    <DashboardLayout>
      <div className="animate-fadeIn">
        <div className="page-header">
          <div className="page-header-left">
            <h1>Kelola Pengguna</h1>
            <p>Tambah, ubah, nonaktifkan, dan reset kata sandi akun</p>
          </div>
          <button id="btn-tambah-pengguna" className="btn btn-primary" onClick={() => { setFormError(''); setShowModal(true); }}>
            <Plus size={16} aria-hidden="true" /> Tambah Pengguna
          </button>
        </div>

        {/* Filter bar */}
        <div className="filter-bar">
          <div className="search-input-wrapper">
            <Search size={18} aria-hidden="true" />
            <input
              id="search-pengguna"
              className="search-input"
              placeholder="Cari nama atau email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select id="filter-peran" className="filter-select" value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
            <option value="all">Semua Peran</option>
            {Object.entries(USER_ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select id="filter-status" className="filter-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)}>
            <option value="all">Semua Status</option>
            <option value="aktif">Aktif</option>
            <option value="nonaktif">Nonaktif</option>
          </select>
        </div>

        {/* Tabel */}
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Email</th>
                <th>Peran</th>
                <th>Unit Kerja</th>
                <th>Tanda Tangan</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--tinta-redup)', padding: 32 }}>Tidak ada pengguna yang cocok.</td></tr>
              ) : filtered.map((u) => {
                const uk = state.unitKerja.find((x) => x.id === u.unitKerjaId);
                return (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 500 }}>{u.nama}</td>
                    <td style={{ fontSize: 13, color: 'var(--tinta-redup)' }}>{u.email}</td>
                    <td>
                      <span className="chip chip-info" style={{ fontSize: 11 }}>{USER_ROLE_LABELS[u.role]}</span>
                    </td>
                    <td style={{ fontSize: 13 }}>
                      {isNoUnit(u.role) ? '—' : uk ? (
                        <span>
                          {uk.nama}{!uk.aktif && <span style={{ color: 'var(--tinta-redup)', fontSize: 11, marginLeft: 4 }}>(nonaktif)</span>}
                        </span>
                      ) : '—'}
                    </td>
                    <td>
                      {u.urlTandaTangan ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <span className="chip chip-sukses" style={{ fontSize: 10 }}>Tersedia</span>
                          <button
                            type="button"
                            className="btn btn-sm btn-ghost"
                            style={{ padding: '2px 4px' }}
                            title="Tinjau tanda tangan digital"
                            onClick={() => {
                              setSignatureModalUser(u);
                              setSignatureUploadDataUrl(null);
                            }}
                          >
                            <Eye size={13} />
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 11, color: 'var(--tinta-redup)' }}>Belum ada</span>
                          <button
                            type="button"
                            className="btn btn-sm btn-ghost"
                            style={{ padding: '2px 4px' }}
                            title="Unggah tanda tangan untuk pengguna ini"
                            onClick={() => {
                              setSignatureModalUser(u);
                              setSignatureUploadDataUrl(null);
                            }}
                          >
                            <Upload size={13} />
                          </button>
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`chip ${u.aktif ? 'chip-sukses' : 'chip-netral'}`} style={{ fontSize: 11 }}>
                        {u.aktif ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          className="btn btn-sm btn-ghost"
                          title="Ubah data"
                          id={`btn-edit-${u.id}`}
                          onClick={() => {
                            setEditError('');
                            setEditModal({
                              id: u.id, nama: u.nama, email: u.email, role: u.role,
                              unitKerjaId: isSekretariat(u.role) ? (u.unitKerjaId || sekretariatUnit?.id || '') : (u.unitKerjaId || ''),
                            });
                          }}
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          className="btn btn-sm btn-ghost"
                          title="Reset kata sandi"
                          id={`btn-reset-${u.id}`}
                          onClick={() => { setResetSent(false); setResetTarget({ id: u.id, nama: u.nama, email: u.email }); }}
                        >
                          <Key size={14} />
                        </button>
                        <button
                          className={`btn btn-sm ${u.aktif ? 'btn-ghost' : 'btn-ghost'}`}
                          title={u.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                          id={`btn-toggle-${u.id}`}
                          onClick={() => setToggleTarget({ id: u.id, nama: u.nama, aktif: u.aktif })}
                        >
                          {u.aktif ? <UserX size={14} /> : <UserCheck size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Modal Tambah Pengguna ─────────────────────────── */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Tambah Pengguna Baru</h2>
                <button className="modal-close" onClick={() => setShowModal(false)} aria-label="Tutup">✕</button>
              </div>
              <div className="modal-body">
                {formError && (
                  <div className="modal-error" role="alert">
                    <AlertCircle size={15} aria-hidden="true" /> {formError}
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label" htmlFor="add-nama">Nama Lengkap <span className="required">*</span></label>
                  <input id="add-nama" className="form-input" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} placeholder="Nama lengkap" />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="add-email">Email <span className="required">*</span></label>
                  <input id="add-email" className="form-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@distan.go.id" />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="add-peran">Peran <span className="required">*</span></label>
                  <select id="add-peran" className="form-select" value={form.role} onChange={(e) => handleRoleChange(e.target.value as UserRole)}>
                    {Object.entries(USER_ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                {isBidang(form.role) && (
                  <div className="form-group">
                    <label className="form-label" htmlFor="add-unit">Bidang <span className="required">*</span></label>
                    <select id="add-unit" className="form-select" value={form.unitKerjaId} onChange={(e) => setForm({ ...form, unitKerjaId: e.target.value })}>
                      <option value="">— Pilih Bidang —</option>
                      {bidangAktif.map((u) => <option key={u.id} value={u.id}>{u.nama}</option>)}
                    </select>
                  </div>
                )}
                {isSekretariat(form.role) && (
                  <div className="form-group">
                    <label className="form-label">Unit Kerja</label>
                    <div className="form-input-readonly">Sekretariat</div>
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label" htmlFor="add-pass">Kata Sandi Awal (Prototipe) <span className="required">*</span></label>
                  <input id="add-pass" className="form-input" type="text" value={form.dummyPassword} onChange={(e) => setForm({ ...form, dummyPassword: e.target.value })} />
                  <p className="form-hint">Produksi: Supabase Auth akan mengirim tautan undangan ke email pengguna, bukan membuat kata sandi secara manual.</p>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Batal</button>
                <button id="btn-simpan-tambah" className="btn btn-primary" onClick={handleAdd} disabled={!form.nama || !form.email}>
                  <Plus size={15} aria-hidden="true" /> Tambah
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Modal Ubah Pengguna ──────────────────────────── */}
        {editModal && (
          <div className="modal-overlay" onClick={() => setEditModal(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Ubah Data Pengguna</h2>
                <button className="modal-close" onClick={() => setEditModal(null)} aria-label="Tutup">✕</button>
              </div>
              <div className="modal-body">
                {editError && (
                  <div className="modal-error" role="alert">
                    <AlertCircle size={15} aria-hidden="true" /> {editError}
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-nama">Nama Lengkap <span className="required">*</span></label>
                  <input id="edit-nama" className="form-input" value={editModal.nama} onChange={(e) => setEditModal({ ...editModal, nama: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-email">Email <span className="required">*</span></label>
                  <input id="edit-email" className="form-input" type="email" value={editModal.email} onChange={(e) => setEditModal({ ...editModal, email: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-peran">Peran <span className="required">*</span></label>
                  <select id="edit-peran" className="form-select" value={editModal.role} onChange={(e) => handleEditRoleChange(e.target.value as UserRole)}>
                    {Object.entries(USER_ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                {isBidang(editModal.role) && (
                  <div className="form-group">
                    <label className="form-label" htmlFor="edit-unit">Bidang <span className="required">*</span></label>
                    <select id="edit-unit" className="form-select" value={editModal.unitKerjaId} onChange={(e) => setEditModal({ ...editModal, unitKerjaId: e.target.value })}>
                      <option value="">— Pilih Bidang —</option>
                      {bidangAktif.map((u) => <option key={u.id} value={u.id}>{u.nama}</option>)}
                    </select>
                  </div>
                )}
                {isSekretariat(editModal.role) && (
                  <div className="form-group">
                    <label className="form-label">Unit Kerja</label>
                    <div className="form-input-readonly">Sekretariat</div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setEditModal(null)}>Batal</button>
                <button id="btn-simpan-ubah" className="btn btn-primary" onClick={handleEdit} disabled={!editModal.nama || !editModal.email}>
                  Simpan Perubahan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Dialog: Aktifkan / Nonaktifkan ───────────────── */}
        <KonfirmasiDialog
          open={!!toggleTarget}
          onClose={() => setToggleTarget(null)}
          onConfirm={handleToggleConfirm}
          judul={toggleTarget?.aktif ? 'Nonaktifkan Akun?' : 'Aktifkan Kembali?'}
          pesan={
            toggleTarget?.aktif
              ? `Akun ${toggleTarget.nama} akan dinonaktifkan. Pengguna tidak dapat masuk sampai diaktifkan kembali.`
              : `Akun ${toggleTarget?.nama} akan diaktifkan kembali.`
          }
          labelKonfirmasi={toggleTarget?.aktif ? 'Ya, Nonaktifkan' : 'Ya, Aktifkan'}
          bahaya={toggleTarget?.aktif}
        />

        {/* ── Modal: Reset Kata Sandi (simulasi Supabase Auth) ─ */}
        {resetTarget && (
          <div className="modal-overlay" onClick={closeResetModal}>
            <div className="modal" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Reset Kata Sandi</h2>
                <button className="modal-close" onClick={closeResetModal} aria-label="Tutup">✕</button>
              </div>
              <div className="modal-body">
                {!resetSent ? (
                  <>
                    <p style={{ fontSize: 14, color: 'var(--tinta-redup)', marginBottom: 16 }}>
                      Tautan atur ulang kata sandi akan dikirim ke email{' '}
                      <strong>{resetTarget.email}</strong> atas nama{' '}
                      <strong>{resetTarget.nama}</strong>.
                    </p>
                    <div className="admin-info-box">
                      <Mail size={15} aria-hidden="true" />
                      <span>
                        Pengguna akan menerima email berisi tautan satu kali pakai untuk mengatur kata sandi baru.
                        Kata sandi <strong>tidak pernah ditampilkan</strong> di layar ini.
                      </span>
                    </div>
                    <div className="admin-warning-box" style={{ marginTop: 12 }}>
                      ⚠ Aksi ini akan dicatat di Log Aktivitas sistem.
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '24px 0' }}>
                    <CheckCircle2 size={40} style={{ color: 'var(--pinus)', marginBottom: 12 }} aria-hidden="true" />
                    <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Tautan terkirim</div>
                    <div style={{ fontSize: 13, color: 'var(--tinta-redup)' }}>
                      Email atur ulang kata sandi telah dikirim ke <strong>{resetTarget.email}</strong>.<br />
                      Tautan berlaku selama 1 jam.
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={closeResetModal}>
                  {resetSent ? 'Tutup' : 'Batal'}
                </button>
                {!resetSent && (
                  <button
                    id="btn-kirim-reset"
                    className="btn btn-primary"
                    onClick={handleResetPassword}
                    disabled={resetting}
                  >
                    <Key size={15} aria-hidden="true" />
                    {resetting ? 'Mengirim…' : 'Kirim Tautan Atur Ulang'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Modal Kelola Tanda Tangan Digital Pengguna (Tahap 3) ── */}
        {signatureModalUser && (
          <ModalStandar
            open={!!signatureModalUser}
            onClose={() => {
              setSignatureModalUser(null);
              setSignatureUploadDataUrl(null);
            }}
            judul={`Tanda Tangan Digital: ${signatureModalUser.nama}`}
            size="md"
            footerSecondary={
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setSignatureModalUser(null);
                  setSignatureUploadDataUrl(null);
                }}
              >
                Tutup
              </button>
            }
          >
            <div style={{ fontSize: 13, lineHeight: 1.6 }}>
              <div style={{ marginBottom: 14 }}>
                <span className="badge badge-info">{USER_ROLE_LABELS[signatureModalUser.role]}</span>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  Email: {signatureModalUser.email}
                </div>
              </div>

              {/* Tanda Tangan Saat Ini */}
              <div
                style={{
                  padding: 14,
                  background: 'var(--gray-50)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 8,
                  marginBottom: 16,
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8 }}>
                  Tanda Tangan Tersimpan:
                </div>
                {signatureModalUser.urlTandaTangan ? (
                  <div>
                    <div
                      style={{
                        height: 84,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#ffffff',
                        borderRadius: 6,
                        border: '1px solid var(--border-color)',
                        padding: 8,
                        marginBottom: 10,
                      }}
                    >
                      <img
                        src={signatureModalUser.urlTandaTangan}
                        alt="Tanda Tangan"
                        style={{ maxHeight: 72, maxWidth: '100%', objectFit: 'contain' }}
                      />
                    </div>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={async () => {
                        if (confirm(`Hapus tanda tangan digital untuk ${signatureModalUser.nama}?`)) {
                          await apiHapusTandaTangan(signatureModalUser.id);
                          setSignatureModalUser(null);
                        }
                      }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      <Trash2 size={13} />
                      Hapus / Reset Tanda Tangan
                    </button>
                  </div>
                ) : (
                  <div style={{ padding: '12px 0', color: 'var(--text-muted)' }}>
                    Pengguna ini belum memiliki tanda tangan digital tersimpan.
                  </div>
                )}
              </div>

              {/* Form Unggah / Ganti Tanda Tangan */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 14 }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: 12, marginBottom: 6 }}>
                  Unggah Berkas Tanda Tangan Baru (PNG Transparan):
                </label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      setSignatureUploadDataUrl(ev.target?.result as string);
                    };
                    reader.readAsDataURL(file);
                  }}
                  className="form-control"
                  style={{ fontSize: 12, marginBottom: 8 }}
                />
                {signatureUploadDataUrl && (
                  <div style={{ textAlign: 'center', marginBottom: 10 }}>
                    <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 4, padding: 4, marginBottom: 8 }}>
                      <img src={signatureUploadDataUrl} alt="Pratinjau Unggah" style={{ maxHeight: 56, objectFit: 'contain' }} />
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={async () => {
                        await apiUploadTandaTangan(signatureModalUser.id, signatureUploadDataUrl);
                        setSignatureModalUser(null);
                        setSignatureUploadDataUrl(null);
                      }}
                      style={{ width: '100%' }}
                    >
                      Simpan Tanda Tangan untuk Pengguna Ini
                    </button>
                  </div>
                )}
              </div>
            </div>
          </ModalStandar>
        )}
      </div>
    </DashboardLayout>
  );
}
