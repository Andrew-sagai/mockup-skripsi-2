// ============================================================
// TYPES — Sistem Informasi Manajemen Persuratan
// Dinas Pertanian Kabupaten Minahasa Selatan
// ============================================================

// --- Enums & Constants ---

export type UserRole =
  | 'admin'
  | 'petugas_surat'
  | 'sekretaris'
  | 'kepala_dinas'
  | 'kepala_bidang'
  | 'staf_pelaksana';

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrator Sistem',
  petugas_surat: 'Petugas Surat/Agenda',
  sekretaris: 'Sekretaris Dinas',
  kepala_dinas: 'Kepala Dinas',
  kepala_bidang: 'Kepala Bidang',
  staf_pelaksana: 'Staf Pelaksana',
};

export type SifatSurat = 'biasa' | 'umum' | 'penting' | 'segera' | 'rahasia';

export const SIFAT_SURAT_LABELS: Record<SifatSurat, string> = {
  biasa: 'Biasa',
  umum: 'Umum/Pemberitahuan',
  penting: 'Penting',
  segera: 'Segera',
  rahasia: 'Rahasia',
};

export type StatusSuratMasuk =
  | 'diagenda'
  | 'menunggu_disposisi'
  | 'didisposisikan'
  | 'diterima_bidang'
  | 'diteruskan_ke_staf'
  | 'menunggu_pemeriksaan'
  | 'selesai';

export const STATUS_SURAT_MASUK_LABELS: Record<StatusSuratMasuk, string> = {
  diagenda: 'Diagenda',
  menunggu_disposisi: 'Menunggu Disposisi',
  didisposisikan: 'Didisposisikan',
  diterima_bidang: 'Diterima Bidang',
  diteruskan_ke_staf: 'Diteruskan ke Staf',
  menunggu_pemeriksaan: 'Menunggu Pemeriksaan',
  selesai: 'Selesai',
};

export type StatusSuratKeluar =
  | 'draf'
  | 'menunggu_paraf'
  | 'perlu_revisi'
  | 'menunggu_ttd'
  | 'ditandatangani'
  | 'nomor_diterbitkan'
  | 'terkirim';

export const STATUS_SURAT_KELUAR_LABELS: Record<StatusSuratKeluar, string> = {
  draf: 'Draf',
  menunggu_paraf: 'Menunggu Paraf',
  perlu_revisi: 'Perlu Revisi',
  menunggu_ttd: 'Menunggu Tanda Tangan',
  ditandatangani: 'Ditandatangani',
  nomor_diterbitkan: 'Nomor Diterbitkan',
  terkirim: 'Terkirim',
};

export type JenisInstruksi =
  | 'tanggapan_saran'
  | 'proses_lanjut'
  | 'koordinasi_konfirmasi'
  | 'lainnya'
  | (string & {});

export const JENIS_INSTRUKSI_LABELS: Record<string, string> = {
  tanggapan_saran: 'Tanggapan dan Saran',
  proses_lanjut: 'Proses Lebih Lanjut',
  koordinasi_konfirmasi: 'Koordinasi/Konfirmasi',
  lainnya: 'Lainnya',
};

export type StatusDisposisi =
  | 'menunggu_disposisi'
  | 'didisposisikan'
  | 'diterima_bidang'
  | 'diteruskan_ke_staf'
  | 'menunggu_pemeriksaan'
  | 'selesai'
  | 'dikembalikan';

export type JenisPersetujuan = 'paraf_koordinasi' | 'tanda_tangan' | 'dikembalikan';

export interface StatusPerBidangItem {
  status: 'menunggu' | 'diterima_bidang' | 'diteruskan_staf' | 'ditindak_langsung' | 'menunggu_pemeriksaan' | 'selesai';
  diterimaOleh?: string;
  diterimaWaktu?: string;
  diteruskanKe?: string; // id staf
  catatanPenugasan?: string;
  uraianHasil?: string;
}

// --- Data Entities ---

/** Pengaturan instansi (1 baris, dikelola Admin lewat Data Master) */
export interface PengaturanInstansi {
  id: string;
  namaPemda: string;
  namaInstansi: string;
  alamat: string;
  telpFax: string;
  logoPath: string;
}

/** Master sifat surat — terpisah dari enum agar bisa dikelola Admin */
export interface SifatSuratMaster {
  kode: string;
  nama: string;
  /** true = tampil sebagai kotak di lembar (Segera, Rahasia) */
  tampilDiLembar: boolean;
  aktif: boolean;
  urutan: number;
}

/**
 * Kategori Data Master Persuratan Terpadu (Tahap 6)
 * Seluruh data jenis/kategori dikelola secara terpusat oleh Administrator
 */
export type KategoriDataMaster =
  | 'sifat_surat'
  | 'jenis_instruksi'
  | 'instansi_asal';

export interface DataMasterItem {
  id: string;
  kategori: KategoriDataMaster;
  kode: string;
  label: string;
  keterangan?: string;
  aktif: boolean;
  urutan: number;
  meta?: Record<string, any>;
  createdAt?: string;
}

export interface UnitKerja {
  id: string;
  kode: string;
  nama: string;
  jenis: 'sekretariat' | 'bidang';
  /** Label persis di lembar disposisi kertas, mis. "Ka. Bid. Peternakan dan Kesehatan Hewan" */
  labelLembar?: string;
  /** Urutan baris di kolom Z6 (1-6 persis urutan kertas asli) */
  urutanLembar?: number;
  /** true = aktif (default); false = dinonaktifkan; tidak boleh muncul sebagai opsi baru */
  aktif: boolean;
}

export interface KlasifikasiSurat {
  id: string;
  kode: string;
  nama: string;
  uraian?: string;
  unitKerjaId?: string;
  aktif: boolean;
}

/**
 * Jenis Surat menurut fungsinya (Proposal §2.4.1)
 * Contoh: Surat Keputusan, Surat Edaran, Surat Biasa, dst.
 */
export interface JenisSurat {
  id: string;
  nama: string;
  keterangan: string;
  /** true untuk jenis utama: Keputusan, Edaran, Instruksi, Tugas */
  utama: boolean;
  aktif: boolean;
}

export interface User {
  id: string;
  nama: string;
  email: string;
  role: UserRole;
  unitKerjaId: string | null;
  unitKerja?: UnitKerja;
  aktif: boolean;
  nip?: string;
  jabatan?: string;
  urlTandaTangan?: string; // Gambar tanda tangan digital tersimpan (PNG transparan / data URL)
  dummyPassword?: string; // HANYA prototipe; produksi memakai Supabase Auth
  /** auth.users.id — hanya terisi pada mode Supabase */
  authId?: string;
  createdAt: string;
}

export interface SuratMasuk {
  id: string;
  nomorAgenda: string;
  nomorUrut?: number;
  nomorBerkas?: string;
  nomorPetunjuk?: string;
  nomorPaket?: string;
  tanggalTerima: string;
  asalSurat: string;
  nomorSuratAsal: string;
  tanggalSuratAsal: string;
  perihal: string;
  klasifikasiId: string;
  klasifikasi?: KlasifikasiSurat;
  /** Jenis Surat menurut fungsi (§2.4.1) */
  jenisSuratId?: string;
  jenisSuratObj?: JenisSurat;
  sifat: SifatSurat;
  /** Batas waktu yang tercantum pada surat asal (opsional) — K3 */
  batasWaktuSurat?: string;
  berkasUrl: string;
  status: StatusSuratMasuk;
  pencatatId: string;
  pencatat?: User;
  createdAt: string;
  updatedAt: string;
}

/** Tipe tujuan disposisi — K4 */
export type TipeDisposisiTujuan = 'sekretaris' | 'bidang';

/** Satu baris tujuan disposisi (paralel per bidang) — Z6 */
export interface DisposisiTujuan {
  id: string;
  disposisiId: string;
  tipe: TipeDisposisiTujuan;
  unitKerjaId: string;
  unitKerja?: UnitKerja;
  urutan: number; // urutan lembar sesuai K6
  kepalaBidangId?: string;
  kepalaBidang?: User;
  statusTerima: 'belum' | 'diterima';
  waktuTerima?: string;
  namaPenerimaSnapshot?: string; // snapshot nama saat paraf — K10
  parafPenerimaanSnapshot?: string; // tanda paraf penerimaan Kabid
  waktuParafPenerimaan?: string;
  statusProses?: 'menunggu' | 'diterima_bidang' | 'diteruskan_staf' | 'ditindak_langsung' | 'menunggu_pemeriksaan' | 'selesai';
  diteruskanKe?: string;
  catatanPenugasan?: string;
}

/** Alias lama agar kode existing tidak pecah */
export type DisposisiBidang = DisposisiTujuan;

/** Instruksi yang dipilih Kepala Dinas (bisa lebih dari satu) — Z7 */
export type InstruksiDisposisi = {
  jenis: JenisInstruksi;
  teks?: string; // untuk 'lainnya'
};

export interface Disposisi {
  id: string;
  suratMasukId: string;
  suratMasuk?: SuratMasuk;
  dibuatOleh?: string;         // id petugas
  instruksi: JenisInstruksi;   // instruksi utama (lama, backward-compat)
  instruksiLainnya?: string;   // teks bebas bila instruksi = 'lainnya'
  /** Multi-instruksi baru (Z7: bisa lebih dari satu kotak dicentang) */
  instruksiList?: InstruksiDisposisi[];
  catatanKepala?: string;
  catatanKadin?: string;       // alias untuk catatanKepala
  tenggat: string;
  status: StatusDisposisi;
  /** Keputusan Kepala Dinas: disposisi ke bidang atau tidak perlu disposisi */
  keputusanKd?: 'disposisi' | 'tidak_perlu';
  /** true bila tujuan > 1 bidang atau koordinasi/konfirmasi dipilih — K5 */
  lintasBidang?: boolean;
  sifat?: SifatSurat;          // Sifat surat yang dipilih Kadis pada saat disposisi (Segera, Rahasia, Biasa)
  /** Paraf elektronik Kepala Dinas — Z9 */
  parafKdOleh?: string;
  parafKdAt?: string;
  parafKdIp?: string;
  parafKepalaWaktu?: string;   // alias lama
  parafKadinOleh?: string;     // alias lama
  parafKadinWaktu?: string;    // alias lama
  /** Snapshot nama/NIP/jabatan Kepala Dinas saat paraf — Z10 */
  ttdNamaSnapshot?: string;
  ttdNipSnapshot?: string;
  ttdJabatanSnapshot?: string;
  /** Snapshot data surat masuk saat kartu dikirim (dibekukan) */
  snapshotSurat?: {
    asalSurat: string;
    nomorSuratAsal: string;
    tanggalSuratAsal: string;
    perihal: string;
    sifat: string;
    nomorAgenda: string;
    tanggalTerima: string;
    batasWaktuSurat?: string;
  };
  bidangTujuan: DisposisiTujuan[];
  catatanKoordinasi?: string;
  catatanKoordinasiSekdin?: string; // catatan koordinasi dari Sekretaris
  statusPerBidang?: Record<string, StatusPerBidangItem>;
  /** AT-06: apakah perlu surat jawaban keluar (diputuskan Kepala Bidang saat menyelesaikan) */
  perluSuratJawaban?: boolean;
  reminderSentAt?: string;
  overdueSentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PenugasanStaf {
  id: string;
  disposisiId: string;
  disposisi?: Disposisi;
  stafId: string;
  staf?: User;
  kepalaBidangId: string;
  kepalaBidang?: User;
  catatanPenugasan: string;
  catatanProgres?: string;
  status: 'ditugaskan' | 'dikerjakan' | 'menunggu_pemeriksaan' | 'selesai' | 'perlu_perbaikan' | 'dikembalikan';
  createdAt: string;
}

export interface TindakLanjut {
  id: string;
  disposisiId: string;
  penugasanStafId?: string;
  pelakuId: string;
  pelaku?: User;
  uraianHasil: string;
  berkasUrl?: string;
  status: 'dilaporkan' | 'disetujui' | 'dikembalikan' | 'perlu_perbaikan';
  catatanPengembalian?: string;
  /** Nomor versi/urutan revisi laporan tindak lanjut (1 = pertama, 2 = revisi ke-2, dst) — Tahap 4 */
  nomorRevisi?: number;
  createdAt: string;
}

export interface SuratKeluar {
  id: string;
  nomorUrut?: number;
  nomorBerkas?: string;
  nomorPetunjuk?: string;
  nomorPaket?: string;
  sifat?: SifatSurat;
  nomorSurat: string | null;
  perihal: string;
  tujuan: string;
  klasifikasiId: string;
  klasifikasi?: KlasifikasiSurat;
  /** Jenis Surat menurut fungsi (§2.4.1) */
  jenisSuratId?: string;
  jenisSuratObj?: JenisSurat;
  isiRingkas: string;
  status: StatusSuratKeluar;
  penyusunId: string;
  penyusun?: User;
  tanggalKirim?: string;
  berkasUrl?: string;
  /** Bukti terima di pihak tujuan (AT-13) */
  buktiTerimaTanggal?: string;
  buktiTerimaNama?: string;
  /** Tautan ke surat masuk asal bila surat keluar ini adalah balasan (relasi 1 surat masuk -> banyak surat keluar) */
  suratMasukAsalId?: string;
  /** Foreign key eksplisit sesuai ERD Gambar 14 — Tahap 4 */
  refSuratMasukId?: string;
  /** Snapshot tanda tangan digital Kepala Dinas saat disahkan (Tahap 3) */
  ttdImageUrl?: string;
  ttdNamaSnapshot?: string;
  ttdNipSnapshot?: string;
  ttdWaktuSnapshot?: string;
  /** Snapshot paraf koordinasi Sekretaris Dinas saat disetujui (Tahap 3) */
  parafImageUrl?: string;
  parafNamaSnapshot?: string;
  parafWaktuSnapshot?: string;
  createdAt: string;
  updatedAt: string;
}

/** Satu baris tujuan pada buku ekspedisi (penerima + paraf). */
export interface BukuEkspedisiTujuan {
  id: string;
  /** Id baris buku ekspedisi induknya. */
  ekspedisiId: string;
  urutan: number;
  tujuan: string;
  /** Paraf penerima, mis. "(Paraf: Jop)" atau "(TTD)". */
  penerimaParaf: string;
  /** Tanggal diterima — format buku dinas "12/1-26", atau teks asli dari catatan. */
  tanggalTerima: string;
  catatan: string;
}

/**
 * Baris buku ekspedisi persuratan (Lampiran 1).
 * Diisi dari tabel `buku_ekspedisi` + `buku_ekspedisi_tujuan`.
 */
export interface BukuEkspedisi {
  id: string;
  /** Hari dan tanggal pencatatan, mis. "Senin 12/01/26". */
  hariTanggal: string;
  tanggal: string;
  dokumen: string;
  tujuan: BukuEkspedisiTujuan[];
}

export interface PersetujuanSuratKeluar {
  id: string;
  suratKeluarId: string;
  jenis: JenisPersetujuan;
  pelakuId: string;
  pelaku?: User;
  catatan?: string;
  waktu: string;
  /** Snapshot gambar tanda tangan/paraf saat aksi dilakukan (Tahap 3) */
  urlTandaTanganSnapshot?: string;
  namaPelakuSnapshot?: string;
  nipPelakuSnapshot?: string;
  jabatanPelakuSnapshot?: string;
}

export interface ArsipDigital {
  id: string;
  suratMasukId?: string;
  suratKeluarId?: string;
  jenisSurat: 'masuk' | 'keluar';
  kodeArsip: string;
  berkasUrl: string;
  perihal: string;
  nomorSurat: string;
  tahun: number;
  klasifikasiId: string;
  klasifikasi?: KlasifikasiSurat;
  /** Jenis Surat menurut fungsi (§2.4.1) — opsional, bisa null untuk arsip lama */
  jenisSuratId?: string;
  jenisSuratObj?: JenisSurat;
  createdAt: string;
  statusArsip?: 'disposisi' | 'selesai' | 'terkirim' | 'menunggu_verifikasi' | 'diarsipkan';
  laporanHasil?: string;
  berkasLaporanUrl?: string;
  tanggalSelesai?: string;
  suratBalasanId?: string;
  suratBalasanNomor?: string;
  suratBalasanPerihal?: string;
  isSuratBalasan?: boolean;
}

export interface Notifikasi {
  id: string;
  userId: string;
  judul: string;
  pesan: string;
  tautanUrl?: string;
  dibaca: boolean;
  tingkat?: 'info' | 'peringatan' | 'bahaya';
  isRahasia?: boolean;
  createdAt: string;
  kanal?: 'panel' | 'email' | 'email (simulasi)';
  statusKirim?: 'terkirim' | 'gagal' | 'simulasi';
  pesanGalat?: string;
}

export interface RiwayatStatus {
  id: string;
  suratMasukId?: string;
  suratKeluarId?: string;
  status: string;
  pelakuId: string;
  pelaku?: User;
  catatan?: string;
  waktu: string;
}

export interface LogAktivitas {
  id: string;
  userId: string;
  user?: User;
  aksi: string;
  detail: string;
  waktu: string;
}

export interface NomorSuratCounter {
  tahun: number;
  klasifikasiKode: string;
  counter: number;
}

// --- Dashboard Stats ---

export interface DashboardStats {
  role: UserRole;
  data: Record<string, number | string | unknown[]>;
}

// --- Store Actions ---

export type StoreAction =
  | { type: 'LOGIN'; payload: User }
  | { type: 'LOGOUT' }
  | { type: 'ADD_SURAT_MASUK'; payload: SuratMasuk }
  | { type: 'UPDATE_SURAT_MASUK'; payload: Partial<SuratMasuk> & { id: string } }
  | { type: 'ADD_DISPOSISI'; payload: Disposisi }
  | { type: 'UPDATE_DISPOSISI'; payload: Partial<Disposisi> & { id: string } }
  | { type: 'ADD_PENUGASAN'; payload: PenugasanStaf }
  | { type: 'UPDATE_PENUGASAN'; payload: Partial<PenugasanStaf> & { id: string } }
  | { type: 'ADD_TINDAK_LANJUT'; payload: TindakLanjut }
  | { type: 'UPDATE_TINDAK_LANJUT'; payload: Partial<TindakLanjut> & { id: string } }
  | { type: 'ADD_SURAT_KELUAR'; payload: SuratKeluar }
  | { type: 'UPDATE_SURAT_KELUAR'; payload: Partial<SuratKeluar> & { id: string } }
  | { type: 'ADD_PERSETUJUAN'; payload: PersetujuanSuratKeluar }
  | { type: 'ADD_NOTIFIKASI'; payload: Notifikasi }
  | { type: 'UPDATE_NOTIFIKASI'; payload: Partial<Notifikasi> & { id: string } }
  | { type: 'MARK_NOTIFIKASI_READ'; payload: string }
  | { type: 'ADD_RIWAYAT'; payload: RiwayatStatus }
  | { type: 'ADD_LOG'; payload: LogAktivitas }
  | { type: 'ADD_USER'; payload: User }
  | { type: 'UPDATE_USER'; payload: Partial<User> & { id: string } }
  | { type: 'ADD_KLASIFIKASI'; payload: KlasifikasiSurat }
  | { type: 'UPDATE_KLASIFIKASI'; payload: Partial<KlasifikasiSurat> & { id: string } }
  | { type: 'ADD_UNIT_KERJA'; payload: UnitKerja }
  | { type: 'UPDATE_UNIT_KERJA'; payload: Partial<UnitKerja> & { id: string } }
  | { type: 'DELETE_UNIT_KERJA'; payload: string }
  | { type: 'ADD_ARSIP'; payload: ArsipDigital }
  | { type: 'UPDATE_ARSIP'; payload: Partial<ArsipDigital> & { id: string } }
  | { type: 'UPDATE_COUNTER'; payload: { tahun: number; klasifikasiKode: string; counter: number } }
  | { type: 'ADD_JENIS_SURAT'; payload: JenisSurat }
  | { type: 'UPDATE_JENIS_SURAT'; payload: Partial<JenisSurat> & { id: string } }
  | { type: 'ADD_DATA_MASTER'; payload: DataMasterItem }
  | { type: 'UPDATE_DATA_MASTER'; payload: Partial<DataMasterItem> & { id: string } }
  | { type: 'DELETE_DATA_MASTER'; payload: string }
  | { type: 'RESET_DATA_SURAT' };

export interface AppState {
  currentUser: User | null;
  users: User[];
  unitKerja: UnitKerja[];
  klasifikasi: KlasifikasiSurat[];
  /** Jenis Surat menurut fungsinya (§2.4.1) */
  jenisSurat: JenisSurat[];
  /** Data master generik terpadu (Tahap 6: sifat surat, jenis instruksi, instansi asal, dll.) */
  dataMaster: DataMasterItem[];
  suratMasuk: SuratMasuk[];
  disposisi: Disposisi[];
  penugasan: PenugasanStaf[];
  tindakLanjut: TindakLanjut[];
  suratKeluar: SuratKeluar[];
  persetujuan: PersetujuanSuratKeluar[];
  arsip: ArsipDigital[];
  notifikasi: Notifikasi[];
  riwayat: RiwayatStatus[];
  log: LogAktivitas[];
  nomorSuratCounter: NomorSuratCounter[];
  /** Pengaturan instansi (singleton) */
  pengaturanInstansi: PengaturanInstansi;
  /** Buku ekspedisi persuratan (Lampiran 1) */
  bukuEkspedisi: BukuEkspedisi[];
}
