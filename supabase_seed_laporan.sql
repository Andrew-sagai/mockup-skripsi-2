-- ==============================================================================
-- SEED DATA RESMI DINAS PERTANIAN KABUPATEN MINAHASA SELATAN
-- Mengacu pada Gambar 1 (KIKY: Surat Masuk 83-89), Lampiran 2 (TiTi: Surat Keluar 239-250),
-- dan Lampiran 1 (PAPERLINE: Buku Ekspedisi Persuratan)
-- ==============================================================================

-- 1. Tabel Tambahan / Kolom Fisik (Jika belum ada di Supabase PostgreSQL)
ALTER TABLE IF EXISTS surat_masuk 
  ADD COLUMN IF NOT EXISTS nomor_urut INTEGER,
  ADD COLUMN IF NOT EXISTS nomor_berkas VARCHAR(50),
  ADD COLUMN IF NOT EXISTS nomor_petunjuk VARCHAR(50),
  ADD COLUMN IF NOT EXISTS nomor_paket VARCHAR(50);

ALTER TABLE IF EXISTS surat_keluar 
  ADD COLUMN IF NOT EXISTS nomor_urut INTEGER,
  ADD COLUMN IF NOT EXISTS nomor_berkas VARCHAR(50),
  ADD COLUMN IF NOT EXISTS nomor_petunjuk VARCHAR(50),
  ADD COLUMN IF NOT EXISTS nomor_paket VARCHAR(50);

-- 2. Seed Data BUKU AGENDA SURAT MASUK (Header: "SURAT SURAT MASUK")
-- Sesuai Gambar 1 hlm. 8 (Buku Register KIKY No. Urut 83 s.d. 89)
INSERT INTO surat_masuk (
  id, nomor_agenda, nomor_urut, nomor_berkas, asal_surat, tanggal_surat_asal, nomor_surat_asal, 
  perihal, tanggal_terima, nomor_petunjuk, nomor_paket, sifat, status, pencatat_id, klasifikasi_id, created_at, updated_at
) VALUES
  ('sm-83', '83', 83, NULL, 'BPKP', '2026-03-31', 'SP-201/PW18.1/2026', 
   'Laporan Hasil evaluasi tata kelola Pupuk bersubsidi TW I thn 2025', '2026-04-07', '7/4/26', NULL, 'biasa', 'didisposisikan', 'u-2', 'kl-1', '2026-04-07 08:00:00+00', '2026-04-07 09:00:00+00'),
  ('sm-84', '84', 84, NULL, 'Bps kab. Minsel', '2026-04-06', 'B-160/71050/KS.000/2026', 
   'Permintaan Data', '2026-04-08', '8/4/26', NULL, 'biasa', 'didisposisikan', 'u-2', 'kl-1', '2026-04-08 08:30:00+00', '2026-04-08 09:00:00+00'),
  ('sm-85', '85', 85, NULL, 'BPKP Prov. Sulut', '2026-04-06', 'PE.09.02/S-327/PW18/3/2026', 
   'Penilaian Maturitas Penyelenggaraan Sistem Pengendalian Intern Pemerintah Terintegrasi Pada Pemda se-Prov Sulut 2026', '2026-04-08', '8/4/26', NULL, 'penting', 'didisposisikan', 'u-2', 'kl-1', '2026-04-08 09:00:00+00', '2026-04-08 10:00:00+00'),
  ('sm-86', '86', 86, NULL, 'Inspektorat', '2026-04-08', '537/26/Sekr-Insp', 
   'Rapat koordinasi Pembahasan Penilaian Maturitas SPIP th 2026', '2026-04-08', '8/4/26', NULL, 'penting', 'didisposisikan', 'u-2', 'kl-1', '2026-04-08 09:30:00+00', '2026-04-08 10:30:00+00'),
  ('sm-87', '87', 87, NULL, 'Pemprov Distan & Peternakan Daerah', '2026-01-12', '500.6.1/93.26/Sekr.Bid.TPH', 
   'Permohonan Alsin Pasca Panen', '2026-04-08', '8/4/26', NULL, 'biasa', 'didisposisikan', 'u-2', 'kl-2', '2026-04-08 10:00:00+00', '2026-04-08 11:00:00+00'),
  ('sm-88', '88', 88, NULL, 'Dirjen Prasarana & Sarana Pertanian', '2026-04-08', 'B-64/SR.430/B.3/04/2026', 
   'Undangan Verifikasi Daring CPCL Vertical Dryer T.A. 2026', '2026-04-08', '8/4/26', NULL, 'segera', 'didisposisikan', 'u-2', 'kl-2', '2026-04-08 10:30:00+00', '2026-04-08 11:30:00+00'),
  ('sm-89', '89', 89, NULL, 'Sekda B. Org', '2026-04-17', '630/26/Sekr-Org', 
   'Tindak lanjut Penunjukan Unit Pembina Teknis Jabatan Fungsional di lingkungan Kab. Minsel', '2026-04-20', '20/4/26', NULL, 'penting', 'didisposisikan', 'u-2', 'kl-1', '2026-04-20 08:00:00+00', '2026-04-20 09:00:00+00')
ON CONFLICT (id) DO UPDATE SET
  nomor_urut = EXCLUDED.nomor_urut,
  nomor_agenda = EXCLUDED.nomor_agenda,
  nomor_berkas = EXCLUDED.nomor_berkas,
  asal_surat = EXCLUDED.asal_surat,
  tanggal_surat_asal = EXCLUDED.tanggal_surat_asal,
  nomor_surat_asal = EXCLUDED.nomor_surat_asal,
  perihal = EXCLUDED.perihal,
  tanggal_terima = EXCLUDED.tanggal_terima,
  nomor_petunjuk = EXCLUDED.nomor_petunjuk,
  nomor_paket = EXCLUDED.nomor_paket;

-- 3. Seed Data BUKU AGENDA SURAT KELUAR (Header: "SURAT - SURAT KELUAR")
-- Sesuai Lampiran 2 hlm. 93 (Buku Register TiTi No. Urut 239 s.d. 250)
INSERT INTO surat_keluar (
  id, nomor_urut, nomor_berkas, tujuan, tanggal_kirim, perihal, nomor_petunjuk, nomor_surat, 
  isi_ringkas, status, penyusun_id, klasifikasi_id, sifat, created_at, updated_at
) VALUES
  ('sk-239', 239, NULL, NULL, NULL, NULL, NULL, NULL, 
   NULL, 'draft', 'u-2', 'kl-1', 'biasa', '2026-05-20 08:00:00+00', '2026-05-20 08:00:00+00'),
  ('sk-240', 240, NULL, 'KATIMKER MINSEL', '2026-05-22', 'Pemberitahuan penyaluran bibit kelapa dalam th. I. TA 2026', NULL, NULL, 
   'Pemberitahuan penyaluran bibit kelapa dalam th. I. TA 2026', 'terkirim', 'u-2', 'kl-1', 'biasa', '2026-05-22 08:30:00+00', '2026-05-22 10:00:00+00'),
  ('sk-241', 241, NULL, 'Sekda', '2026-05-25', 'Permohonan Pembayaran Uang Muka 30% Benih Jagung', NULL, NULL, 
   'Permohonan Pembayaran Uang Muka 30% Benih Jagung', 'terkirim', 'u-7', 'kl-2', 'penting', '2026-05-25 09:00:00+00', '2026-05-25 11:30:00+00'),
  ('sk-242', 242, NULL, 'Bupati MINSEL', '2026-05-26', 'Telaah staf SK pembentukan komisi pengawasan pupuk dan pestisida', NULL, NULL, 
   'Telaah staf SK pembentukan komisi pengawasan pupuk dan pestisida', 'terkirim', 'u-4', 'kl-1', 'penting', '2026-05-26 08:00:00+00', '2026-05-26 09:00:00+00'),
  ('sk-243', 243, NULL, 'Bupati Minsel', '2026-05-26', 'Pengajuan konsep KPPP', NULL, NULL, 
   'Pengajuan konsep KPPP', 'terkirim', 'u-4', 'kl-1', 'biasa', '2026-05-26 10:00:00+00', '2026-05-26 11:00:00+00'),
  ('sk-244', 244, NULL, NULL, NULL, 'Surat Pernyataan', NULL, NULL, 
   'Surat Pernyataan', 'draft', 'u-2', 'kl-1', 'biasa', '2026-05-27 08:00:00+00', '2026-05-27 08:00:00+00'),
  ('sk-245', 245, NULL, NULL, NULL, NULL, NULL, NULL, 
   NULL, 'draft', 'u-2', 'kl-1', 'biasa', '2026-05-28 08:00:00+00', '2026-05-28 08:00:00+00'),
  ('sk-246', 246, NULL, 'Bank Sulut Go', '2026-05-29', 'Pendebetan Gaji PNS/CPNS Juni 2026', NULL, NULL, 
   'Pendebetan Gaji PNS/CPNS Juni 2026', 'terkirim', 'u-4', 'kl-1', 'biasa', '2026-05-29 10:00:00+00', '2026-05-29 11:00:00+00'),
  ('sk-247', 247, NULL, 'Bank Sulut Go', '2026-05-29', 'Pendebetan Gaji PPPK Juni 2026', NULL, NULL, 
   'Pendebetan Gaji PPPK Juni 2026', 'terkirim', 'u-4', 'kl-1', 'biasa', '2026-05-29 11:30:00+00', '2026-05-29 12:00:00+00'),
  ('sk-248', 248, NULL, NULL, NULL, NULL, NULL, NULL, 
   NULL, 'draft', 'u-2', 'kl-1', 'biasa', '2026-05-30 08:00:00+00', '2026-05-30 08:00:00+00'),
  ('sk-249', 249, NULL, NULL, NULL, NULL, NULL, NULL, 
   NULL, 'draft', 'u-2', 'kl-1', 'biasa', '2026-05-31 08:00:00+00', '2026-05-31 08:00:00+00'),
  ('sk-250', 250, NULL, 'Distanak Sulut', '2026-06-02', 'Usulan CPCL traktor crawler', NULL, NULL, 
   'Usulan CPCL traktor crawler', 'terkirim', 'u-8', 'kl-2', 'penting', '2026-06-02 11:00:00+00', '2026-06-02 13:30:00+00')
ON CONFLICT (id) DO UPDATE SET
  nomor_urut = EXCLUDED.nomor_urut,
  nomor_berkas = EXCLUDED.nomor_berkas,
  tujuan = EXCLUDED.tujuan,
  tanggal_kirim = EXCLUDED.tanggal_kirim,
  perihal = EXCLUDED.perihal,
  nomor_petunjuk = EXCLUDED.nomor_petunjuk,
  nomor_surat = EXCLUDED.nomor_surat;

-- 4. Seed Data BUKU EKSPEDISI PERSURATAN (Header: "BUKU EKSPEDISI PERSURATAN")
-- Sesuai Lampiran 1 hlm. 92 (Buku Spiral PAPERLINE)
CREATE TABLE IF NOT EXISTS buku_ekspedisi (
  id VARCHAR(50) PRIMARY KEY,
  hari_tanggal VARCHAR(50) NOT NULL,
  tanggal DATE NOT NULL,
  dokumen TEXT NOT NULL,
  tujuan_ttd_raw JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO buku_ekspedisi (id, hari_tanggal, tanggal, dokumen, tujuan_ttd_raw) VALUES
  ('exp-1', 'Senin 12/01/26', '2026-01-12', 'Skp kadis', 
   '[{"tujuan": "TUP Bupati", "penerimaParaf": "(TTD)", "tanggalTerima": "12/1-26"}]'::jsonb),
  ('exp-2', 'Selasa 13/01/26', '2026-01-13', 'Permintaan CPCL Padi lahan kering & padi kaya Gizi TA 2026', 
   '[{"tujuan": "Bid TPH", "penerimaParaf": "(Paraf: Jop)", "tanggalTerima": "13/1-26"}]'::jsonb),
  ('exp-3', 'Selasa 13/01/26', '2026-01-13', 'Permintaan Data BPS TW IV 2025', 
   '[{"tujuan": "Bid TPH", "penerimaParaf": "(Paraf: Dony)", "tanggalTerima": "13/1/26"}, {"tujuan": "Bid Peternakan", "penerimaParaf": "(Paraf)", "tanggalTerima": "13/1-26 ✓"}, {"tujuan": "Bid Perkebunan", "penerimaParaf": "(Paraf: Rini S)", "tanggalTerima": "13/1/2026"}]'::jsonb),
  ('exp-4', 'Rabu 14/01/26', '2026-01-14', 'Undangan Panen raya serentak Lapas Amurang', 
   '[{"tujuan": "Bid TPH", "penerimaParaf": "(Paraf: Mouren)", "tanggalTerima": "14/1-26"}]'::jsonb),
  ('exp-5', 'Senin 19/01/26', '2026-01-19', 'Data BPS TW IV 2025 (Peternakan Perkebunan)', 
   '[{"tujuan": "BPS", "penerimaParaf": "", "tanggalTerima": "19-01-26"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  hari_tanggal = EXCLUDED.hari_tanggal,
  tanggal = EXCLUDED.tanggal,
  dokumen = EXCLUDED.dokumen,
  tujuan_ttd_raw = EXCLUDED.tujuan_ttd_raw;

-- ==============================================================================
-- 5. TABEL COUNTER NOMOR AGENDA & ROW LOCKING (Mencegah Race Condition)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS nomor_surat_counter (
  id SERIAL PRIMARY KEY,
  tahun INT NOT NULL,
  jenis_surat VARCHAR(20) NOT NULL, -- 'surat_masuk' atau 'surat_keluar'
  counter INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uq_counter_tahun_jenis UNIQUE (tahun, jenis_surat)
);

-- Seed baseline awal tahun berjalan 2026 sesuai buku register fisik dinas
INSERT INTO nomor_surat_counter (tahun, jenis_surat, counter) VALUES
  (2026, 'surat_masuk', 89),
  (2026, 'surat_keluar', 250)
ON CONFLICT (tahun, jenis_surat) DO UPDATE SET
  counter = GREATEST(nomor_surat_counter.counter, EXCLUDED.counter);

-- ==============================================================================
-- 6. FUNGSI NOMOR AGENDA SURAT MASUK OTOMATIS (+1 Tahun Berjalan)
-- ==============================================================================
CREATE OR REPLACE FUNCTION get_next_nomor_agenda_masuk(p_tahun INT)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  v_next_counter INT;
BEGIN
  -- Pastikan baris tahun & jenis terdaftar
  INSERT INTO nomor_surat_counter (tahun, jenis_surat, counter)
  VALUES (p_tahun, 'surat_masuk', 0)
  ON CONFLICT (tahun, jenis_surat) DO NOTHING;

  -- Kunci baris dengan FOR UPDATE agar transaksi bersamaan tidak menghasilkan nomor ganda
  SELECT counter + 1 INTO v_next_counter
  FROM nomor_surat_counter
  WHERE tahun = p_tahun AND jenis_surat = 'surat_masuk'
  FOR UPDATE;

  -- Sinkronisasi awal dengan tabel fisik surat_masuk jika counter masih 1
  IF v_next_counter IS NULL OR v_next_counter = 1 THEN
    SELECT COALESCE(MAX(nomor_urut), 0) + 1 INTO v_next_counter
    FROM surat_masuk
    WHERE EXTRACT(YEAR FROM COALESCE(tanggal_terima::date, created_at::date)) = p_tahun;
  END IF;

  UPDATE nomor_surat_counter
  SET counter = v_next_counter, updated_at = NOW()
  WHERE tahun = p_tahun AND jenis_surat = 'surat_masuk';

  RETURN v_next_counter;
END;
$$;

-- ==============================================================================
-- 7. FUNGSI PENOMORAN OTOMATIS SURAT KELUAR TATA NASKAH DINAS
-- Format: [Kode Klasifikasi]/[Nomor Urut Agenda]/[Kode Instansi]/[Bulan Romawi]/[Tahun]
-- ==============================================================================
CREATE OR REPLACE FUNCTION generate_nomor_surat_keluar(
  p_surat_keluar_id VARCHAR,
  p_kode_klasifikasi VARCHAR,
  p_tahun INT,
  p_bulan_romawi VARCHAR,
  p_kode_instansi VARCHAR DEFAULT 'DISTAN-MS'
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_next_counter INT;
  v_nomor_surat TEXT;
BEGIN
  -- Pastikan baris tahun & jenis terdaftar
  INSERT INTO nomor_surat_counter (tahun, jenis_surat, counter)
  VALUES (p_tahun, 'surat_keluar', 0)
  ON CONFLICT (tahun, jenis_surat) DO NOTHING;

  -- Kunci baris counter secara atomik (ROW-LEVEL LOCKING) untuk mencegah race condition
  SELECT counter + 1 INTO v_next_counter
  FROM nomor_surat_counter
  WHERE tahun = p_tahun AND jenis_surat = 'surat_keluar'
  FOR UPDATE;

  -- Sinkronisasi awal dengan tabel fisik surat_keluar jika counter masih 1
  IF v_next_counter IS NULL OR v_next_counter = 1 THEN
    SELECT COALESCE(MAX(nomor_urut), 0) + 1 INTO v_next_counter
    FROM surat_keluar
    WHERE EXTRACT(YEAR FROM COALESCE(tanggal_kirim::date, created_at::date)) = p_tahun;
  END IF;

  UPDATE nomor_surat_counter
  SET counter = v_next_counter, updated_at = NOW()
  WHERE tahun = p_tahun AND jenis_surat = 'surat_keluar';

  -- Bangkitkan pola tata naskah dinas resmi
  v_nomor_surat := p_kode_klasifikasi || '/' || v_next_counter || '/' || p_kode_instansi || '/' || p_bulan_romawi || '/' || p_tahun;

  -- Update baris surat keluar menjadi nomor_diterbitkan
  UPDATE surat_keluar
  SET nomor_urut = v_next_counter,
      nomor_surat = v_nomor_surat,
      status = 'nomor_diterbitkan',
      updated_at = NOW()
  WHERE id = p_surat_keluar_id;

  RETURN v_nomor_surat;
END;
$$;

