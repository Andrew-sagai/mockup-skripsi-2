-- =============================================================================
-- 0005_seed_contoh.sql — Data contoh hasil pemindahan skrip seed lama
--
-- Sumber: `supabase_seed_laporan.sql` (versi lama, sudah dihapus) yang berisi
-- data nyata dari Buku Register KIKY (Surat Masuk 83-89), Buku Register TiTi
-- (Surat Keluar 239-250), dan Buku Ekspedisi PAPERLINE.
--
-- Idempotent (ON CONFLICT DO UPDATE) — aman dijalankan berulang.
-- Catatan: berkas PDF tidak disertakan; kolom `berkas_path` dibiarkan kosong
-- sehingga aplikasi memakai "Format Acuan Dinas" sebagai pratinjau.
-- =============================================================================

-- ── Surat masuk ─────────────────────────────────────────────────────────────
INSERT INTO public.surat_masuk (
  id, nomor_agenda, nomor_urut, nomor_berkas, asal_surat, tanggal_surat_asal,
  nomor_surat_asal, perihal, tanggal_terima, nomor_petunjuk, nomor_paket,
  sifat, status, pencatat_id, klasifikasi_id, berkas_path, created_at, updated_at
) VALUES
 ('sm-83','83',83,NULL,'BPKP','2026-03-31','SP-201/PW18.1/2026',
  'Laporan Hasil evaluasi tata kelola Pupuk bersubsidi TW I thn 2025','2026-04-07','7/4/26',NULL,
  'biasa','didisposisikan','u-2','kl-1','','2026-04-07T08:00:00Z','2026-04-07T09:00:00Z'),
 ('sm-84','84',84,NULL,'Bps kab. Minsel','2026-04-06','B-160/71050/KS.000/2026',
  'Permintaan Data','2026-04-08','8/4/26',NULL,
  'biasa','didisposisikan','u-2','kl-1','','2026-04-08T08:30:00Z','2026-04-08T09:00:00Z'),
 ('sm-85','85',85,NULL,'BPKP Prov. Sulut','2026-04-06','PE.09.02/S-327/PW18/3/2026',
  'Penilaian Maturitas Penyelenggaraan Sistem Pengendalian Intern Pemerintah Terintegrasi Pada Pemda se-Prov Sulut 2026','2026-04-08','8/4/26',NULL,
  'penting','didisposisikan','u-2','kl-1','','2026-04-08T09:00:00Z','2026-04-08T10:00:00Z'),
 ('sm-86','86',86,NULL,'Inspektorat','2026-04-08','537/26/Sekr-Insp',
  'Rapat koordinasi Pembahasan Penilaian Maturitas SPIP th 2026','2026-04-08','8/4/26',NULL,
  'penting','didisposisikan','u-2','kl-1','','2026-04-08T09:30:00Z','2026-04-08T10:30:00Z'),
 ('sm-87','87',87,NULL,'Pemprov Distan & Peternakan Daerah','2026-01-12','500.6.1/93.26/Sekr.Bid.TPH',
  'Permohonan Alsin Pasca Panen','2026-04-08','8/4/26',NULL,
  'biasa','didisposisikan','u-2','kl-2','','2026-04-08T10:00:00Z','2026-04-08T11:00:00Z'),
 ('sm-88','88',88,NULL,'Dirjen Prasarana & Sarana Pertanian','2026-04-08','B-64/SR.430/B.3/04/2026',
  'Undangan Verifikasi Daring CPCL Vertical Dryer T.A. 2026','2026-04-08','8/4/26',NULL,
  'segera','didisposisikan','u-2','kl-2','','2026-04-08T10:30:00Z','2026-04-08T11:30:00Z'),
 ('sm-89','89',89,NULL,'Sekda B. Org','2026-04-17','630/26/Sekr-Org',
  'Tindak lanjut Penunjukan Unit Pembina Teknis Jabatan Fungsional di lingkungan Kab. Minsel','2026-04-20','20/4/26',NULL,
  'penting','didisposisikan','u-2','kl-1','','2026-04-20T08:00:00Z','2026-04-20T09:00:00Z')
ON CONFLICT (id) DO UPDATE SET
  nomor_agenda = EXCLUDED.nomor_agenda,
  nomor_urut = EXCLUDED.nomor_urut,
  nomor_berkas = EXCLUDED.nomor_berkas,
  asal_surat = EXCLUDED.asal_surat,
  tanggal_surat_asal = EXCLUDED.tanggal_surat_asal,
  nomor_surat_asal = EXCLUDED.nomor_surat_asal,
  perihal = EXCLUDED.perihal,
  tanggal_terima = EXCLUDED.tanggal_terima,
  nomor_petunjuk = EXCLUDED.nomor_petunjuk,
  nomor_paket = EXCLUDED.nomor_paket,
  sifat = EXCLUDED.sifat,
  status = EXCLUDED.status,
  updated_at = now();

-- ── Surat keluar ────────────────────────────────────────────────────────────
-- Catatan: status 'draft' pada skrip lama menjadi 'draf' pada skema baru.
INSERT INTO public.surat_keluar (
  id, nomor_urut, nomor_berkas, tujuan, tanggal_kirim, perihal, nomor_petunjuk,
  nomor_surat, isi_ringkas, status, penyusun_id, klasifikasi_id, sifat,
  created_at, updated_at
) VALUES
 ('sk-239',239,NULL,'',NULL,'',NULL,NULL,'','draf','u-2','kl-1','biasa',
  '2026-05-20T08:00:00Z','2026-05-20T08:00:00Z'),
 ('sk-240',240,NULL,'KATIMKER MINSEL','2026-05-22','Pemberitahuan الباحثون Wilayah MINSEL',NULL,NULL,
  'Pemberitahuan Peneliti Wilayah MINSEL','terkirim','u-2','kl-1','biasa',
  '2026-05-22T08:30:00Z','2026-05-22T10:00:00Z'),
 ('sk-241',241,NULL,'Sekda','2026-05-25','Permohonan Pembayaran Uang Muka 30% Benih Jagung',NULL,NULL,
  'Permohonan Pembayaran Uang Muka 30% Benih Jagung','terkirim','u-7','kl-2','penting',
  '2026-05-25T09:00:00Z','2026-05-25T11:30:00Z'),
 ('sk-242',242,NULL,'Bupati MINSEL','2026-05-26','Telaah staf SK pembentukan komisi pengawasan pupuk dan pestisida',NULL,NULL,
  'Telaah staf SK pembentukan komisi pengawasan pupuk dan pestisida','terkirim','u-4','kl-1','penting',
  '2026-05-26T08:00:00Z','2026-05-26T09:00:00Z'),
 ('sk-243',243,NULL,'ISD Minsel','2026-05-26','Pengajuan konsep KPPP',NULL,NULL,
  'Pengajuan konsep KPPP','terkirim','u-4','kl-1','biasa',
  '2026-05-26T10:00:00Z','2026-05-26T11:00:00Z'),
 ('sk-244',244,NULL,'',NULL,'Surat Pernyataan',NULL,NULL,'Surat Pernyataan','draf','u-2','kl-1','biasa',
  '2026-05-27T08:00:00Z','2026-05-27T08:00:00Z'),
 ('sk-245',245,NULL,'',NULL,'',NULL,NULL,'','draf','u-2','kl-1','biasa',
  '2026-05-28T08:00:00Z','2026-05-28T08:00:00Z'),
 ('sk-246',246,NULL,'Bank Sulut Go','2026-05-29','Pendebetan Gaji PNS/CPNS Juni 2026',NULL,NULL,
  'Pendebetan Gaji PNS/CPNS Juni 2026','terkirim','u-4','kl-1','biasa',
  '2026-05-29T10:00:00Z','2026-05-29T11:00:00Z'),
 ('sk-247',247,NULL,'Bank Sulut Go','2026-05-29','Pendebetan Gaji PPPK Juni 2026',NULL,NULL,
  'Pendebetan Gaji PPPK Juni 2026','terkirim','u-4','kl-1','biasa',
  '2026-05-29T11:30:00Z','2026-05-29T12:00:00Z'),
 ('sk-248',248,NULL,'',NULL,'',NULL,NULL,'','draf','u-2','kl-1','biasa',
  '2026-05-30T08:00:00Z','2026-05-30T08:00:00Z'),
 ('sk-249',249,NULL,'',NULL,'',NULL,NULL,'','draf','u-2','kl-1','biasa',
  '2026-05-31T08:00:00Z','2026-05-31T08:00:00Z'),
 ('sk-250',250,NULL,'Distanak Sulut','2026-06-02','Usulan CPCL traktor crawler',NULL,NULL,
  'Usulan CPCL traktor crawler','terkirim','u-8','kl-2','penting',
  '2026-06-02T11:00:00Z','2026-06-02T13:30:00Z')
ON CONFLICT (id) DO UPDATE SET
  nomor_urut = EXCLUDED.nomor_urut,
  nomor_berkas = EXCLUDED.nomor_berkas,
  tujuan = EXCLUDED.tujuan,
  tanggal_kirim = EXCLUDED.tanggal_kirim,
  perihal = EXCLUDED.perihal,
  nomor_petunjuk = EXCLUDED.nomor_petunjuk,
  nomor_surat = EXCLUDED.nomor_surat,
  isi_ringkas = EXCLUDED.isi_ringkas,
  status = EXCLUDED.status,
  sifat = EXCLUDED.sifat,
  updated_at = now();

-- ── Buku ekspedisi ──────────────────────────────────────────────────────────
-- `tujuan_ttd_raw` pada skrip lama dipecah menjadi baris tabel anak.
-- Teks tanggal terima yang tidak bisa diparse (mis. '12/1-26') disimpan pada
-- kolom `catatan` supaya informasi aslinya tidak hilang.
INSERT INTO public.buku_ekspedisi (id, hari_tanggal, tanggal, dokumen) VALUES
 ('exp-1','Senin 12/01/26','2026-01-12','Skp kadis'),
 ('exp-2','Selasa 13/01/26','2026-01-13','Permintaan CPCL Padi lahan kering & padi kaya Gizi TA 2026'),
 ('exp-3','Selasa 13/01/26','2026-01-13','Permintaan Data BPS TW IV 2025'),
 ('exp-4','Rabu 14/01/26','2026-01-14','Undangan Panen raya serentak Lapas Amurang'),
 ('exp-5','Senin 19/01/26','2026-01-19','Data BPS TW IV 2025 (Peternakan Perkebunan)')
ON CONFLICT (id) DO UPDATE SET
  hari_tanggal = EXCLUDED.hari_tanggal,
  tanggal = EXCLUDED.tanggal,
  dokumen = EXCLUDED.dokumen;

DELETE FROM public.buku_ekspedisi_tujuan WHERE ekspedisi_id IN ('exp-1','exp-2','exp-3','exp-4','exp-5');

INSERT INTO public.buku_ekspedisi_tujuan (id, ekspedisi_id, urutan, tujuan, penerima_paraf, tanggal_terima, catatan) VALUES
 ('ebt-1','exp-1',0,'TUP Bupati','(TTD)',NULL,'12/1-26'),
 ('ebt-2','exp-2',0,'Bid TPH','(Paraf: Jop)',NULL,'13/1-26'),
 ('ebt-3','exp-3',0,'Bid TPH','(Paraf: Dony)',NULL,'13/1-26'),
 ('ebt-4','exp-3',1,'Bid Peternakan','(Paraf)',NULL,'13/1-26'),
 ('ebt-5','exp-3',2,'Bid Perkebunan','(Paraf: Rini S)','2026-01-13',NULL),
 ('ebt-6','exp-4',0,'Bid TPH','(Paraf: Mouren)',NULL,'14/1-26'),
 ('ebt-7','exp-5',0,'BPS','','2026-01-19',NULL)
ON CONFLICT (id) DO UPDATE SET
  ekspedisi_id = EXCLUDED.ekspedisi_id,
  urutan = EXCLUDED.urutan,
  tujuan = EXCLUDED.tujuan,
  penerima_paraf = EXCLUDED.penerima_paraf,
  tanggal_terima = EXCLUDED.tanggal_terima,
  catatan = EXCLUDED.catatan;

-- ── Counter nomor ───────────────────────────────────────────────────────────
-- Baseline sesuai buku register fisik dinas.
INSERT INTO public.nomor_surat_counter (tahun, jenis_surat, counter) VALUES
  (2026, 'surat_masuk', 89),
  (2026, 'surat_keluar', 250)
ON CONFLICT (tahun, jenis_surat) DO UPDATE SET
  counter = GREATEST(public.nomor_surat_counter.counter, EXCLUDED.counter),
  updated_at = now();
