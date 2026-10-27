-- =============================================================================
-- 0001_schema.sql — Skema Inti e-Surat Distan
-- Dinas Pertanian Kabupaten Minahasa Selatan
--
-- Konvensi:
--   * PK memakai `text` (bukan uuid) agar id legacy 'u-1', 'uk-1', 'sm-83' valid.
--   * Enum memakai `text` + CHECK constraint (bukan PG ENUM) agar nilai bisa
--     ditambah/diubah tanpa mengunci tabel.
--   * Instan waktu = timestamptz (UTC). Tanggal dokumen = date.
--   * Semua DDL idempotent: aman dijalankan berulang.
--
-- Jalankan di Supabase SQL Editor. Ulangi sekali lagi untuk memastikan idempoten.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- Helper pembuatan id: "<prefix>-<12 hex>" — menggantikan generateId() di client.
CREATE OR REPLACE FUNCTION public.app_new_id(p_prefix text DEFAULT '')
RETURNS text
LANGUAGE sql VOLATILE
AS $$
  SELECT p_prefix || '-' || substr(md5(random()::text || clock_timestamp()::text || gen_random_uuid()::text), 1, 12);
$$;

-- =============================================================================
-- 1. PENGATURAN INSTANSI (singleton)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.pengaturan_instansi (
  id             text PRIMARY KEY DEFAULT 'pengaturan-1',
  nama_pemda     text NOT NULL DEFAULT '',
  nama_instansi  text NOT NULL DEFAULT '',
  alamat         text NOT NULL DEFAULT '',
  telp_fax       text NOT NULL DEFAULT '',
  logo_path      text,
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pengaturan_instansi_singleton CHECK (id = 'pengaturan-1')
);

-- =============================================================================
-- 2. UNIT KERJA
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.unit_kerja (
  id             text PRIMARY KEY,
  kode           text NOT NULL,
  nama           text NOT NULL,
  jenis          text NOT NULL CHECK (jenis IN ('sekretariat', 'bidang')),
  label_lembar   text,
  urutan_lembar  int,
  aktif          boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_unit_kerja_kode UNIQUE (kode)
);

-- =============================================================================
-- 3. USERS  (id domain = text; auth_id = uuid dari Supabase Auth)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.users (
  id                 text PRIMARY KEY,
  auth_id            uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  nama               text NOT NULL,
  email              citext NOT NULL UNIQUE,
  role               text NOT NULL CHECK (role IN
                       ('admin','petugas_surat','sekretaris','kepala_dinas','kepala_bidang','staf_pelaksana')),
  unit_kerja_id      text REFERENCES public.unit_kerja(id) ON DELETE SET NULL,
  nip                text,
  jabatan            text,
  url_tanda_tangan  text,   -- path object di bucket `tanda-tangan`
  aktif              boolean NOT NULL DEFAULT true,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_users_kabid_wajib_bidang
    CHECK (role <> 'kepala_bidang' OR unit_kerja_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS ix_users_role ON public.users(role) WHERE aktif;
CREATE INDEX IF NOT EXISTS ix_users_unit ON public.users(unit_kerja_id);

-- =============================================================================
-- 4. KLASIFIKASI SURAT
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.klasifikasi_surat (
  id             text PRIMARY KEY,
  kode           text NOT NULL UNIQUE,
  nama           text NOT NULL,
  uraian         text,
  unit_kerja_id  text REFERENCES public.unit_kerja(id) ON DELETE SET NULL,
  aktif          boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- 5. JENIS SURAT
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.jenis_surat (
  id           text PRIMARY KEY,
  nama         text NOT NULL,
  keterangan   text NOT NULL DEFAULT '',
  utama        boolean NOT NULL DEFAULT false,
  aktif        boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- 6. DATA MASTER (sifat_surat, jenis_instruksi, instansi_asal)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.data_master (
  id           text PRIMARY KEY,
  kategori     text NOT NULL CHECK (kategori IN ('sifat_surat','jenis_instruksi','instansi_asal')),
  kode         text NOT NULL,
  label        text NOT NULL,
  keterangan   text,
  aktif        boolean NOT NULL DEFAULT true,
  urutan       int NOT NULL DEFAULT 0,
  meta         jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_data_master UNIQUE (kategori, kode)
);
CREATE INDEX IF NOT EXISTS ix_data_master_kategori ON public.data_master(kategori, urutan);

-- =============================================================================
-- 7. SURAT MASUK
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.surat_masuk (
  id                  text PRIMARY KEY DEFAULT public.app_new_id('sm'),
  nomor_agenda        text NOT NULL,
  nomor_urut          int,
  nomor_berkas        text,
  nomor_petunjuk      text,        -- format 'd/M/yy' — bukan tanggal, tetap text
  nomor_paket         text,
  tanggal_terima      date NOT NULL,
  asal_surat          text NOT NULL,
  nomor_surat_asal    text NOT NULL,
  tanggal_surat_asal  date,
  perihal             text NOT NULL,
  klasifikasi_id      text NOT NULL REFERENCES public.klasifikasi_surat(id),
  jenis_surat_id      text REFERENCES public.jenis_surat(id),
  sifat               text NOT NULL DEFAULT 'biasa'
                        CHECK (sifat IN ('biasa','umum','penting','segera','rahasia')),
  batas_waktu_surat   date,
  berkas_path         text NOT NULL DEFAULT '',  -- path object di bucket `berkas-surat`
  status              text NOT NULL DEFAULT 'diagenda' CHECK (status IN
                        ('diagenda','menunggu_disposisi','didisposisikan','diterima_bidang',
                         'diteruskan_ke_staf','menunggu_pemeriksaan','selesai')),
  pencatat_id         text NOT NULL REFERENCES public.users(id),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_surat_masuk_agenda UNIQUE (nomor_agenda),
  CONSTRAINT uq_surat_masuk_urut UNIQUE (nomor_urut)
);
CREATE INDEX IF NOT EXISTS ix_sm_status   ON public.surat_masuk(status);
CREATE INDEX IF NOT EXISTS ix_sm_pencatat ON public.surat_masuk(pencatat_id);
CREATE INDEX IF NOT EXISTS ix_sm_tgl      ON public.surat_masuk(tanggal_terima DESC);

-- =============================================================================
-- 8. DISPOSISI
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.disposisi (
  id                          text PRIMARY KEY DEFAULT public.app_new_id('disp'),
  surat_masuk_id              text NOT NULL REFERENCES public.surat_masuk(id) ON DELETE CASCADE,
  dibuat_oleh                 text REFERENCES public.users(id) ON DELETE SET NULL,
  instruksi                   text NOT NULL DEFAULT 'lainnya',
  instruksi_lainnya           text,
  instruksi_list              jsonb NOT NULL DEFAULT '[]'::jsonb,
  catatan_kepala              text,
  catatan_kadin               text,
  catatan_koordinasi           text,
  catatan_koordinasi_sekdin    text,
  tenggat                     date NOT NULL,
  status                      text NOT NULL DEFAULT 'menunggu_disposisi' CHECK (status IN
                                ('menunggu_disposisi','didisposisikan','diterima_bidang',
                                 'diteruskan_ke_staf','menunggu_pemeriksaan','selesai','dikembalikan')),
  keputusan_kd                text CHECK (keputusan_kd IN ('disposisi','tidak_perlu')),
  lintas_bidang               boolean NOT NULL DEFAULT false,
  sifat                       text CHECK (sifat IN ('biasa','umum','penting','segera','rahasia')),
  paraf_kd_oleh               text,   -- nama Kepala Dinas (dicerminkan types.ts)
  paraf_kd_at                 timestamptz,
  paraf_kd_ip                 text,
  paraf_kepala_waktu          timestamptz,  -- alias lama types.ts
  paraf_kadin_oleh            text,
  paraf_kadin_waktu           timestamptz,
  ttd_nama_snapshot           text,
  ttd_nip_snapshot            text,
  ttd_jabatan_snapshot        text,
  snapshot_surat              jsonb,
  perlu_surat_jawaban         boolean NOT NULL DEFAULT false,
  reminder_sent_at            timestamptz,
  overdue_sent_at             timestamptz,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_disp_surat   ON public.disposisi(surat_masuk_id);
CREATE INDEX IF NOT EXISTS ix_disp_status  ON public.disposisi(status);
CREATE INDEX IF NOT EXISTS ix_disp_tenggat ON public.disposisi(tenggat) WHERE status <> 'selesai';

-- =============================================================================
-- 9. DISPOSISI BIDANG TUJUAN (tabel anak — sebelumnya array `bidangTujuan`)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.disposisi_bidang_tujuan (
  id                         text PRIMARY KEY DEFAULT public.app_new_id('dbt'),
  disposisi_id               text NOT NULL REFERENCES public.disposisi(id) ON DELETE CASCADE,
  tipe                       text NOT NULL CHECK (tipe IN ('sekretaris','bidang')),
  unit_kerja_id              text NOT NULL REFERENCES public.unit_kerja(id),
  urutan                     int NOT NULL DEFAULT 0,
  kepala_bidang_id           text REFERENCES public.users(id) ON DELETE SET NULL,
  status_terima              text NOT NULL DEFAULT 'belum' CHECK (status_terima IN ('belum','diterima')),
  waktu_terima               timestamptz,
  nama_penerima_snapshot     text,
  paraf_penerimaan_snapshot  text,
  waktu_paraf_penerimaan     timestamptz,
  status_proses              text CHECK (status_proses IN
                              ('menunggu','diterima_bidang','diteruskan_staf',
                               'tindak_langsung','menunggu_pemeriksaan','selesai')),
  diteruskan_ke              text REFERENCES public.users(id) ON DELETE SET NULL,
  catatan_penugasan          text,
  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_dbt UNIQUE (disposisi_id, unit_kerja_id)
);
CREATE INDEX IF NOT EXISTS ix_dbt_unit ON public.disposisi_bidang_tujuan(unit_kerja_id);
CREATE INDEX IF NOT EXISTS ix_dbt_disp ON public.disposisi_bidang_tujuan(disposisi_id);

-- =============================================================================
-- 10. PENUGASAN STAF
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.penugasan_staf (
  id                  text PRIMARY KEY DEFAULT public.app_new_id('ps'),
  disposisi_id        text NOT NULL REFERENCES public.disposisi(id) ON DELETE CASCADE,
  staf_id             text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  kepala_bidang_id    text NOT NULL REFERENCES public.users(id),
  catatan_penugasan   text NOT NULL DEFAULT '',
  catatan_progres     text,
  status              text NOT NULL DEFAULT 'ditugaskan' CHECK (status IN
                        ('ditugaskan','dikerjakan','menunggu_pemeriksaan','selesai',
                         'perlu_perbaikan','dikembalikan')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_ps_staf ON public.penugasan_staf(staf_id, status);
CREATE INDEX IF NOT EXISTS ix_ps_disp ON public.penugasan_staf(disposisi_id);

-- =============================================================================
-- 11. TINDAK LANJUT
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.tindak_lanjut (
  id                    text PRIMARY KEY DEFAULT public.app_new_id('tl'),
  disposisi_id          text NOT NULL REFERENCES public.disposisi(id) ON DELETE CASCADE,
  penugasan_staf_id     text REFERENCES public.penugasan_staf(id) ON DELETE SET NULL,
  pelaku_id             text NOT NULL REFERENCES public.users(id),
  uraian_hasil          text NOT NULL,
  berkas_path           text,
  status                text NOT NULL DEFAULT 'dilaporkan' CHECK (status IN
                          ('dilaporkan','disetujui','dikembalikan','perlu_perbaikan')),
  catatan_pengembalian  text,
  nomor_revisi          int NOT NULL DEFAULT 1,
  created_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_tl_disp ON public.tindak_lanjut(disposisi_id);

-- =============================================================================
-- 12. SURAT KELUAR
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.surat_keluar (
  id                      text PRIMARY KEY DEFAULT public.app_new_id('sk'),
  nomor_urut              int,
  nomor_berkas            text,
  nomor_petunjuk          text,
  nomor_paket             text,
  sifat                   text CHECK (sifat IN ('biasa','umum','penting','segera','rahasia')),
  nomor_surat             text,
  perihal                text NOT NULL,
  tujuan                  text NOT NULL DEFAULT '',
  klasifikasi_id          text NOT NULL REFERENCES public.klasifikasi_surat(id),
  jenis_surat_id          text REFERENCES public.jenis_surat(id),
  isi_ringkas             text NOT NULL DEFAULT '',
  status                  text NOT NULL DEFAULT 'draf' CHECK (status IN
                            ('draf','menunggu_paraf','perlu_revisi','menunggu_ttd',
                             'ditandatangani','nomor_diterbitkan','terkirim')),
  penyusun_id             text NOT NULL REFERENCES public.users(id),
  tanggal_kirim           date,
  berkas_path             text,
  bukti_terima_tanggal   date,
  bukti_terima_nama      text,
  surat_masuk_asal_id     text REFERENCES public.surat_masuk(id) ON DELETE SET NULL,
  ref_surat_masuk_id      text REFERENCES public.surat_masuk(id) ON DELETE SET NULL,
  ttd_image_path          text,
  ttd_nama_snapshot       text,
  ttd_nip_snapshot        text,
  ttd_waktu_snapshot      timestamptz,
  paraf_image_path        text,
  paraf_nama_snapshot     text,
  paraf_waktu_snapshot    timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_sk_nomor UNIQUE (nomor_surat)
);
CREATE INDEX IF NOT EXISTS ix_sk_status    ON public.surat_keluar(status);
CREATE INDEX IF NOT EXISTS ix_sk_penyusun ON public.surat_keluar(penyusun_id);

-- =============================================================================
-- 13. PERSETUJUAN SURAT KELUAR
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.persetujuan_surat_keluar (
  id                        text PRIMARY KEY DEFAULT public.app_new_id('psk'),
  surat_keluar_id           text NOT NULL REFERENCES public.surat_keluar(id) ON DELETE CASCADE,
  jenis                     text NOT NULL CHECK (jenis IN ('paraf_koordinasi','tanda_tangan','dikembalikan')),
  pelaku_id                 text NOT NULL REFERENCES public.users(id),
  catatan                   text,
  waktu                     timestamptz NOT NULL DEFAULT now(),
  url_tanda_tangan_snapshot text,
  nama_pelaku_snapshot      text,
  nip_pelaku_snapshot       text,
  jabatan_pelaku_snapshot   text
);
CREATE INDEX IF NOT EXISTS ix_psk_sk ON public.persetujuan_surat_keluar(surat_keluar_id);

-- =============================================================================
-- 14. ARSIP DIGITAL
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.arsip_digital (
  id                  text PRIMARY KEY DEFAULT public.app_new_id('ars'),
  surat_masuk_id      text REFERENCES public.surat_masuk(id) ON DELETE CASCADE,
  surat_keluar_id     text REFERENCES public.surat_keluar(id) ON DELETE CASCADE,
  jenis_surat         text NOT NULL CHECK (jenis_surat IN ('masuk','keluar')),
  kode_arsip          text NOT NULL UNIQUE,
  berkas_path         text,
  perihal             text NOT NULL DEFAULT '',
  nomor_surat         text NOT NULL DEFAULT '',
  tahun               int NOT NULL,
  klasifikasi_id      text REFERENCES public.klasifikasi_surat(id),
  jenis_surat_id      text REFERENCES public.jenis_surat(id),
  status_arsip        text CHECK (status_arsip IN
                          ('disposisi','selesai','terkirim','menunggu_verifikasi','diarsipkan')),
  laporan_hasil       text,
  berkas_laporan_path text,
  tanggal_selesai     timestamptz,
  surat_balasan_id    text REFERENCES public.surat_keluar(id) ON DELETE SET NULL,
  surat_balasan_nomor text,
  surat_balasan_perihal text,
  is_surat_balasan    boolean NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_arsip_sumber CHECK (
    (jenis_surat = 'masuk'  AND surat_masuk_id IS NOT NULL AND surat_keluar_id IS NULL) OR
    (jenis_surat = 'keluar' AND surat_keluar_id IS NOT NULL AND surat_masuk_id IS NULL)
  )
);
CREATE INDEX IF NOT EXISTS ix_arsip_sm    ON public.arsip_digital(surat_masuk_id);
CREATE INDEX IF NOT EXISTS ix_arsip_sk    ON public.arsip_digital(surat_keluar_id);
CREATE INDEX IF NOT EXISTS ix_arsip_tahun ON public.arsip_digital(tahun);

-- =============================================================================
-- 15. NOTIFIKASI
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.notifikasi (
  id           text PRIMARY KEY DEFAULT public.app_new_id('ntf'),
  user_id      text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  judul        text NOT NULL,
  pesan        text NOT NULL,
  tautan_url   text,
  dibaca       boolean NOT NULL DEFAULT false,
  tingkat      text CHECK (tingkat IN ('info','peringatan','bahaya')),
  is_rahasia   boolean NOT NULL DEFAULT false,
  kanal        text CHECK (kanal IN ('panel','email','email (simulasi)')),
  status_kirim text CHECK (status_kirim IN ('terkirim','gagal','simulasi')),
  pesan_galat  text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_ntf_user ON public.notifikasi(user_id, dibaca, created_at DESC);

-- =============================================================================
-- 16. RIWAYAT STATUS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.riwayat_status (
  id             text PRIMARY KEY DEFAULT public.app_new_id('rs'),
  surat_masuk_id text REFERENCES public.surat_masuk(id) ON DELETE CASCADE,
  surat_keluar_id text REFERENCES public.surat_keluar(id) ON DELETE CASCADE,
  status         text NOT NULL,
  pelaku_id      text NOT NULL REFERENCES public.users(id),
  catatan        text,
  waktu          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_riwayat_target CHECK (num_nonnulls(surat_masuk_id, surat_keluar_id) = 1)
);
CREATE INDEX IF NOT EXISTS ix_riwayat_sm ON public.riwayat_status(surat_masuk_id, waktu DESC);
CREATE INDEX IF NOT EXISTS ix_riwayat_sk ON public.riwayat_status(surat_keluar_id, waktu DESC);

-- =============================================================================
-- 17. LOG AKTIVITAS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.log_aktivitas (
  id         text PRIMARY KEY DEFAULT public.app_new_id('log'),
  user_id    text REFERENCES public.users(id) ON DELETE SET NULL,
  aksi       text NOT NULL,
  detail     text NOT NULL DEFAULT '',
  waktu      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_log_waktu ON public.log_aktivitas(waktu DESC);
CREATE INDEX IF NOT EXISTS ix_log_user  ON public.log_aktivitas(user_id);

-- =============================================================================
-- 18. NOMOR SURAT COUNTER (PK komposit)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.nomor_surat_counter (
  tahun       int  NOT NULL,
  jenis_surat text NOT NULL CHECK (jenis_surat IN ('surat_masuk','surat_keluar')),
  counter     int  NOT NULL DEFAULT 0 CHECK (counter >= 0),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tahun, jenis_surat)
);

-- =============================================================================
-- 19. BUKU EKSPEDISI (+ tabel anak tujuan)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.buku_ekspedisi (
  id            text PRIMARY KEY DEFAULT public.app_new_id('exp'),
  hari_tanggal  text NOT NULL,
  tanggal       date NOT NULL,
  dokumen       text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.buku_ekspedisi_tujuan (
  id               text PRIMARY KEY DEFAULT public.app_new_id('ebt'),
  ekspedisi_id     text NOT NULL REFERENCES public.buku_ekspedisi(id) ON DELETE CASCADE,
  urutan           int NOT NULL DEFAULT 0,
  tujuan           text NOT NULL,
  penerima_paraf   text,
  tanggal_terima   date,
  catatan          text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_ebt UNIQUE (ekspedisi_id, urutan)
);

-- =============================================================================
-- 20. TABEL PENDUKUNG
-- =============================================================================

-- Log reminder/overdue — anti-spam lintas perangkat (pengganti state.reminderSentAt).
CREATE TABLE IF NOT EXISTS public.reminder_log (
  id              text PRIMARY KEY DEFAULT public.app_new_id('rl'),
  disposisi_id    text NOT NULL REFERENCES public.disposisi(id) ON DELETE CASCADE,
  jenis           text NOT NULL CHECK (jenis IN ('reminder','overdue')),
  target_user_id  text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  terkirim_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_reminder_anti_spam
  ON public.reminder_log(disposisi_id, jenis, target_user_id, terkirim_at DESC);

-- Jejak impor state lama (audit).
CREATE TABLE IF NOT EXISTS public.import_legacy (
  id           text PRIMARY KEY DEFAULT public.app_new_id('imp'),
  sumber       text NOT NULL,
  nama_tabel   text NOT NULL,
  id_legacy    text NOT NULL,
  payload      jsonb NOT NULL DEFAULT '{}'::jsonb,
  imported_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_import UNIQUE (sumber, nama_tabel, id_legacy)
);

-- =============================================================================
-- VIEW — status per bidang (pengganti field jsonb `statusPerBidang`)
-- =============================================================================
CREATE OR REPLACE VIEW public.app_v_status_per_bidang AS
SELECT d.id                      AS disposisi_id,
       t.unit_kerja_id           AS unit_kerja_id,
       COALESCE(t.status_proses,'menunggu') AS status,
       t.nama_penerima_snapshot  AS diterima_oleh,
       t.waktu_terima            AS diterima_waktu,
       t.diteruskan_ke           AS diteruskan_ke,
       t.catatan_penugasan       AS catatan_penugasan,
       tl.uraian_hasil           AS uraian_hasil
FROM public.disposisi d
JOIN public.disposisi_bidang_tujuan t ON t.disposisi_id = d.id
LEFT JOIN LATERAL (
  SELECT tl.uraian_hasil
  FROM public.tindak_lanjut tl
  WHERE tl.disposisi_id = d.id
  ORDER BY tl.created_at DESC
  LIMIT 1
) tl ON true;

-- =============================================================================
-- TRIGGER — updated_at otomatis
-- =============================================================================
CREATE OR REPLACE FUNCTION public.app_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['unit_kerja','users','klasifikasi_surat','jenis_surat','data_master',
                           'surat_masuk','disposisi','disposisi_bidang_tujuan','penugasan_staf',
                           'surat_keluar','arsip_digital']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_touch_updated_at ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_touch_updated_at BEFORE UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.app_touch_updated_at()', t);
  END LOOP;
END $$;
