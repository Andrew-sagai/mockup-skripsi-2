// ============================================================
// MOCK DATA — Seed data for demonstration
// Mengacu 100% pada Proposal Skripsi Sistem Informasi Manajemen
// Persuratan Dinas Pertanian Kabupaten Minahasa Selatan
// ============================================================
import {
  User, UnitKerja, JenisSurat, KlasifikasiSurat, SuratMasuk, Disposisi,
  DisposisiTujuan, PenugasanStaf, TindakLanjut, SuratKeluar,
  PersetujuanSuratKeluar, ArsipDigital, Notifikasi, RiwayatStatus,
  LogAktivitas, NomorSuratCounter, PengaturanInstansi, DataMasterItem
} from './types';

// --- Unit Kerja / Bidang ---
// Urutan urutanLembar mengikuti urutan kertas asli (K6)
export const UNIT_KERJA: UnitKerja[] = [
  { id: 'uk-1', kode: 'SEKR',    nama: 'Sekretariat',                                      jenis: 'sekretariat', labelLembar: 'Sekretaris',                                                   urutanLembar: 1, aktif: true },
  { id: 'uk-6', kode: 'BID-PTN', nama: 'Bidang Peternakan dan Kesehatan Hewan',             jenis: 'bidang',      labelLembar: 'Ka. Bid. Peternakan dan\nKesehatan Hewan',                     urutanLembar: 2, aktif: true },
  { id: 'uk-3', kode: 'BID-TPH', nama: 'Bidang Tanaman Pangan dan Hortikultura',            jenis: 'bidang',      labelLembar: 'Ka. Bid. Tanaman Pangan dan\nHortikultura',                    urutanLembar: 3, aktif: true },
  { id: 'uk-4', kode: 'BID-SP',  nama: 'Bidang Prasarana dan Sarana Pertanian',            jenis: 'bidang',      labelLembar: 'Ka. Bid. Prasarana dan Sarana\nPertanian',                    urutanLembar: 4, aktif: true },
  { id: 'uk-2', kode: 'BID-PK',  nama: 'Bidang Perkebunan',                                jenis: 'bidang',      labelLembar: 'Ka. Bid. Perkebunan',                                          urutanLembar: 5, aktif: true },
  { id: 'uk-5', kode: 'BID-PYL', nama: 'Bidang Penyuluhan Pertanian',                     jenis: 'bidang',      labelLembar: 'Ka. Bid. Penyuluhan Pertanian',                                urutanLembar: 6, aktif: true },
];

// --- Jenis Surat (Berdasarkan Fungsi Administratif, Fitriani Subbab 2.4.1 & Bab 1 Poin 6) ---
// Catatan: "Biasa" dikeluarkan dari Jenis Surat karena merupakan Sifat Surat
export const JENIS_SURAT: JenisSurat[] = [
  { id: 'js-1', nama: 'Pemberitahuan', keterangan: 'Menyampaikan pemberitahuan atau informasi resmi kedinasan kepada pihak terkait', utama: true, aktif: true },
  { id: 'js-2', nama: 'Permintaan', keterangan: 'Meminta data, informasi, keterangan, atau dukungan administratif dan teknis', utama: false, aktif: true },
  { id: 'js-3', nama: 'Undangan', keterangan: 'Mengundang pihak lain untuk menghadiri rapat, pertemuan, atau acara kedinasan', utama: true, aktif: true },
  { id: 'js-4', nama: 'Penugasan', keterangan: 'Memberikan tugas kedinasan atau perintah pelaksanaan tugas kepada pejabat/staf', utama: true, aktif: true },
  { id: 'js-5', nama: 'Keputusan', keterangan: 'Menetapkan kebijakan, ketetapan hukum administratif, atau pembentukan tim/kegiatan dinas', utama: true, aktif: true },
  { id: 'js-6', nama: 'Sertifikat', keterangan: 'Tanda bukti pengakuan, kelulusan, atau kepemilikan kompetensi/hak bidang pertanian', utama: false, aktif: true },
  { id: 'js-7', nama: 'Pengantar', keterangan: 'Mengantarkan naskah, berkas, dokumen, atau barang dinas kepada instansi tujuan', utama: false, aktif: true },
  { id: 'js-8', nama: 'Edaran', keterangan: 'Menyampaikan petunjuk, arahan, atau ketentuan umum persuratan kepada banyak pihak', utama: false, aktif: true },
  { id: 'js-9', nama: 'Rekomendasi', keterangan: 'Memberikan pertimbangan, persetujuan teknis, atau dukungan kelayakan operasional dinas', utama: false, aktif: true },
  { id: 'js-10', nama: 'Laporan', keterangan: 'Menyampaikan laporan berkala, pertanggungjawaban kegiatan, atau hasil pelaksanaan tugas dinas', utama: false, aktif: true },
  { id: 'js-11', nama: 'Lainnya', keterangan: 'Jenis naskah dinas lainnya yang sah menurut tata naskah dinas', utama: false, aktif: true },
];

// --- Kode Klasifikasi Kearsipan (Buku Penuntun Kearsipan Dinas) ---
export const KLASIFIKASI: KlasifikasiSurat[] = [
  { id: 'kl-1', kode: '5.20', nama: 'Urusan Umum/Kepegawaian', unitKerjaId: 'uk-1', aktif: true },
  { id: 'kl-2', kode: '5.22', nama: 'Bidang Tanaman Pangan', unitKerjaId: 'uk-3', aktif: true },
  { id: 'kl-3', kode: '800', nama: 'Kepegawaian/Umum', unitKerjaId: 'uk-1', aktif: true },
];

// --- Users (Daftar Akun Pengguna / User Tetap Utuh) ---
export const USERS: User[] = [
  { id: 'u-1', nama: 'Rina Margaretha', email: 'admin@distan.go.id', role: 'admin', unitKerjaId: null, aktif: true, dummyPassword: 'admin', createdAt: '2026-01-10T08:00:00Z' },
  { id: 'u-2', nama: 'Johan Tumewu', email: 'petugas1@distan.go.id', role: 'petugas_surat', unitKerjaId: 'uk-1', aktif: true, dummyPassword: 'petugas123', createdAt: '2026-01-10T08:00:00Z' },
  { id: 'u-3', nama: 'Sartika Polii', email: 'petugas2@distan.go.id', role: 'petugas_surat', unitKerjaId: 'uk-1', aktif: true, dummyPassword: 'petugas123', createdAt: '2026-01-10T08:00:00Z' },
  { id: 'u-4', nama: 'Dr. Ir. Ventje Rantung, M.Si', email: 'sekretaris@distan.go.id', role: 'sekretaris', unitKerjaId: 'uk-1', aktif: true, nip: '197005121995031001', jabatan: 'Sekretaris Dinas Pertanian', urlTandaTangan: '/docs/ttd-sekdis.svg', dummyPassword: 'sekretaris123', createdAt: '2026-01-10T08:00:00Z' },
  { id: 'u-5', nama: 'Feybie F. Pusung, S.Pt, M.Si', email: 'kadis@distan.go.id', role: 'kepala_dinas', unitKerjaId: null, aktif: true, nip: '197402262000032002', jabatan: 'Kepala Dinas Pertanian', urlTandaTangan: '/docs/ttd-kadis.svg', dummyPassword: 'kadis123', createdAt: '2026-01-10T08:00:00Z' },
  { id: 'u-6', nama: 'Ir. Henny Tamboto, M.Si', email: 'kabid.peternakan@distan.go.id', role: 'kepala_bidang', unitKerjaId: 'uk-6', aktif: true, dummyPassword: 'kabid123', createdAt: '2026-01-10T08:00:00Z' },
  { id: 'u-7', nama: 'Dr. Steven Lontoh', email: 'kabid.tph@distan.go.id', role: 'kepala_bidang', unitKerjaId: 'uk-3', aktif: true, dummyPassword: 'kabid123', createdAt: '2026-01-10T08:00:00Z' },
  { id: 'u-8', nama: 'Ir. Grace Wenas, M.P', email: 'kabid.sarpras@distan.go.id', role: 'kepala_bidang', unitKerjaId: 'uk-4', aktif: true, dummyPassword: 'kabid123', createdAt: '2026-01-10T08:00:00Z' },
  { id: 'u-9', nama: 'Ir. Martha Liando, M.Si', email: 'kabid.perkebunan@distan.go.id', role: 'kepala_bidang', unitKerjaId: 'uk-2', aktif: true, dummyPassword: 'kabid123', createdAt: '2026-01-10T08:00:00Z' },
  { id: 'u-10', nama: 'Drs. Ronny Pangkey', email: 'kabid.penyuluhan@distan.go.id', role: 'kepala_bidang', unitKerjaId: 'uk-5', aktif: true, dummyPassword: 'kabid123', createdAt: '2026-01-10T08:00:00Z' },
  { id: 'u-11', nama: 'Santi Mamonto', email: 'staf.peternakan@distan.go.id', role: 'staf_pelaksana', unitKerjaId: 'uk-6', aktif: true, dummyPassword: 'staf123', createdAt: '2026-02-01T08:00:00Z' },
  { id: 'u-12', nama: 'Budi Sumolang', email: 'staf.tph@distan.go.id', role: 'staf_pelaksana', unitKerjaId: 'uk-3', aktif: true, dummyPassword: 'staf123', createdAt: '2026-02-01T08:00:00Z' },
  { id: 'u-13', nama: 'Dewi Kalalo', email: 'staf.sarpras@distan.go.id', role: 'staf_pelaksana', unitKerjaId: 'uk-4', aktif: true, dummyPassword: 'staf123', createdAt: '2026-02-01T08:00:00Z' },
  { id: 'u-14', nama: 'Ferly Mamusung', email: 'staf.perkebunan1@distan.go.id', role: 'staf_pelaksana', unitKerjaId: 'uk-2', aktif: true, dummyPassword: 'staf123', createdAt: '2026-02-01T08:00:00Z' },
  { id: 'u-15', nama: 'Eko Warouw', email: 'staf.penyuluhan@distan.go.id', role: 'staf_pelaksana', unitKerjaId: 'uk-5', aktif: true, dummyPassword: 'staf123', createdAt: '2026-02-01T08:00:00Z' },
];

// --- Data Transaksional Persuratan (Dikosongkan sesuai permintaan reset data surat) ---
export const SURAT_MASUK: SuratMasuk[] = [];
export const DISPOSISI: Disposisi[] = [];
export const PENUGASAN: PenugasanStaf[] = [];
export const TINDAK_LANJUT: TindakLanjut[] = [];
export const SURAT_KELUAR: SuratKeluar[] = [];

// --- Data Wajib Buku Ekspedisi Persuratan ---
export interface BukuEkspedisiSeedItem {
  id: string;
  hariTanggal: string;
  tanggal: string;
  dokumen: string;
  tujuanTtdList: Array<{
    tujuan: string;
    penerimaParaf: string;
    tanggalTerima: string;
  }>;
}

export const BUKU_EKSPEDISI_DATA: BukuEkspedisiSeedItem[] = [];
export const PERSETUJUAN: PersetujuanSuratKeluar[] = [];
export const ARSIP: ArsipDigital[] = [];
export const RIWAYAT: RiwayatStatus[] = [];
export const NOTIFIKASI: Notifikasi[] = [];
export const LOG_AKTIVITAS: LogAktivitas[] = [];

// Counter tahun 2026 di-reset ke 0 (Surat Masuk: 0, Surat Keluar: 0)
export const NOMOR_SURAT_COUNTER: NomorSuratCounter[] = [
  { tahun: 2026, klasifikasiKode: 'SURAT_MASUK', counter: 0 },
  { tahun: 2026, klasifikasiKode: 'SURAT_KELUAR', counter: 0 },
];

// --- Pengaturan Instansi (singleton — bagian Z1 kop lembar) ---
export const PENGATURAN_INSTANSI: PengaturanInstansi = {
  id: 'pi-1',
  namaPemda: 'PEMERINTAH KABUPATEN MINAHASA SELATAN',
  namaInstansi: 'DINAS PERTANIAN',
  alamat: 'Jl. Trans Sulawesi Kel. Pondang Kecamatan Amurang Timur',
  telpFax: 'Telp/ Fax : (0430) 22589',
  logoPath: '/logo.png',
};

// --- Data Master Generik Terpadu (Tahap 6) ---
export const DATA_MASTER: DataMasterItem[] = [
  // ── 1. Sifat Surat (5 Pilihan Baku) ──────────────────────────
  { id: 'dm-sifat-1', kategori: 'sifat_surat', kode: 'biasa', label: 'Biasa', keterangan: 'Surat dinas rutin, penyelesaian berjangka wajar', aktif: true, urutan: 1 },
  { id: 'dm-sifat-2', kategori: 'sifat_surat', kode: 'umum', label: 'Umum/Pemberitahuan', keterangan: 'Pengumuman umum atau edaran terbuka', aktif: true, urutan: 2 },
  { id: 'dm-sifat-3', kategori: 'sifat_surat', kode: 'penting', label: 'Penting', keterangan: 'Perlu perhatian pimpinan, harus diselesaikan tepat waktu', aktif: true, urutan: 3 },
  { id: 'dm-sifat-4', kategori: 'sifat_surat', kode: 'segera', label: 'Segera', keterangan: 'Wajib ditindaklanjuti pada hari yang sama atau batas waktu ketat', aktif: true, urutan: 4 },
  { id: 'dm-sifat-5', kategori: 'sifat_surat', kode: 'rahasia', label: 'Rahasia', keterangan: 'Dokumen tertutup, akses terbatas bagi pihak berwenang', aktif: true, urutan: 5 },

  // ── 2. Jenis Instruksi Disposisi ─────────────────────────────
  { id: 'dm-inst-1', kategori: 'jenis_instruksi', kode: 'tanggapan_saran', label: 'Tanggapan dan Saran', keterangan: 'Memberikan telaah, tanggapan tertulis, dan masukan teknis', aktif: true, urutan: 1 },
  { id: 'dm-inst-2', kategori: 'jenis_instruksi', kode: 'proses_lanjut', label: 'Proses Lebih Lanjut', keterangan: 'Menindaklanjuti secara administratif atau operasional sesuai ketentuan', aktif: true, urutan: 2 },
  { id: 'dm-inst-3', kategori: 'jenis_instruksi', kode: 'koordinasi_konfirmasi', label: 'Koordinasi / Konfirmasi', keterangan: 'Melakukan koordinasi lintas unit/bidang atau konfirmasi ke instansi pengirim', aktif: true, urutan: 3 },
  { id: 'dm-inst-4', kategori: 'jenis_instruksi', kode: 'selesaikan_segera', label: 'Selesaikan Segera', keterangan: 'Penyelesaian prioritas tinggi dalam kurun waktu 1x24 jam', aktif: true, urutan: 4 },
  { id: 'dm-inst-5', kategori: 'jenis_instruksi', kode: 'hadiri_wakili', label: 'Hadiri / Wakili', keterangan: 'Menghadiri undangan atau mewakili pimpinan dinas pada kegiatan', aktif: true, urutan: 5 },
  { id: 'dm-inst-6', kategori: 'jenis_instruksi', kode: 'arsipkan', label: 'Simpan / Arsipkan', keterangan: 'Disimpan sebagai dokumen dokumentasi dan bahan informasi dinas', aktif: true, urutan: 6 },
  { id: 'dm-inst-7', kategori: 'jenis_instruksi', kode: 'lainnya', label: 'Lainnya (Isian Bebas)', keterangan: 'Instruksi khusus yang diuraikan secara spesifik oleh pimpinan', aktif: true, urutan: 7 },

  // ── 3. Instansi Pengirim / Asal Surat ─────────────────────────
  { id: 'dm-instansi-1', kategori: 'instansi_asal', kode: 'SETDA-MINSEL', label: 'Sekretariat Daerah Kabupaten Minahasa Selatan', keterangan: 'Pemerintah Kabupaten Minahasa Selatan', aktif: true, urutan: 1 },
  { id: 'dm-instansi-2', kategori: 'instansi_asal', kode: 'DISTAN-SULUT', label: 'Dinas Pertanian dan Peternakan Provinsi Sulawesi Utara', keterangan: 'Pemerintah Provinsi Sulawesi Utara', aktif: true, urutan: 2 },
  { id: 'dm-instansi-3', kategori: 'instansi_asal', kode: 'KEMENTAN-RI', label: 'Kementerian Pertanian Republik Indonesia', keterangan: 'Instansi Pemerintah Pusat', aktif: true, urutan: 3 },
  { id: 'dm-instansi-4', kategori: 'instansi_asal', kode: 'BPP-AMURANG', label: 'Balai Penyuluhan Pertanian (BPP) Amurang', keterangan: 'Unit Pelaksana Teknis Penyuluhan Lapangan', aktif: true, urutan: 4 },
  { id: 'dm-instansi-5', kategori: 'instansi_asal', kode: 'BPS-MINSEL', label: 'Badan Pusat Statistik Kabupaten Minahasa Selatan', keterangan: 'Instansi Vertikal mitra statistik pangan', aktif: true, urutan: 5 },
  { id: 'dm-instansi-6', kategori: 'instansi_asal', kode: 'DPRD-MINSEL', label: 'Dewan Perwakilan Rakyat Daerah Kabupaten Minahasa Selatan', keterangan: 'Lembaga Legislatif Daerah', aktif: true, urutan: 6 },
  { id: 'dm-instansi-7', kategori: 'instansi_asal', kode: 'POKTAN-MAESA', label: 'Kelompok Tani Maesa Jaya Amurang Barat', keterangan: 'Organisasi Gabungan Kelompok Tani binaan dinas', aktif: true, urutan: 7 },
];
