-- ==============================================================================
-- SKRIP RESET DATA PERSURATAN DINAS PERTANIAN KABUPATEN MINAHASA SELATAN
-- (Hanya menghapus data surat & transaksinya, TIDAK MENGHAPUS data user/pengguna)
-- ==============================================================================

-- 1. Kosongkan tabel transaksi persuratan secara berurutan / cascading
TRUNCATE TABLE 
  tindak_lanjut,
  penugasan_staf,
  disposisi_bidang_tujuan,
  disposisi,
  persetujuan_surat_keluar,
  riwayat_status,
  notifikasi,
  arsip_digital,
  buku_ekspedisi,
  surat_keluar,
  surat_masuk
CASCADE;

-- 2. Reset counter nomor agenda & nomor urut keluar ke 0
-- (Surat baru berikutnya yang dicatat/disetujui otomatis mulai dari nomor 1)
UPDATE nomor_surat_counter 
SET counter = 0, updated_at = NOW();

-- Inisialisasi ulang counter tahun berjalan 2026 ke 0 jika baris belum ada
INSERT INTO nomor_surat_counter (tahun, jenis_surat, counter)
VALUES 
  (2026, 'surat_masuk', 0),
  (2026, 'surat_keluar', 0)
ON CONFLICT (tahun, jenis_surat) DO UPDATE 
SET counter = 0, updated_at = NOW();

-- CATATAN:
-- Tabel berikut TETAP UTUH dan TIDAK DISENTUH:
-- - users (Akun Admin, Petugas, Sekretaris, Kadis, Kabid, Staf)
-- - unit_kerja (Sekretariat dan 5 Bidang Teknis Dinas)
-- - jenis_surat (10 Jenis Surat Administratif Dinas)
-- - klasifikasi_surat (Kode Klasifikasi Kearsipan Dinas)
-- - data_master (Sifat Surat, Jenis Instruksi, Instansi Pengirim Terdaftar)
-- - pengaturan_instansi (Kop & Identitas Resmi Dinas Pertanian)
