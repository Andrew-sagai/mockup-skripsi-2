// ============================================================
// MOCK DATA — Seed data for demonstration
// ============================================================
import {
  User, UnitKerja, JenisSurat, KlasifikasiSurat, SuratMasuk, Disposisi,
  DisposisiTujuan, PenugasanStaf, TindakLanjut, SuratKeluar,
  PersetujuanSuratKeluar, ArsipDigital, Notifikasi, RiwayatStatus,
  LogAktivitas, NomorSuratCounter, PengaturanInstansi
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

// --- Jenis Surat (Berdasarkan Fungsi Administratif, Proposal Subbab 2.4.1 [Fitriani 29]) ---
export const JENIS_SURAT: JenisSurat[] = [
  { id: 'js-1', nama: 'Pemberitahuan', keterangan: 'Menyampaikan pemberitahuan atau informasi resmi kedinasan kepada pihak terkait', utama: true, aktif: true },
  { id: 'js-2', nama: 'Permintaan', keterangan: 'Meminta data, informasi, keterangan, atau dukungan administratif dan teknis', utama: false, aktif: true },
  { id: 'js-3', nama: 'Undangan', keterangan: 'Mengundang pihak lain untuk menghadiri rapat, pertemuan, atau acara kedinasan', utama: true, aktif: true },
  { id: 'js-4', nama: 'Penugasan (Surat Tugas)', keterangan: 'Memberikan tugas kedinasan atau perintah pelaksanaan tugas kepada pejabat/staf', utama: true, aktif: true },
  { id: 'js-5', nama: 'Keputusan', keterangan: 'Menetapkan kebijakan, ketetapan hukum administratif, atau pembentukan tim/kegiatan dinas', utama: true, aktif: true },
  { id: 'js-6', nama: 'Sertifikat', keterangan: 'Tanda bukti pengakuan, kelulusan, atau kepemilikan kompetensi/hak bidang pertanian', utama: false, aktif: true },
  { id: 'js-7', nama: 'Pengantar', keterangan: 'Mengantarkan naskah, berkas, dokumen, atau barang dinas kepada instansi tujuan', utama: false, aktif: true },
  { id: 'js-8', nama: 'Edaran', keterangan: 'Menyampaikan petunjuk, arahan, atau ketentuan umum persuratan kepada banyak pihak', utama: false, aktif: true },
  { id: 'js-9', nama: 'Rekomendasi', keterangan: 'Memberikan pertimbangan, persetujuan teknis, atau dukungan kelayakan operasional dinas', utama: false, aktif: true },
  { id: 'js-10', nama: 'Laporan', keterangan: 'Menyampaikan laporan berkala, pertanggungjawaban kegiatan, atau hasil pelaksanaan tugas dinas', utama: false, aktif: true },
];

// --- Kode Klasifikasi Kearsipan (Buku Penuntun Kearsipan Dinas) ---
export const KLASIFIKASI: KlasifikasiSurat[] = [
  { id: 'kl-1', kode: '5.20', nama: 'Urusan Umum/Kepegawaian', unitKerjaId: 'uk-1', aktif: true },
  { id: 'kl-2', kode: '5.22', nama: 'Bidang Tanaman Pangan', unitKerjaId: 'uk-3', aktif: true },
  { id: 'kl-3', kode: '800', nama: 'Kepegawaian', unitKerjaId: 'uk-1', aktif: true }, // TODO: konfirmasi dengan buku penuntun kearsipan
];

// --- Users ---
export const USERS: User[] = [
  { id: 'u-1', nama: 'Rina Margaretha', email: 'admin@distan.go.id', role: 'admin', unitKerjaId: null, aktif: true, dummyPassword: 'admin', createdAt: '2026-01-10T08:00:00Z' },
  { id: 'u-2', nama: 'Johan Tumewu', email: 'petugas1@distan.go.id', role: 'petugas_surat', unitKerjaId: 'uk-1', aktif: true, dummyPassword: 'petugas123', createdAt: '2026-01-10T08:00:00Z' },
  { id: 'u-3', nama: 'Sartika Polii', email: 'petugas2@distan.go.id', role: 'petugas_surat', unitKerjaId: 'uk-1', aktif: true, dummyPassword: 'petugas123', createdAt: '2026-01-10T08:00:00Z' },
  { id: 'u-4', nama: 'Dr. Ir. Ventje Rantung, M.Si', email: 'sekretaris@distan.go.id', role: 'sekretaris', unitKerjaId: 'uk-1', aktif: true, dummyPassword: 'sekretaris123', createdAt: '2026-01-10T08:00:00Z' },
  { id: 'u-5', nama: 'Feybie F. Pusung, S.Pt, M.Si', email: 'kadis@distan.go.id', role: 'kepala_dinas', unitKerjaId: null, aktif: true, nip: '197402262000032002', dummyPassword: 'kadis123', createdAt: '2026-01-10T08:00:00Z' },
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

// --- Dikosongkan agar pengguna bisa mengetes dari awal ---
export const SURAT_MASUK: SuratMasuk[] = [];
export const DISPOSISI: Disposisi[] = [];
export const PENUGASAN: PenugasanStaf[] = [];
export const TINDAK_LANJUT: TindakLanjut[] = [];
export const SURAT_KELUAR: SuratKeluar[] = [];
export const PERSETUJUAN: PersetujuanSuratKeluar[] = [];
export const ARSIP: ArsipDigital[] = [];
export const RIWAYAT: RiwayatStatus[] = [];
export const NOTIFIKASI: Notifikasi[] = [];
export const LOG_AKTIVITAS: LogAktivitas[] = [];
export const NOMOR_SURAT_COUNTER: NomorSuratCounter[] = [];

// --- Pengaturan Instansi (singleton — bagian Z1 kop lembar) ---
export const PENGATURAN_INSTANSI: PengaturanInstansi = {
  id: 'pi-1',
  namaPemda: 'PEMERINTAH KABUPATEN MINAHASA SELATAN',
  namaInstansi: 'DINAS PERTANIAN',
  alamat: 'Jl. Trans Sulawesi Kel. Pondang Kecamatan Amurang Timur',
  telpFax: 'Telp/ Fax : (0430) 22589',
  logoPath: '/logo.png',
};

