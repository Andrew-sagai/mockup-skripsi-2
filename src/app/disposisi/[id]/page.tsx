'use client';
/**
 * Kartu Disposisi Digital — Replika Lembar Disposisi Kertas
 * Dinas Pertanian Kabupaten Minahasa Selatan
 *
 * Zona Z1-Z10 = bagian kertas (dicetak persis A4)
 * Zona Z11-Z16 = panel lanjutan digital (hanya layar, dicetak halaman 2)
 */
import React, { use, useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useStore } from '@/lib/store';
import { useBusinessLogic } from '@/lib/api';
import { JENIS_INSTRUKSI_LABELS, JenisInstruksi, InstruksiDisposisi } from '@/lib/types';
import {
  hitungIzinZona, WARNA_PERAN, LABEL_PEMILIK_ZONA, NAMA_PERAN_PENDEK, KonteksIzin,
} from '@/lib/disposisi/izin';
import {
  ArrowLeft, Printer, Lock, Eye, EyeOff, CheckSquare, Square,
  AlertCircle, CheckCircle, Clock, ChevronRight, FileText, Send,
  UserCheck, UserPlus, Shield, Info, RotateCcw,
} from 'lucide-react';

// ─── Konstanta warna ────────────────────────────────────────────────────────
const SIFAT_KOTAK = ['segera', 'rahasia'] as const;
const SIFAT_KOTAK_LABEL: Record<string, string> = {
  segera: 'Segera',
  rahasia: 'Rahasia',
};

// ─── Status Step Labels ──────────────────────────────────────────────────────
const STEPS = [
  { key: 'menunggu_disposisi', label: 'Menunggu\nDisposisi' },
  { key: 'didisposisikan',     label: 'Didisposisikan' },
  { key: 'diterima_bidang',    label: 'Diterima\nBidang' },
  { key: 'diteruskan_ke_staf', label: 'Diteruskan\nke Staf' },
  { key: 'menunggu_pemeriksaan', label: 'Menunggu\nPemeriksaan' },
  { key: 'selesai',            label: 'Selesai' },
];

// ─── Helper: format tanggal Indonesia ───────────────────────────────────────
function fmtTgl(iso?: string, opts?: Intl.DateTimeFormatOptions): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('id-ID', opts || {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}
function fmtTglWaktu(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Sub-komponen: ZonaWrapper ───────────────────────────────────────────────
interface ZonaWrapperProps {
  izin: 'isi' | 'baca' | 'sembunyi';
  pemilik?: string;
  showBadge: boolean;
  labelBagianAnda?: boolean;
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}
function ZonaWrapper({ izin, pemilik, showBadge, labelBagianAnda, children, style, className }: ZonaWrapperProps) {
  if (izin === 'sembunyi') return null;

  const outlineStyle: React.CSSProperties = labelBagianAnda && izin === 'isi'
    ? { outline: '2px solid #15803D', background: '#f0fdf4' }
    : {};

  return (
    <div style={{ position: 'relative', ...outlineStyle, ...style }} className={className}>
      {showBadge && pemilik && (
        <span style={{
          position: 'absolute', top: 3, right: 4, zIndex: 10,
          fontSize: 9, padding: '1px 5px', borderRadius: 3,
          background: WARNA_PERAN[pemilik as keyof typeof WARNA_PERAN] || '#667085',
          color: '#fff', fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap',
          letterSpacing: 0.2,
        }}>
          Diisi: {NAMA_PERAN_PENDEK[pemilik as keyof typeof NAMA_PERAN_PENDEK] || pemilik}
        </span>
      )}
      {labelBagianAnda && izin === 'isi' && (
        <span style={{
          position: 'absolute', top: 3, left: 4, zIndex: 10,
          fontSize: 9, padding: '1px 6px', borderRadius: 3,
          background: '#15803D', color: '#fff',
          fontFamily: 'DM Sans, sans-serif', letterSpacing: 0.2,
        }}>
          Bagian Anda
        </span>
      )}
      {children}
    </div>
  );
}

// ─── Sub-komponen: Kotak Centang Gaya Kertas ─────────────────────────────────
function CheckboxKertas({
  checked, label, subLabel, onChange, disabled, multiline,
}: {
  checked: boolean; label: string; subLabel?: React.ReactNode; onChange?: (v: boolean) => void;
  disabled?: boolean; multiline?: boolean;
}) {
  return (
    <label style={{
      display: 'flex', alignItems: multiline ? 'flex-start' : 'center',
      gap: 6, cursor: disabled ? 'default' : 'pointer',
      marginBottom: 2, minHeight: 44,
    }}>
      <span
        onClick={() => !disabled && onChange?.(!checked)}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 18, height: 18, border: '1.5px solid #222', background: '#fff',
          flexShrink: 0, marginTop: multiline ? 2 : 0,
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontSize: 14, fontWeight: 900, color: '#222',
          userSelect: 'none',
        }}
      >
        {checked ? '☒' : ''}
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: subLabel ? 4 : 0 }}>
        <span style={{ fontSize: 12, lineHeight: '1.35', fontFamily: 'serif' }}>
          {label}
        </span>
        {subLabel && (
          <span style={{ fontSize: 10, color: disabled ? '#d97706' : '#64748b', fontFamily: 'serif', marginTop: 2, fontStyle: disabled ? 'italic' : 'normal' }}>
            {subLabel}
          </span>
        )}
      </div>
    </label>
  );
}

// ─── Modal Konfirmasi ────────────────────────────────────────────────────────
function ModalKonfirmasi({
  judul, pesan, onSetuju, onBatal, loading,
  children,
}: {
  judul: string; pesan: string; onSetuju: () => void; onBatal: () => void;
  loading?: boolean; children?: React.ReactNode;
}) {
  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>{judul}</h2>
        </div>
        <div className="modal-body">
          <p style={{ margin: '0 0 16px', color: 'var(--text-secondary)', fontSize: 14 }}>{pesan}</p>
          {children}
        </div>
        <div className="modal-footer" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onBatal} disabled={loading}>Batal</button>
          <button className="btn btn-primary" onClick={onSetuju} disabled={loading}>
            {loading ? 'Memproses...' : 'Ya, Lanjutkan'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HALAMAN UTAMA
// ═══════════════════════════════════════════════════════════════════════════════
export default function KartuDisposisiPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { state, getUser, getKlasifikasi, getJenisSurat } = useStore();
  const {
    apiBeriDisposisi, apiTerimaDisposisi, apiTeruskanKeStaf,
    apiTindakLanjutLangsung, apiLaporkanHasil, apiPeriksaLaporan, apiSimpanProgres,
    apiBeriCatatanSekdis, apiBubuhkanParaf, apiTidakPerluDisposisi,
  } = useBusinessLogic();

  const router = useRouter();
  const user = state.currentUser;

  // ─── UI State ────────────────────────────────────────────────────────────
  const [showBadge, setShowBadge] = useState(true);
  const [modal, setModal] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Form: Kepala Dinas (Z6-Z9)
  const [selectedTujuan, setSelectedTujuan] = useState<string[]>([]);
  const [instruksiList, setInstruksiList] = useState<InstruksiDisposisi[]>([]);
  const [instruksiLainnyaTeks, setInstruksiLainnyaTeks] = useState('');
  const [catatan, setCatatan] = useState('');
  const [tenggat, setTenggat] = useState('');
  const [selectedSifat, setSelectedSifat] = useState<string>('');

  // Form: Kepala Bidang
  const [selectedStaf, setSelectedStaf] = useState('');
  const [catatanPenugasan, setCatatanPenugasan] = useState('');
  const [uraianHasil, setUraianHasil] = useState('');
  const [fileBerkas, setFileBerkas] = useState<File | null>(null);
  const [catatanKembali, setCatatanKembali] = useState('');
  const [catatanTidakPerlu, setCatatanTidakPerlu] = useState('');

  // Form: Sekretaris Z11
  const [catatanKoordinasi, setCatatanKoordinasi] = useState('');
  // AT-06: Kepala Bidang wajib pilih apakah perlu surat jawaban
  const [perluSuratJawaban, setPerluSuratJawaban] = useState<boolean | null>(null);
  
  // Form: Staf Progres
  const [catatanProgres, setCatatanProgres] = useState('');

  // ─── Data ────────────────────────────────────────────────────────────────
  const disposisi = state.disposisi.find(d => d.id === id);
  const sm = disposisi ? state.suratMasuk.find(s => s.id === disposisi.suratMasukId) : null;
  const instansi = state.pengaturanInstansi;

  // Gunakan snapshot bila sudah terkunci (setelah paraf Kadis)
  const snapSurat = disposisi?.snapshotSurat;
  const dataSurat = {
    asalSurat:        snapSurat?.asalSurat       || sm?.asalSurat       || '',
    nomorSuratAsal:   snapSurat?.nomorSuratAsal  || sm?.nomorSuratAsal  || '',
    tanggalSuratAsal: snapSurat?.tanggalSuratAsal|| sm?.tanggalSuratAsal|| '',
    perihal:          snapSurat?.perihal          || sm?.perihal         || '',
    sifat:            snapSurat?.sifat            || sm?.sifat           || 'biasa',
    nomorAgenda:      snapSurat?.nomorAgenda      || sm?.nomorAgenda     || '',
    tanggalTerima:    snapSurat?.tanggalTerima    || sm?.tanggalTerima   || '',
    batasWaktuSurat:  snapSurat?.batasWaktuSurat  || sm?.batasWaktuSurat || '',
  };

  const penugasan    = disposisi ? state.penugasan.filter(p => p.disposisiId === disposisi.id) : [];
  const tindakLanjut = disposisi ? state.tindakLanjut.filter(t => t.disposisiId === disposisi.id) : [];
  const riwayat      = sm
    ? state.riwayat.filter(r => r.suratMasukId === sm.id)
        .sort((a, b) => new Date(b.waktu).getTime() - new Date(a.waktu).getTime())
    : [];

  // ─── Akses ───────────────────────────────────────────────────────────────
  // Admin tidak boleh lihat kartu
  if (user?.role === 'admin') {
    return (
      <DashboardLayout>
        <div className="empty-state">
          <Shield size={48} style={{ color: 'var(--danger)', marginBottom: 12 }} />
          <h3>Akses Ditolak (403)</h3>
          <p style={{ color: 'var(--text-muted)' }}>
            Administrator tidak memiliki akses ke isi kartu disposisi sesuai kebijakan sistem.
          </p>
          <Link href="/dashboard" className="btn btn-secondary" style={{ marginTop: 16 }}>
            Kembali ke Dashboard
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  if (!disposisi || !sm) {
    return (
      <DashboardLayout>
        <div className="empty-state">
          <AlertCircle size={48} style={{ color: 'var(--danger)', marginBottom: 12 }} />
          <h3>Kartu Tidak Ditemukan</h3>
          <p style={{ color: 'var(--text-muted)' }}>Kartu disposisi dengan ID tersebut tidak ada atau Anda tidak memiliki akses.</p>
          <Link href="/disposisi" className="btn btn-secondary" style={{ marginTop: 16 }}>
            Kembali
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  // Cek akses Kepala Bidang: harus jadi tujuan
  const myBidangItem = disposisi.bidangTujuan.find(b => b.unitKerjaId === user?.unitKerjaId);
  if (user?.role === 'kepala_bidang' && !myBidangItem && disposisi.status !== 'menunggu_disposisi') {
    return (
      <DashboardLayout>
        <div className="empty-state">
          <Shield size={48} style={{ color: 'var(--danger)', marginBottom: 12 }} />
          <h3>Akses Ditolak (403)</h3>
          <p style={{ color: 'var(--text-muted)' }}>Bidang Anda bukan tujuan disposisi ini.</p>
          <Link href="/disposisi" className="btn btn-secondary" style={{ marginTop: 16 }}>Kembali</Link>
        </div>
      </DashboardLayout>
    );
  }

  // Staf: hanya yang punya penugasan
  const myPenugasan = penugasan.find(p => p.stafId === user?.id);
  if (user?.role === 'staf_pelaksana' && !myPenugasan) {
    return (
      <DashboardLayout>
        <div className="empty-state">
          <Shield size={48} style={{ color: 'var(--danger)', marginBottom: 12 }} />
          <h3>Akses Ditolak (403)</h3>
          <p style={{ color: 'var(--text-muted)' }}>Anda tidak memiliki penugasan pada disposisi ini.</p>
          <Link href="/disposisi" className="btn btn-secondary" style={{ marginTop: 16 }}>Kembali</Link>
        </div>
      </DashboardLayout>
    );
  }

  // ─── Hitung izin zona ────────────────────────────────────────────────────
  const isKoordinasi = !!(
    disposisi.lintasBidang ||
    disposisi.bidangTujuan.some(b => b.tipe === 'sekretaris') ||
    (disposisi.instruksiList || []).some(i => i.jenis === 'koordinasi_konfirmasi') ||
    disposisi.instruksi === 'koordinasi_konfirmasi'
  );

  const konteks: KonteksIzin = {
    peran:               user?.role || 'petugas_surat',
    unitKerjaId:         user?.unitKerjaId || null,
    statusKartu:         disposisi.status,
    adalahKoordinasi:    isKoordinasi,
    bidangIniAdalahTujuan: !!myBidangItem,
    punyaPenugasan:      !!myPenugasan,
  };
  const izin = hitungIzinZona(konteks);

  // ─── Helpers ─────────────────────────────────────────────────────────────
  const unitKerja = state.unitKerja.sort((a, b) => (a.urutanLembar || 99) - (b.urutanLembar || 99));
  const myStaf = state.users.filter(u => u.role === 'staf_pelaksana' && u.unitKerjaId === user?.unitKerjaId);
  const kadisUser = state.users.find(u => u.role === 'kepala_dinas' && u.aktif);

  const isKadis   = user?.role === 'kepala_dinas';
  const isKabid   = user?.role === 'kepala_bidang';
  const isStaf    = user?.role === 'staf_pelaksana';
  const isSekdis  = user?.role === 'sekretaris';
  const isPetugas = user?.role === 'petugas_surat';

  const myBidangStatusObj = user?.unitKerjaId ? disposisi.statusPerBidang?.[user.unitKerjaId] : undefined;
  const isMyBidangReceived = myBidangStatusObj?.status === 'diterima_bidang'
    || myBidangStatusObj?.status === 'diteruskan_staf'
    || myBidangStatusObj?.status === 'ditindak_langsung'
    || myBidangItem?.statusTerima === 'diterima';

  const sudahParaf = !!(disposisi.parafKdAt || disposisi.parafKepalaWaktu);

  // Progress multi-tujuan
  const totalTujuan = disposisi.bidangTujuan.length;
  const selesaiTujuan = Object.values(disposisi.statusPerBidang || {})
    .filter(s => s.status === 'ditindak_langsung').length;
  const sebagianSelesai = totalTujuan > 1 && selesaiTujuan > 0 && selesaiTujuan < totalTujuan;

  // ─── Efek: inisialisasi sifat ───
  useEffect(() => {
    if (dataSurat.sifat && !selectedSifat) {
      setSelectedSifat(dataSurat.sifat);
    }
  }, [dataSurat.sifat, selectedSifat]);

  // Toggle instruksi (multi-select)
  const toggleInstruksi = (jenis: JenisInstruksi) => {
    setInstruksiList(prev => {
      const ada = prev.some(i => i.jenis === jenis);
      if (ada) return prev.filter(i => i.jenis !== jenis);
      return [...prev, { jenis, teks: jenis === 'lainnya' ? instruksiLainnyaTeks : undefined }];
    });
  };
  const instruksiChecked = (jenis: JenisInstruksi) => instruksiList.some(i => i.jenis === jenis);

  // ─── Handlers ────────────────────────────────────────────────────────────
  const handleBubuhkanParaf = () => {
    try {
      setErrorMsg('');
      apiBubuhkanParaf(id);
      setSuccessMsg('Paraf elektronik berhasil dibubuhkan.');
    } catch (e: any) { setErrorMsg(e.message); }
  };

  const handleKirimDisposisi = () => {
    setErrorMsg('');
    if (selectedTujuan.length === 0) {
      setErrorMsg('Pilih minimal satu tujuan disposisi.');
      return;
    }
    if (!sudahParaf) {
      setErrorMsg('Bubuhkan paraf elektronik terlebih dahulu sebelum mengirim disposisi.');
      return;
    }
    // Tenggat tidak wajib sesuai spesifikasi L31 — diisi opsional oleh Kepala Dinas
    setModal('kirim-disposisi');
  };

  const doKirimDisposisi = () => {
    setLoading(true);
    try {
      const instruksiUtama: JenisInstruksi = instruksiList.length > 0
        ? instruksiList[0].jenis
        : 'proses_lanjut';
      const updatedList = instruksiList.map(i =>
        i.jenis === 'lainnya' ? { ...i, teks: instruksiLainnyaTeks } : i
      );
      apiBeriDisposisi(id, instruksiUtama, selectedTujuan, catatan, tenggat,
        instruksiLainnyaTeks, updatedList, selectedSifat as any);
      setSuccessMsg('Disposisi berhasil dikirim.');
      setModal(null);
    } catch (e: any) { setErrorMsg(e.message); }
    setLoading(false);
  };

  const handleTidakPerluDisposisi = () => {
    if (!catatanTidakPerlu.trim()) {
      setErrorMsg('Catatan alasan wajib diisi.');
      return;
    }
    setModal('tidak-perlu');
  };

  const doTidakPerluDisposisi = () => {
    setLoading(true);
    try {
      apiTidakPerluDisposisi(id, catatanTidakPerlu);
      setSuccessMsg('Keputusan disimpan. Petugas Surat telah diberitahu.');
      setModal(null);
    } catch (e: any) { setErrorMsg(e.message); }
    setLoading(false);
  };

  const handleTerimaDisposisi = () => {
    try {
      setErrorMsg('');
      apiTerimaDisposisi(id);
      setSuccessMsg('Disposisi diterima dan diparaf oleh bidang Anda.');
    } catch (e: any) { setErrorMsg(e.message); }
  };

  const handleTeruskanStaf = () => {
    setErrorMsg('');
    if (!selectedStaf) { setErrorMsg('Staf pelaksana wajib dipilih.'); return; }
    setModal('teruskan-staf');
  };
  const doTeruskanStaf = () => {
    setLoading(true);
    try {
      apiTeruskanKeStaf(id, selectedStaf, catatanPenugasan);
      setSuccessMsg('Penugasan diteruskan ke staf pelaksana.');
      setModal(null);
    } catch (e: any) { setErrorMsg(e.message); }
    setLoading(false);
  };

  const handleTindakLangsung = () => {
    setErrorMsg('');
    if (!uraianHasil.trim()) { setErrorMsg('Uraian hasil wajib diisi.'); return; }
    setModal('tindak-langsung');
  };
  const doTindakLangsung = () => {
    setLoading(true);
    try {
      apiTindakLanjutLangsung(id, uraianHasil, fileBerkas, perluSuratJawaban === true);
      setSuccessMsg('Tindak lanjut langsung berhasil. Disposisi selesai.');
      setModal(null);
    } catch (e: any) { setErrorMsg(e.message); }
    setLoading(false);
  };

  const handleKirimLaporan = () => {
    setErrorMsg('');
    if (!uraianHasil.trim()) { setErrorMsg('Uraian hasil laporan wajib diisi.'); return; }
    setModal('kirim-laporan');
  };
  const doKirimLaporan = () => {
    setLoading(true);
    try {
      apiLaporkanHasil(id, uraianHasil, fileBerkas);
      setSuccessMsg('Laporan berhasil dikirim ke Kepala Bidang.');
      setModal(null);
    } catch (e: any) { setErrorMsg(e.message); }
    setLoading(false);
  };

  const handleSimpanProgres = () => {
    setErrorMsg('');
    try {
      apiSimpanProgres(id, catatanProgres);
      setSuccessMsg('Progres berhasil disimpan. Status menjadi Sedang Dikerjakan.');
    } catch (e: any) { setErrorMsg(e.message); }
  };

  const handleSetujuiLaporan = (tlId: string) => {
    if (perluSuratJawaban === null) {
      setErrorMsg('Pilih apakah perlu surat jawaban terlebih dahulu.');
      return;
    }
    try {
      setErrorMsg('');
      apiPeriksaLaporan(tlId, true, '', perluSuratJawaban);
      setSuccessMsg('Laporan disetujui. Disposisi selesai.');
    } catch (e: any) { setErrorMsg(e.message); }
  };

  const handleKembalikanLaporan = (tlId: string) => {
    if (!catatanKembali.trim()) { setErrorMsg('Catatan perbaikan wajib diisi.'); return; }
    setModal(`kembalikan-${tlId}`);
  };
  const doKembalikanLaporan = (tlId: string) => {
    setLoading(true);
    try {
      apiPeriksaLaporan(tlId, false, catatanKembali);
      setSuccessMsg('Laporan dikembalikan untuk perbaikan.');
      setModal(null);
    } catch (e: any) { setErrorMsg(e.message); }
    setLoading(false);
  };

  const handleSimpanKoordinasi = () => {
    try {
      setErrorMsg('');
      apiBeriCatatanSekdis(id, catatanKoordinasi);
      setSuccessMsg('Catatan koordinasi berhasil disimpan.');
    } catch (e: any) { setErrorMsg(e.message); }
  };

  // ─── Rendering ────────────────────────────────────────────────────────────
  const currentStepIdx = STEPS.findIndex(s => s.key === disposisi.status);

  return (
    <DashboardLayout>
      <style>{`
        /* ── Kertas ── */
        .kartu-kertas {
          width: 100%; max-width: 794px; margin: 0 auto;
          background: #fff;
          border: 1.5px solid #111;
          font-family: 'Times New Roman', Times, serif;
          font-size: 13px; line-height: 1.4; color: #111;
          box-shadow: 0 4px 24px rgba(0,0,0,0.12);
        }
        .kartu-kertas .zona-row {
          border-bottom: 1px solid #111;
        }
        .kartu-kertas .zona-row:last-child { border-bottom: none; }
        .kartu-kertas .zona-two-col {
          display: grid; grid-template-columns: 1fr 1fr;
          border-bottom: 1px solid #111;
        }
        .kartu-kertas .zona-col-left {
          border-right: 1px solid #111; padding: 8px 10px;
        }
        .kartu-kertas .zona-col-right { padding: 8px 10px; }
        .kartu-kertas .zona-pad { padding: 8px 10px; }
        .kartu-kertas .label { font-weight: 400; }
        .kartu-kertas .label-bold { font-weight: 700; }
        .kartu-kertas .mono { font-family: 'Courier New', monospace; }

        /* ── Z1 Kop ── */
        .kop-header {
          display: flex; align-items: center; gap: 14px;
          padding: 10px 14px 8px;
          border-bottom: 3px double #111;
        }
        .kop-logo { width: 56px; height: 56px; object-fit: contain; flex-shrink: 0; }
        .kop-text { flex: 1; }
        .kop-nama-pemda { font-size: 14px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; }
        .kop-nama-instansi { font-size: 16px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; }
        .kop-alamat { font-size: 11px; margin-top: 2px; }

        /* ── Z2 Judul ── */
        .z2-judul {
          text-align: center; font-size: 14px; font-weight: 900;
          text-transform: uppercase; letter-spacing: 2px;
          padding: 6px 0; border-bottom: 1px solid #111;
        }

        /* ── Cetak ── */
        @media print {
          body > * { display: none !important; }
          .print-area { display: block !important; }
          .kartu-kertas { box-shadow: none; border: 1.5px solid #000; }
          .no-print, .badge-zona, .zona-label { display: none !important; }
          .action-panel { display: none !important; }
          .page-header { display: none !important; }
          .stepper-mini { display: none !important; }
          .z11-z16 { page-break-before: always; }
        }

        /* ── Zona badge outline ── */
        .zona-can-edit { outline: 2px solid #15803D; background: #f0fdf4; }
        .zona-waiting { outline: 1.5px dashed #9ca3af; }
        .zona-locked { opacity: 0.88; }

        /* ── Z9 Paraf stempel ── */
        .stempel-paraf {
          display: inline-block; border: 2px solid #15803D;
          border-radius: 6px; padding: 6px 14px;
          color: #15803D; font-size: 11px;
          font-family: 'DM Sans', sans-serif;
        }

        /* ── Stepper ── */
        .stepper {
          display: flex; align-items: center; gap: 0;
          overflow-x: auto; padding: 4px 0;
        }
        .step-item {
          display: flex; flex-direction: column; align-items: center;
          min-width: 80px; font-size: 10px; text-align: center;
          font-family: 'DM Sans', sans-serif;
        }
        .step-dot {
          width: 20px; height: 20px; border-radius: 50%;
          border: 2px solid #d1d5db;
          background: #fff; display: flex; align-items: center; justify-content: center;
          font-size: 9px; font-weight: 700; flex-shrink: 0;
        }
        .step-dot.done   { background: #15803D; border-color: #15803D; color: #fff; }
        .step-dot.active { background: #fff; border-color: #15803D; color: #15803D; }
        .step-line { flex: 1; height: 2px; background: #d1d5db; min-width: 12px; }
        .step-line.done { background: #15803D; }

        /* ── Panel lanjutan ── */
        .panel-lanjutan {
          background: #fff; border-radius: 10px;
          border: 1px solid var(--border-color);
          margin-top: 16px;
          font-family: 'DM Sans', sans-serif;
        }
        .panel-lanjutan .pl-header {
          padding: 12px 16px; border-bottom: 1px solid var(--border-color);
          font-weight: 600; font-size: 13px; display: flex; align-items: center; gap: 8px;
        }
        .panel-lanjutan .pl-body { padding: 16px; }

        /* ── Action panel ── */
        .action-panel {
          background: var(--gray-50);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 16px 20px;
          display: flex; gap: 10px; flex-wrap: wrap;
          align-items: center; justify-content: flex-end;
          margin-top: 24px;
        }

        @media (max-width: 768px) {
          .kartu-kertas .zona-two-col { grid-template-columns: 1fr; }
          .kartu-kertas .zona-col-left { border-right: none; border-bottom: 1px solid #111; }
          .kartu-kertas { font-size: 14px; }
        }
      `}</style>

      {/* ── Modals ── */}
      {modal === 'kirim-disposisi' && (
        <ModalKonfirmasi
          judul="Kirim Disposisi?"
          pesan="Setelah dikirim, isi lembar tidak dapat diubah. Kepala Bidang yang dipilih akan menerima notifikasi."
          onSetuju={doKirimDisposisi}
          onBatal={() => setModal(null)}
          loading={loading}
        />
      )}
      {modal === 'tidak-perlu' && (
        <ModalKonfirmasi
          judul="Tidak Perlu Disposisi ke Bidang?"
          pesan={`Surat ini tidak akan diteruskan ke bidang. Petugas Surat akan diberitahu untuk menyelesaikan di sekretariat. Catatan: "${catatanTidakPerlu}"`}
          onSetuju={doTidakPerluDisposisi}
          onBatal={() => setModal(null)}
          loading={loading}
        />
      )}
      {modal === 'teruskan-staf' && (
        <ModalKonfirmasi
          judul="Teruskan ke Staf Pelaksana?"
          pesan={`Penugasan akan dikirim ke ${getUser(selectedStaf)?.nama || 'staf'}. Staf akan menerima notifikasi.`}
          onSetuju={doTeruskanStaf}
          onBatal={() => setModal(null)}
          loading={loading}
        />
      )}
      {modal === 'tindak-langsung' && (
        <ModalKonfirmasi
          judul="Tindak Lanjuti Langsung?"
          pesan="Disposisi akan langsung diselesaikan tanpa meneruskan ke staf. Kepala Dinas dan Petugas Surat akan diberitahu."
          onSetuju={doTindakLangsung}
          onBatal={() => setModal(null)}
          loading={loading}
        />
      )}
      {modal === 'kirim-laporan' && (
        <ModalKonfirmasi
          judul="Kirim Laporan?"
          pesan="Laporan akan dikirim ke Kepala Bidang untuk diperiksa. Anda tidak bisa mengubahnya setelah dikirim."
          onSetuju={doKirimLaporan}
          onBatal={() => setModal(null)}
          loading={loading}
        />
      )}
      {modal?.startsWith('kembalikan-') && (
        <ModalKonfirmasi
          judul="Kembalikan Laporan?"
          pesan={`Staf akan menerima catatan perbaikan: "${catatanKembali}"`}
          onSetuju={() => doKembalikanLaporan(modal.replace('kembalikan-', ''))}
          onBatal={() => setModal(null)}
          loading={loading}
        />
      )}

      <div className="animate-fadeIn" style={{ paddingBottom: 80 }}>
        {/* ── Back ── */}
        <Link href="/disposisi" className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }}>
          <ArrowLeft size={16} /> Kembali ke Daftar Disposisi
        </Link>

        {/* ── Header halaman (8.3.1) ── */}
        <div className="page-header" style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 12, marginBottom: 12,
        }}>
          <div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6, alignItems: 'center' }}>
              <span className="badge badge-info" style={{ fontFamily: 'monospace' }}>
                {dataSurat.nomorAgenda}
              </span>
              <span className={`badge ${
                disposisi.status === 'selesai' ? 'badge-success'
                : disposisi.status === 'menunggu_disposisi' ? 'badge-warning'
                : 'badge-primary'
              }`}>
                {disposisi.status === 'menunggu_disposisi' ? 'Menunggu Disposisi'
                  : disposisi.status === 'didisposisikan' ? 'Didisposisikan'
                  : disposisi.status === 'diterima_bidang' ? 'Diterima Bidang'
                  : disposisi.status === 'diteruskan_ke_staf' ? 'Diteruskan ke Staf'
                  : disposisi.status === 'menunggu_pemeriksaan' ? 'Menunggu Pemeriksaan'
                  : disposisi.status === 'selesai' ? 'Selesai'
                  : disposisi.status}
              </span>
              {dataSurat.sifat === 'rahasia' && (
                <span className="badge" style={{ background: '#7e22ce', color: '#fff' }}>RAHASIA</span>
              )}
              {dataSurat.sifat === 'segera' && (
                <span className="badge badge-danger">SEGERA</span>
              )}
              {disposisi.lintasBidang && (
                <span className="badge" style={{ background: '#f3e8ff', color: '#7e22ce', border: '1px solid #d8b4fe' }}>
                  Lintas Bidang
                </span>
              )}
              {sebagianSelesai && (
                <span className="badge" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' }}>
                  Sebagian selesai ({selesaiTujuan} dari {totalTujuan})
                </span>
              )}
            </div>
            <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Kartu Disposisi Digital</h1>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
              {dataSurat.perihal}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Toggle badge pengisi */}
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setShowBadge(v => !v)}
              title={showBadge ? 'Sembunyikan penanda pengisi' : 'Tampilkan penanda pengisi'}
            >
              {showBadge ? <EyeOff size={15} /> : <Eye size={15} />}
              <span style={{ fontSize: 12 }}>{showBadge ? 'Sembunyikan' : 'Tampilkan'} penanda</span>
            </button>
            <button className="btn btn-secondary btn-sm no-print" onClick={() => window.print()}>
              <Printer size={15} /> Cetak
            </button>
          </div>
        </div>

        {/* ── Legenda warna peran ── */}
        {showBadge && (
          <div className="no-print" style={{
            display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10,
            fontSize: 11, fontFamily: 'DM Sans, sans-serif',
          }}>
            {Object.entries(WARNA_PERAN).filter(([k]) => k !== 'admin').map(([peran, warna]) => (
              <span key={peran} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: warna, display: 'inline-block' }} />
                <span style={{ color: 'var(--text-secondary)' }}>
                  {NAMA_PERAN_PENDEK[peran as keyof typeof NAMA_PERAN_PENDEK]}
                </span>
              </span>
            ))}
          </div>
        )}

        {/* ── Pesan sukses / error ── */}
        {successMsg && (
          <div style={{
            padding: '10px 16px', background: '#ecfdf5', border: '1px solid #10b981',
            borderRadius: 8, color: '#047857', marginBottom: 12,
            display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'DM Sans, sans-serif',
          }}>
            <CheckCircle size={16} /> {successMsg}
          </div>
        )}
        {errorMsg && (
          <div style={{
            padding: '10px 16px', background: '#fef2f2', border: '1px solid #f87171',
            borderRadius: 8, color: '#b91c1c', marginBottom: 12,
            display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'DM Sans, sans-serif',
          }}>
            <AlertCircle size={16} /> {errorMsg}
          </div>
        )}

        {/* ── Stepper mini (8.3.2) ── */}
        <div className="stepper-mini no-print" style={{ marginBottom: 16 }}>
          <div className="stepper">
            {STEPS.map((step, idx) => {
              const isDone = currentStepIdx > idx;
              const isActive = currentStepIdx === idx;
              return (
                <React.Fragment key={step.key}>
                  {idx > 0 && <div className={`step-line ${isDone ? 'done' : ''}`} />}
                  <div className="step-item">
                    <div className={`step-dot ${isDone ? 'done' : isActive ? 'active' : ''}`}>
                      {isDone ? '✓' : idx + 1}
                    </div>
                    <div style={{
                      marginTop: 4, color: isDone ? '#15803D' : isActive ? '#111' : '#9ca3af',
                      fontWeight: isActive ? 700 : 400, whiteSpace: 'pre-line',
                    }}>
                      {step.label}
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            KERTAS Z1-Z10 (print area)
        ══════════════════════════════════════════════════════════════════ */}
        <div className="print-area" style={{ width: '100%', maxWidth: 794, margin: '0 auto' }}>
          <div className="kartu-kertas">

            {/* ── Z1 KOP ── */}
            <ZonaWrapper izin={izin.Z1} pemilik="sistem" showBadge={showBadge}
              style={{ position: 'relative' }}>
              <div className="kop-header">
                {/* Logo Instansi */}
                <div style={{
                  width: 58, height: 68,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={instansi?.logoPath && instansi.logoPath !== '/logo-minsel.svg' ? instansi.logoPath : '/logo.png'}
                    alt="Logo Minahasa Selatan" style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                </div>
                <div className="kop-text">
                  <div className="kop-nama-pemda">{instansi?.namaPemda || 'PEMERINTAH KABUPATEN MINAHASA SELATAN'}</div>
                  <div className="kop-nama-instansi">{instansi?.namaInstansi || 'DINAS PERTANIAN'}</div>
                  <div className="kop-alamat">
                    Alamat : {instansi?.alamat || 'Jl. Trans Sulawesi Kel. Pondang Kecamatan Amurang Timur'}
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                    {instansi?.telpFax || 'Telp/ Fax : (0430) 22589'}
                  </div>
                </div>
              </div>
            </ZonaWrapper>

            {/* ── Z2 JUDUL ── */}
            <ZonaWrapper izin={izin.Z2} showBadge={false}>
              <div className="z2-judul">LEMBAR DISPOSISI</div>
            </ZonaWrapper>

            {/* ── Z3 + Z4 dua kolom ── */}
            <div className="zona-two-col" style={{ position: 'relative' }}>
              {/* Z3 Kiri: identitas surat */}
              <ZonaWrapper izin={izin.Z3}
                pemilik={LABEL_PEMILIK_ZONA.Z3}
                showBadge={showBadge}
                labelBagianAnda={isPetugas && izin.Z3 === 'isi'}
                className="zona-col-left"
              >
                <div style={{ paddingTop: showBadge ? 20 : 0 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <tbody>
                      <tr>
                        <td style={{ paddingRight: 4, whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                          {/* K2: asumsi "Surat dari" */}
                          <span title="[ASUMSI K2: label 'Surat dari' diasumsikan dari tulisan 'Surat :' di foto]">
                            Surat dari *
                          </span>
                        </td>
                        <td>: <strong>{dataSurat.asalSurat || '—'}</strong></td>
                      </tr>
                      <tr>
                        <td style={{ paddingRight: 4, whiteSpace: 'nowrap' }}>No.Surat</td>
                        <td>: {dataSurat.nomorSuratAsal || '—'}</td>
                      </tr>
                      <tr>
                        <td style={{ paddingRight: 4, whiteSpace: 'nowrap' }}>Tgl.Surat</td>
                        <td>: {dataSurat.tanggalSuratAsal ? fmtTgl(dataSurat.tanggalSuratAsal) : '—'}</td>
                      </tr>
                      {dataSurat.batasWaktuSurat && (
                        <tr>
                          <td colSpan={2} style={{ paddingTop: 4 }}>
                            <span style={{
                              fontSize: 10, background: '#fef9c3', padding: '1px 5px',
                              borderRadius: 3, fontFamily: 'DM Sans, sans-serif',
                            }}>
                              📅 Batas waktu pd surat: {fmtTgl(dataSurat.batasWaktuSurat)}
                              <span title="Kolom tambahan digital (K3)"> †</span>
                            </span>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </ZonaWrapper>

              {/* Z4 Kanan: agenda + sifat */}
              <ZonaWrapper izin={izin.Z4}
                pemilik={LABEL_PEMILIK_ZONA.Z4}
                showBadge={false}
                labelBagianAnda={isPetugas && izin.Z4 === 'isi'}
                className="zona-col-right"
              >
                <div style={{ paddingTop: showBadge ? 20 : 0 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <tbody>
                      <tr>
                        <td style={{ whiteSpace: 'nowrap', paddingRight: 4 }}>Diterima tgl</td>
                        <td>: {dataSurat.tanggalTerima ? fmtTgl(dataSurat.tanggalTerima) : '—'}</td>
                      </tr>
                      <tr>
                        <td style={{ whiteSpace: 'nowrap', paddingRight: 4 }}>No.Agenda</td>
                        <td>: <span className="mono" style={{ fontWeight: 700 }}>{dataSurat.nomorAgenda || '—'}</span></td>
                      </tr>
                    </tbody>
                  </table>
                  {/* K1: 3 kotak sifat persis kertas */}
                  <div style={{ marginTop: 6, fontSize: 12 }}>
                    <span>Sifat :</span>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                      {SIFAT_KOTAK.map(s => (
                        <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: isKadis && disposisi.status === 'menunggu_disposisi' ? 'pointer' : 'default' }}>
                          <span
                            onClick={() => {
                              if (isKadis && disposisi.status === 'menunggu_disposisi') {
                                setSelectedSifat(prev => (prev || dataSurat.sifat) === s ? 'biasa' : s);
                              }
                            }}
                            style={{
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              width: 16, height: 16, border: '1.5px solid #333',
                              fontSize: 12, fontWeight: 900,
                              background: '#fff',
                            }}>
                            {(selectedSifat || dataSurat.sifat) === s ? '☒' : ''}
                          </span>
                          <span style={{ fontSize: 11 }}>{SIFAT_KOTAK_LABEL[s]}</span>
                        </label>
                      ))}
                    </div>
                    {/* Sifat tidak punya kotak: biasa / umum / penting */}
                    {!SIFAT_KOTAK.includes((selectedSifat || dataSurat.sifat) as any) && (selectedSifat || dataSurat.sifat) && (
                      <div style={{ marginTop: 4, fontSize: 11, fontStyle: 'italic' }}>
                        Sifat: {selectedSifat || dataSurat.sifat}
                      </div>
                    )}
                  </div>
                </div>
              </ZonaWrapper>
            </div>

            {/* ── Z5 PERIHAL ── */}
            <ZonaWrapper izin={izin.Z5}
              pemilik={LABEL_PEMILIK_ZONA.Z5}
              showBadge={showBadge}
              labelBagianAnda={isPetugas && izin.Z5 === 'isi'}
              className="zona-row zona-pad"
            >
              <div style={{ paddingTop: showBadge ? 18 : 0 }}>
                <span>Perihal : </span>
                <strong>{dataSurat.perihal || '—'}</strong>
              </div>
            </ZonaWrapper>

            {/* ── Z6 + Z7 dua kolom ── */}
            <div className="zona-two-col" style={{ position: 'relative' }}>

              {/* Z6 Kiri: Diteruskan Kepada Sdr */}
              <ZonaWrapper izin={izin.Z6}
                pemilik={LABEL_PEMILIK_ZONA.Z6}
                showBadge={showBadge}
                labelBagianAnda={isKadis && izin.Z6 === 'isi'}
                className="zona-col-left"
              >
                <div style={{ paddingTop: showBadge ? 20 : 0 }}>
                  <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 12 }}>
                    Diteruskan Kepada Sdr :
                  </div>
                  {unitKerja
                    .filter(uk => uk.aktif || disposisi.bidangTujuan.some(b => b.unitKerjaId === uk.id))
                    .map(uk => {
                      const kabid = state.users.find(u => u.unitKerjaId === uk.id && u.aktif && (u.role === 'kepala_bidang' || u.role === 'sekretaris'));
                      const isSekretariat = uk.jenis === 'sekretariat';
                      const isDisabled = izin.Z6 !== 'isi' || !kabid || !uk.aktif;
                      const checked = izin.Z6 === 'isi'
                        ? selectedTujuan.includes(uk.id)
                        : disposisi.bidangTujuan.some(b => b.unitKerjaId === uk.id);
                      let label = (uk.labelLembar || uk.nama).replace(/\\n/g, '\n');
                      if (!uk.aktif) {
                        label += ' (nonaktif)';
                      }
                      const subLabel = !uk.aktif
                        ? 'Unit kerja nonaktif'
                        : kabid
                          ? kabid.nama
                          : (isSekretariat ? 'Belum ada Sekretaris terdaftar' : 'Belum ada Kepala Bidang terdaftar');
                      return (
                        <CheckboxKertas
                          key={uk.id}
                          checked={checked}
                          label={label}
                          subLabel={subLabel}
                          disabled={isDisabled}
                          multiline={label.includes('\n')}
                          onChange={v => {
                            setSelectedTujuan(prev =>
                              v ? [...prev, uk.id] : prev.filter(x => x !== uk.id)
                            );
                          }}
                        />
                      );
                    })}
                </div>
              </ZonaWrapper>

              {/* Z7 Kanan: Dengan hormat harap */}
              <ZonaWrapper izin={izin.Z7}
                pemilik={LABEL_PEMILIK_ZONA.Z7}
                showBadge={false}
                labelBagianAnda={isKadis && izin.Z7 === 'isi'}
                className="zona-col-right"
              >
                <div style={{ paddingTop: showBadge ? 20 : 0 }}>
                  <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 12 }}>
                    Dengan hormat harap :
                  </div>
                  {/* Tiga instruksi standar */}
                  {(['tanggapan_saran', 'proses_lanjut', 'koordinasi_konfirmasi'] as JenisInstruksi[]).map(jenis => {
                    const checked = izin.Z7 === 'isi'
                      ? instruksiChecked(jenis)
                      : (disposisi.instruksiList || [{ jenis: disposisi.instruksi }]).some(i => i.jenis === jenis);
                    return (
                      <CheckboxKertas
                        key={jenis}
                        checked={checked}
                        label={JENIS_INSTRUKSI_LABELS[jenis]}
                        disabled={izin.Z7 !== 'isi'}
                        onChange={() => toggleInstruksi(jenis)}
                      />
                    );
                  })}

                  {/* Lainnya (titik-titik) */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 4 }}>
                    <span
                      onClick={() => izin.Z7 === 'isi' && toggleInstruksi('lainnya')}
                      style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 18, height: 18, border: '1.5px solid #222',
                        fontSize: 14, fontWeight: 900, flexShrink: 0, marginTop: 2,
                        cursor: izin.Z7 === 'isi' ? 'pointer' : 'default',
                      }}
                    >
                      {(izin.Z7 === 'isi' ? instruksiChecked('lainnya')
                        : (disposisi.instruksiList||[]).some(i=>i.jenis==='lainnya')
                          || disposisi.instruksi === 'lainnya') ? '☒' : ''}
                    </span>
                    <div style={{ flex: 1 }}>
                      {izin.Z7 === 'isi' && instruksiChecked('lainnya') ? (
                        <input
                          type="text"
                          value={instruksiLainnyaTeks}
                          onChange={e => setInstruksiLainnyaTeks(e.target.value)}
                          placeholder="Isian bebas ..."
                          style={{
                            width: '100%', border: 'none', borderBottom: '1px dotted #444',
                            fontFamily: 'serif', fontSize: 12, outline: 'none', background: 'transparent',
                          }}
                        />
                      ) : (
                        <span style={{ fontSize: 12, fontFamily: 'serif', borderBottom: '1px dotted #444', display: 'block' }}>
                          {disposisi.instruksiLainnya || '\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Tenggat (K3 — tambahan digital) */}
                  <div style={{
                    marginTop: 10, borderTop: '1px dashed #ccc', paddingTop: 8,
                    fontSize: 11, fontFamily: 'DM Sans, sans-serif',
                  }}>
                    <div style={{ color: '#64748b', marginBottom: 3 }}>
                      ── tambahan digital (K3) ──
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                      <span>Tenggat penyelesaian :</span>
                      {izin.Z7 === 'isi' ? (
                        <input
                          type="date"
                          value={tenggat}
                          min={new Date().toISOString().split('T')[0]}
                          onChange={e => setTenggat(e.target.value)}
                          style={{
                            border: 'none', borderBottom: '1px solid #333',
                            fontFamily: 'serif', fontSize: 12, outline: 'none',
                            background: 'transparent', cursor: 'pointer',
                          }}
                        />
                      ) : (
                        <strong style={{ fontSize: 12 }}>
                          {disposisi.tenggat ? fmtTgl(disposisi.tenggat) : '—'}
                        </strong>
                      )}
                    </div>
                    {disposisi.tenggat && disposisi.status !== 'selesai' &&
                      new Date(disposisi.tenggat) < new Date() && (
                      <div style={{ color: '#b91c1c', fontSize: 10, marginTop: 2 }}>
                        ⚠ Tenggat telah lewat
                      </div>
                    )}
                  </div>
                </div>
              </ZonaWrapper>
            </div>

            {/* ── Z8 CATATAN ── */}
            <ZonaWrapper izin={izin.Z8}
              pemilik={LABEL_PEMILIK_ZONA.Z8}
              showBadge={showBadge}
              labelBagianAnda={isKadis && izin.Z8 === 'isi'}
              className="zona-row zona-pad"
            >
              <div style={{ paddingTop: showBadge ? 18 : 0 }}>
                <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 12 }}>Catatan :</div>
                {izin.Z8 === 'isi' ? (
                  <textarea
                    value={catatan}
                    onChange={e => setCatatan(e.target.value)}
                    maxLength={1000}
                    rows={3}
                    placeholder="Catatan Kepala Dinas (opsional, maks. 1000 karakter)"
                    style={{
                      width: '100%', border: 'none', borderBottom: '1px solid #333',
                      fontFamily: 'serif', fontSize: 12, resize: 'vertical',
                      outline: 'none', background: 'transparent',
                    }}
                  />
                ) : (
                  <div style={{ minHeight: 50, fontSize: 12, fontFamily: 'serif', whiteSpace: 'pre-wrap' }}>
                    {disposisi.catatanKepala || ''}
                  </div>
                )}
              </div>
            </ZonaWrapper>

            {/* ── Z9 + Z10: Paraf dan Tanda Kepala Dinas ── */}
            <div style={{ display: 'flex', borderBottom: '1px solid #111' }}>
              {/* Z9 Paraf dan Tanggal */}
              <ZonaWrapper izin={izin.Z9}
                pemilik={LABEL_PEMILIK_ZONA.Z9}
                showBadge={showBadge}
                labelBagianAnda={isKadis && izin.Z9 === 'isi'}
                style={{ flex: 1, padding: '10px', borderRight: '1px solid #111' }}
              >
                <div style={{ paddingTop: showBadge ? 18 : 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8 }}>
                    Paraf dan Tanggal :
                  </div>
                  {sudahParaf ? (
                    <div className="stempel-paraf">
                      ✍ Diparaf secara elektronik oleh {disposisi.parafKdOleh || disposisi.parafKadinOleh}
                      <br />
                      <span style={{ fontSize: 10 }}>{fmtTglWaktu(disposisi.parafKdAt || disposisi.parafKadinWaktu)}</span>
                    </div>
                  ) : izin.Z9 === 'isi' ? (
                    <button
                      className="btn btn-secondary btn-sm no-print"
                      onClick={handleBubuhkanParaf}
                      style={{ fontFamily: 'DM Sans, sans-serif' }}
                    >
                      ✍ Bubuhkan Paraf
                    </button>
                  ) : (
                    <div style={{ height: 40, borderBottom: '1px solid #333', width: '80%' }} />
                  )}
                </div>
              </ZonaWrapper>

              {/* Z10 Blok KEPALA DINAS */}
              <ZonaWrapper izin={izin.Z10}
                pemilik="sistem"
                showBadge={false}
                style={{ flex: 1, padding: '10px', textAlign: 'center' }}
              >
                <div style={{ paddingTop: 10, fontFamily: 'serif', fontSize: 12 }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>KEPALA DINAS,</div>
                  <div style={{ height: 48 }} />{/* ruang tanda tangan */}
                  <div style={{ fontWeight: 700, textDecoration: 'underline' }}>
                    {/* Pakai snapshot bila ada, fallback ke profil aktif */}
                    {disposisi.ttdNamaSnapshot || kadisUser?.nama || 'Nama Kepala Dinas'}
                  </div>
                  {(disposisi.ttdNipSnapshot || kadisUser) && (
                    <div style={{ fontSize: 11 }}>
                      NIP. {disposisi.ttdNipSnapshot || (kadisUser as any)?.nip || '—'}
                    </div>
                  )}
                </div>
              </ZonaWrapper>
            </div>

          </div>{/* /kartu-kertas */}

          {/* ══════════════════════════════════════════════════════════════
              PANEL LANJUTAN Z11-Z16 (digital extension)
          ══════════════════════════════════════════════════════════════ */}
          <div className="z11-z16" style={{ marginTop: 24 }}>

            {/* ── Z11 Catatan Koordinasi (Sekretaris) ── */}
            {izin.Z11 !== 'sembunyi' && (
              <div className="panel-lanjutan">
                <div className="pl-header" style={{ background: '#f0fdfa' }}>
                  <span style={{ color: '#0F766E' }}>●</span>
                  <span>Z11 — Catatan Koordinasi Sekretaris</span>
                  {izin.Z11 === 'isi' && <span style={{ marginLeft: 'auto', fontSize: 11, color: '#0F766E' }}>Bagian Anda</span>}
                </div>
                <div className="pl-body">
                  {izin.Z11 === 'isi' ? (
                    <>
                      <textarea
                        value={catatanKoordinasi || disposisi.catatanKoordinasiSekdin || ''}
                        onChange={e => setCatatanKoordinasi(e.target.value)}
                        rows={4}
                        placeholder="Catatan koordinasi untuk bidang tujuan..."
                        className="form-control"
                        style={{ marginBottom: 10 }}
                      />
                      <button className="btn btn-primary btn-sm" onClick={handleSimpanKoordinasi}>
                        Simpan Catatan Koordinasi
                      </button>
                    </>
                  ) : (
                    <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text-secondary)', fontSize: 13 }}>
                      {disposisi.catatanKoordinasiSekdin || '(Belum ada catatan koordinasi)'}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Z12 Tanda Terima Bidang ── */}
            {izin.Z12 !== 'sembunyi' && disposisi.bidangTujuan.length > 0 && (
              <div className="panel-lanjutan">
                <div className="pl-header" style={{ background: '#fffbeb' }}>
                  <span style={{ color: '#B45309' }}>●</span>
                  <span>Z12 — Tanda Terima Bidang</span>
                </div>
                <div className="pl-body">
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: 'DM Sans, sans-serif' }}>
                    <thead>
                      <tr style={{ background: '#f9fafb', borderBottom: '1px solid var(--border-color)' }}>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>Bidang/Unit</th>
                        <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600 }}>Status</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>Diterima oleh</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>Waktu</th>
                        <th style={{ padding: '8px 12px' }} className="no-print" />
                      </tr>
                    </thead>
                    <tbody>
                      {disposisi.bidangTujuan
                        .sort((a, b) => a.urutan - b.urutan)
                        .map(bt => {
                          const uk = state.unitKerja.find(u => u.id === bt.unitKerjaId);
                          const statusItem = disposisi.statusPerBidang?.[bt.unitKerjaId];
                          const isMine = bt.unitKerjaId === user?.unitKerjaId;
                          return (
                            <tr key={bt.id} style={{
                              borderBottom: '1px solid var(--border-color)',
                              background: isMine ? '#f0fdf4' : '#fff',
                            }}>
                              <td style={{ padding: '8px 12px', fontWeight: isMine ? 600 : 400 }}>
                                {uk ? `${uk.nama}${!uk.aktif ? ' (nonaktif)' : ''}` : bt.unitKerjaId}
                                {bt.tipe === 'sekretaris' && (
                                  <span style={{ fontSize: 10, color: '#0F766E', marginLeft: 6 }}>[Koordinasi]</span>
                                )}
                              </td>
                              <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                {bt.statusTerima === 'diterima' ? (
                                  <span className="badge badge-success" style={{ fontSize: 11 }}>Diterima</span>
                                ) : (
                                  <span className="badge badge-warning" style={{ fontSize: 11 }}>Belum diterima</span>
                                )}
                              </td>
                              <td style={{ padding: '8px 12px', fontSize: 12 }}>
                                {statusItem?.diterimaOleh || bt.namaPenerimaSnapshot || '—'}
                              </td>
                              <td style={{ padding: '8px 12px', fontSize: 12 }}>
                                {bt.waktuTerima ? fmtTglWaktu(bt.waktuTerima) : '—'}
                              </td>
                              <td style={{ padding: '8px 12px' }} className="no-print">
                                {isMine && bt.statusTerima !== 'diterima' && izin.Z12 === 'isi' && (
                                  <button className="btn btn-primary btn-sm" onClick={handleTerimaDisposisi}>
                                    <UserCheck size={13} /> Terima & Paraf
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Z13 Keputusan Tindak Lanjut / Penugasan ── */}
            {izin.Z13 !== 'sembunyi' && (
              <div className="panel-lanjutan">
                <div className="pl-header" style={{ background: '#fffbeb' }}>
                  <span style={{ color: '#B45309' }}>●</span>
                  <span>Z13 — Keputusan Tindak Lanjut &amp; Penugasan Staf</span>
                  {izin.Z13 === 'isi' && <span style={{ marginLeft: 'auto', fontSize: 11, color: '#B45309' }}>Bagian Anda</span>}
                </div>
                <div className="pl-body">
                  {/* Staf: lihat penugasannya */}
                  {isStaf && myPenugasan && (
                    <div style={{ background: '#f0fdf4', borderRadius: 8, padding: 14, fontSize: 13 }}>
                      <div style={{ fontWeight: 600, marginBottom: 6 }}>Penugasan Anda</div>
                      <div><strong>Dari:</strong> {getUser(myPenugasan.kepalaBidangId)?.nama || '—'}</div>
                      <div><strong>Catatan:</strong> {myPenugasan.catatanPenugasan || '—'}</div>
                      <div><strong>Status:</strong> {myPenugasan.status}</div>
                    </div>
                  )}

                  {/* Kabid: dua kartu aksi */}
                  {isKabid && izin.Z13 === 'isi' && isMyBidangReceived && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      {/* Teruskan ke Staf */}
                      <div style={{ border: '1px solid var(--border-color)', borderRadius: 8, padding: 16 }}>
                        <h4 style={{ margin: '0 0 12px', fontSize: 14 }}>
                          <UserPlus size={14} style={{ display: 'inline', marginRight: 6 }} />
                          Teruskan ke Staf Pelaksana
                        </h4>
                        <select
                          className="form-control"
                          value={selectedStaf}
                          onChange={e => setSelectedStaf(e.target.value)}
                          style={{ marginBottom: 8 }}
                        >
                          <option value="">-- Pilih staf pelaksana --</option>
                          {myStaf.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
                        </select>
                        <textarea
                          className="form-control"
                          rows={2}
                          placeholder="Catatan penugasan (opsional)"
                          value={catatanPenugasan}
                          onChange={e => setCatatanPenugasan(e.target.value)}
                          style={{ marginBottom: 8 }}
                        />
                        <button className="btn btn-primary btn-sm" onClick={handleTeruskanStaf} style={{ width: '100%' }}>
                          Teruskan ke Staf
                        </button>
                      </div>

                      {/* Tindak Lanjut Langsung */}
                      <div style={{ border: '1px solid var(--border-color)', borderRadius: 8, padding: 16 }}>
                        <h4 style={{ margin: '0 0 12px', fontSize: 14 }}>
                          <CheckCircle size={14} style={{ display: 'inline', marginRight: 6 }} />
                          Tindak Lanjuti Langsung
                        </h4>
                        <textarea
                          className="form-control"
                          rows={3}
                          placeholder="Uraian hasil tindak lanjut (wajib)"
                          value={uraianHasil}
                          onChange={e => setUraianHasil(e.target.value)}
                          style={{ marginBottom: 8 }}
                        />
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={e => setFileBerkas(e.target.files?.[0] || null)}
                          style={{ marginBottom: 12, fontSize: 12 }}
                        />
                        {/* AT-06: Pilih apakah perlu surat jawaban (wajib) */}
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--tinta)' }}>
                            Perlu surat jawaban? <span style={{ color: 'var(--rahasia)' }}>*</span>
                          </div>
                          <div style={{ display: 'flex', gap: 16 }}>
                            {[{ v: true, label: 'Ya — Perlu surat jawaban' }, { v: false, label: 'Tidak perlu' }].map(opt => (
                              <label key={String(opt.v)} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                                <input
                                  type="radio"
                                  name="perlu-jawaban-langsung"
                                  checked={perluSuratJawaban === opt.v}
                                  onChange={() => setPerluSuratJawaban(opt.v)}
                                />
                                {opt.label}
                              </label>
                            ))}
                          </div>
                        </div>
                        <button
                          className="btn btn-success btn-sm"
                          onClick={handleTindakLangsung}
                          style={{ width: '100%' }}
                          disabled={perluSuratJawaban === null}
                          title={perluSuratJawaban === null ? 'Pilih kebutuhan surat jawaban terlebih dahulu' : ''}
                        >
                          Selesaikan Langsung
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Tombol susun konsep bila disposisi selesai dan perlu jawaban */}
                  {isKabid && (disposisi as any).perluSuratJawaban && disposisi.status === 'selesai' && (
                    <div style={{ marginTop: 16 }}>
                      <Link
                        href={`/surat-keluar/baru?disposisiId=${disposisi.id}&smId=${sm?.id}`}
                        className="btn btn-primary btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      >
                        <FileText size={14} aria-hidden="true" /> Susun Konsep Surat Jawaban →
                      </Link>
                    </div>
                  )}


                  {/* Penugasan yang sudah ada */}
                  {penugasan.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Penugasan Staf</div>
                      {penugasan.map(p => {
                        const staf = getUser(p.stafId);
                        const isMyPenugasan = p.kepalaBidangId === user?.id;
                        // Kepala Bidang lain hanya lihat bidangnya sendiri
                        if (isKabid && !isMyPenugasan && user?.role !== 'kepala_dinas') return null;
                        return (
                          <div key={p.id} style={{
                            border: '1px solid var(--border-color)', borderRadius: 6,
                            padding: 12, marginBottom: 8, fontSize: 13,
                          }}>
                            <div><strong>Staf:</strong> {staf?.nama || '—'}</div>
                            <div><strong>Catatan:</strong> {p.catatanPenugasan || '—'}</div>
                            <div><strong>Status:</strong>{' '}
                              <span className={`badge ${p.status === 'selesai' ? 'badge-success' : p.status === 'dikembalikan' ? 'badge-danger' : 'badge-info'}`} style={{ fontSize: 11 }}>
                                {p.status}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Z14 Laporan Tindak Lanjut (Staf) ── */}
            {izin.Z14 !== 'sembunyi' && (
              <div className="panel-lanjutan">
                <div className="pl-header" style={{ background: '#faf5ff' }}>
                  <span style={{ color: '#6941C6' }}>●</span>
                  <span>Z14 — Laporan Tindak Lanjut</span>
                  {izin.Z14 === 'isi' && <span style={{ marginLeft: 'auto', fontSize: 11, color: '#6941C6' }}>Bagian Anda</span>}
                </div>
                <div className="pl-body">
                  {/* Banner kembalikan */}
                  {tindakLanjut.some(t => t.status === 'dikembalikan') && (
                    <div style={{
                      background: '#fef9c3', border: '1px solid #fcd34d', borderRadius: 6,
                      padding: 12, marginBottom: 14, fontSize: 13,
                    }}>
                      <AlertCircle size={14} style={{ display: 'inline', marginRight: 6 }} />
                      <strong>Laporan dikembalikan untuk perbaikan.</strong>
                      {tindakLanjut
                        .filter(t => t.status === 'dikembalikan')
                        .map(t => (
                          <div key={t.id} style={{ marginTop: 4, color: '#92400e' }}>
                            Catatan: {t.uraianHasil}
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Form laporan staf */}
                  {isStaf && myPenugasan && izin.Z14 === 'isi' && (
                    <>
                      {/* Area Progres (Tabel 27) */}
                      <div style={{ marginBottom: 16, padding: 16, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                        <h4 style={{ margin: '0 0 12px', fontSize: 14 }}>Perbarui Progres</h4>
                        <textarea
                          className="form-textarea"
                          rows={2}
                          placeholder="Catatan progres atau draf (opsional)..."
                          value={catatanProgres || myPenugasan.catatanProgres || ''}
                          onChange={e => setCatatanProgres(e.target.value)}
                          style={{ marginBottom: 8, minHeight: 60 }}
                          disabled={myPenugasan.status === 'selesai' || tindakLanjut.some(t => t.status === 'dilaporkan' || t.status === 'disetujui')}
                        />
                        <button 
                          className="btn btn-secondary btn-sm" 
                          onClick={handleSimpanProgres}
                          disabled={myPenugasan.status === 'selesai' || tindakLanjut.some(t => t.status === 'dilaporkan' || t.status === 'disetujui')}
                        >
                          Simpan Progres
                        </button>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                          Penutupan dilakukan Kepala Bidang setelah pemeriksaan laporan.
                        </div>
                      </div>

                      {/* Laporan Hasil (Tabel 28) */}
                      <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: 16 }}>
                        <h4 style={{ margin: '0 0 12px', fontSize: 14 }}>Laporkan Hasil Tindak Lanjut</h4>
                        <textarea
                          className="form-textarea"
                          rows={4}
                          placeholder="Uraian hasil tindak lanjut (wajib)"
                          value={uraianHasil}
                          onChange={e => setUraianHasil(e.target.value)}
                          style={{ marginBottom: 8 }}
                          disabled={tindakLanjut.some(t => t.status === 'dilaporkan' || t.status === 'disetujui')}
                        />
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={e => setFileBerkas(e.target.files?.[0] || null)}
                          style={{ marginBottom: 12, fontSize: 12 }}
                          disabled={tindakLanjut.some(t => t.status === 'dilaporkan' || t.status === 'disetujui')}
                        />
                        <button 
                          className="btn btn-primary" 
                          onClick={handleKirimLaporan}
                          disabled={tindakLanjut.some(t => t.status === 'dilaporkan' || t.status === 'disetujui')}
                        >
                          Kirim Laporan ke Kepala Bidang
                        </button>
                      </div>
                    </>
                  )}

                  {/* Laporan yang sudah ada */}
                  {tindakLanjut.map(tl => {
                    const pelaku = getUser(tl.pelakuId);
                    return (
                      <div key={tl.id} style={{
                        border: '1px solid var(--border-color)', borderRadius: 6,
                        padding: 12, marginTop: 12, fontSize: 13,
                      }}>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>
                          Laporan dari {pelaku?.nama}
                          <span className={`badge ${tl.status === 'disetujui' ? 'badge-success' : tl.status === 'dikembalikan' ? 'badge-danger' : 'badge-info'}`}
                            style={{ marginLeft: 8, fontSize: 10 }}>
                            {tl.status}
                          </span>
                        </div>
                        <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text-secondary)' }}>
                          {tl.uraianHasil}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Z15 Pemeriksaan Hasil (Kepala Bidang) ── */}
            {izin.Z15 !== 'sembunyi' && (
              <div className="panel-lanjutan">
                <div className="pl-header" style={{ background: '#fffbeb' }}>
                  <span style={{ color: '#B45309' }}>●</span>
                  <span>Z15 — Pemeriksaan Hasil</span>
                  {izin.Z15 === 'isi' && <span style={{ marginLeft: 'auto', fontSize: 11, color: '#B45309' }}>Bagian Anda</span>}
                </div>
                <div className="pl-body">
                  {isKabid && izin.Z15 === 'isi' && (
                    <>
                      {tindakLanjut.filter(t => t.status === 'dilaporkan').map(tl => {
                        const pelaku = getUser(tl.pelakuId);
                        return (
                          <div key={tl.id} style={{ marginBottom: 16 }}>
                            <div style={{ fontWeight: 600, marginBottom: 8 }}>
                              Laporan dari {pelaku?.nama || '—'}
                            </div>
                            <div style={{ background: '#f9fafb', borderRadius: 6, padding: 12, marginBottom: 10, fontSize: 13, whiteSpace: 'pre-wrap' }}>
                              {tl.uraianHasil}
                            </div>
                            <textarea
                              className="form-textarea"
                              rows={2}
                              placeholder="Catatan perbaikan (wajib bila dikembalikan)"
                              value={catatanKembali}
                              onChange={e => setCatatanKembali(e.target.value)}
                              style={{ marginBottom: 10, minHeight: 60 }}
                            />
                            {/* AT-06: pilih perlu surat jawaban sebelum setujui */}
                            <div style={{ marginBottom: 12 }}>
                              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--tinta)' }}>
                                Perlu surat jawaban? <span style={{ color: 'var(--rahasia)' }}>*</span>
                              </div>
                              <div style={{ display: 'flex', gap: 16 }}>
                                {[{ v: true, label: 'Ya — Perlu surat jawaban' }, { v: false, label: 'Tidak perlu' }].map(opt => (
                                  <label key={String(opt.v)} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                                    <input
                                      type="radio"
                                      name="perlu-jawaban-periksa"
                                      checked={perluSuratJawaban === opt.v}
                                      onChange={() => setPerluSuratJawaban(opt.v)}
                                    />
                                    {opt.label}
                                  </label>
                                ))}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              <button
                                className="btn btn-success btn-sm"
                                onClick={() => handleSetujuiLaporan(tl.id)}
                                disabled={perluSuratJawaban === null}
                                title={perluSuratJawaban === null ? 'Pilih kebutuhan surat jawaban terlebih dahulu' : ''}
                              >
                                <CheckCircle size={13} /> Setujui
                              </button>
                              <button className="btn btn-secondary btn-sm" onClick={() => handleKembalikanLaporan(tl.id)}>
                                <RotateCcw size={13} /> Kembalikan
                              </button>
                              {perluSuratJawaban === true && (
                                <Link
                                  href={`/surat-keluar/baru?disposisiId=${disposisi.id}&smId=${sm?.id}`}
                                  className="btn btn-ghost btn-sm"
                                >
                                  <FileText size={13} /> Susun Konsep Surat Jawaban
                                </Link>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                  {tindakLanjut.filter(t => t.status !== 'dikembalikan').length === 0 && (
                    <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Belum ada laporan masuk.</div>
                  )}
                </div>
              </div>
            )}

            {/* ── Z16 Riwayat Kartu ── */}
            {izin.Z16 !== 'sembunyi' && (
              <div className="panel-lanjutan">
                <div className="pl-header">
                  <Clock size={14} />
                  <span>Z16 — Riwayat Kartu</span>
                  <Link href={`/pelacakan?surat=${sm?.id}`} style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--primary-500)' }}>
                    Lihat pelacakan lengkap →
                  </Link>
                </div>
                <div className="pl-body">
                  {riwayat.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Belum ada riwayat.</div>
                  ) : (
                    <div className="timeline">
                      {riwayat.slice(0, 8).map((r, idx) => {
                        const pelaku = getUser(r.pelakuId);
                        return (
                          <div key={r.id} className={`timeline-item ${idx > 0 ? 'completed' : ''}`}>
                            <div className="timeline-dot" />
                            <div className="timeline-content">
                              <div className="timeline-header">
                                <span className="timeline-title">{r.status}</span>
                                <span className="timeline-time">
                                  {new Date(r.waktu).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                  {' '}{new Date(r.waktu).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <div className="timeline-body" style={{ fontSize: 12 }}>{r.catatan}</div>
                              <div className="timeline-actor" style={{ fontSize: 11 }}>{pelaku?.nama}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>{/* /z11-z16 */}
        </div>{/* /print-area */}

        {/* ══════════════════════════════════════════════════════════════
            PANEL TINDAKAN STICKY (bagian 8.3.5)
        ══════════════════════════════════════════════════════════════ */}
        <div className="action-panel no-print">
          {/* Petugas: Kirim Kartu ke Kepala Dinas (sudah dilakukan lewat /surat-masuk/[id]) */}
          {isPetugas && disposisi.status === 'menunggu_disposisi' && (
            <Link href={`/surat-masuk/${sm?.id}`} className="btn btn-ghost btn-sm">
              <ArrowLeft size={14} /> Ubah Data Surat
            </Link>
          )}

          {/* Kepala Dinas: Bubuhkan Paraf + Kirim Disposisi */}
          {isKadis && disposisi.status === 'menunggu_disposisi' && (
            <>
              {/* Banner surat rahasia */}
              {(dataSurat.sifat === 'rahasia' || dataSurat.sifat === 'segera') && (
                <div style={{
                  background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6,
                  padding: '8px 14px', fontSize: 12, color: '#991b1b',
                  display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                }}
                  role="alert"
                >
                  <Shield size={13} aria-hidden="true" />
                  Surat ini bersifat <strong style={{ textTransform: 'uppercase' }}>{dataSurat.sifat.replace('_', ' ')}</strong>.
                  Pastikan tujuan disposisi memiliki wewenang yang sesuai.
                </div>
              )}
              {!sudahParaf && (
                <button className="btn btn-secondary" onClick={handleBubuhkanParaf}>
                  ✍ Bubuhkan Paraf
                </button>
              )}
              <button
                id="btn-kirim-disposisi"
                className="btn btn-primary"
                onClick={handleKirimDisposisi}
                disabled={!sudahParaf}
                title={!sudahParaf ? 'Bubuhkan paraf terlebih dahulu' : ''}
              >
                <Send size={15} /> Paraf dan Disposisikan
              </button>
            </>
          )}

          {/* Kepala Bidang: Terima Disposisi */}
          {isKabid && myBidangItem && !isMyBidangReceived &&
            ['didisposisikan'].includes(disposisi.status) && (
            <button className="btn btn-primary" onClick={handleTerimaDisposisi}>
              <UserCheck size={15} /> Terima &amp; Paraf Disposisi
            </button>
          )}

          {/* Staf: Kirim Laporan */}
          {isStaf && myPenugasan &&
            ['diteruskan_ke_staf'].includes(disposisi.status) && (
            <button className="btn btn-primary" onClick={handleKirimLaporan}>
              <Send size={15} /> Kirim Laporan Hasil
            </button>
          )}

          {/* Semua: Cetak */}
          <button className="btn btn-ghost btn-sm" onClick={() => window.print()}>
            <Printer size={14} /> Cetak
          </button>
        </div>

      </div>
    </DashboardLayout>
  );
}
