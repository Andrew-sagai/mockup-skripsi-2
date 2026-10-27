-- =============================================================================
-- RESET DATA PERSURATAN
-- Mengosongkan data surat & transaksinya, TIDAK menyentuh akun pengguna,
-- data master, unit kerja, maupun setting instansi.
--
-- Jalankan di Supabase SQL Editor (koneksi langsung sebagai postgres).
-- Gunakan `TRUNCATE ... CASCADE` agar seluruh tabel anak ikut kosong.
-- =============================================================================

TRUNCATE TABLE
  public.tindak_lanjut,
  public.penugasan_staf,
  public.disposisi_bidang_tujuan,
  public.disposisi,
  public.persetujuan_surat_keluar,
  public.riwayat_status,
  public.notifikasi,
  public.arsip_digital,
  public.buku_ekspedisi_tujuan,
  public.buku_ekspedisi,
  public.surat_keluar,
  public.surat_masuk,
  public.reminder_log,
  public.log_aktivitas
CASCADE;

-- Reset counter nomor agenda & nomor surat keluar ke 0
UPDATE public.nomor_surat_counter
SET counter = 0, updated_at = now();

-- Pastikan baris counter untuk tahun berjalan tersedia
INSERT INTO public.nomor_surat_counter (tahun, jenis_surat, counter)
VALUES
  (EXTRACT(YEAR FROM CURRENT_DATE)::int, 'surat_masuk', 0),
  (EXTRACT(YEAR FROM CURRENT_DATE)::int, 'surat_keluar', 0)
ON CONFLICT (tahun, jenis_surat) DO UPDATE
SET counter = 0, updated_at = now();

-- TETAP UTUH dan TIDAK DISENTUH:
-- - public.users          (akun Admin, Petugas, Sekretaris, Kadis, Kabid, Staf)
-- - public.unit_kerja     (Sekretariat dan 5 Bidang Teknis Dinas)
-- - public.jenis_surat    (jenis surat administratif dinas)
-- - public.klasifikasi_surat (kode klasifikasi kearsipan dinas)
-- - public.data_master    (sifat surat, jenis instruksi, instansi pengirim)
-- - public.pengaturan_instansi (kop & identitas resmi dinas)
