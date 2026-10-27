-- =============================================================================
-- 0002_rls.sql — Row Level Security (sumber kebenaran RBAC tunggal)
--
-- SETELAH migrasi ini, `middleware.ts`/`proxy.ts` dan `rbac.ts` HANYA untuk UX
-- (sembunyikan menu / redirect). Penentu akses data yang sesungguhnya adalah
-- RLS di bawah ini. Admin yang memalsukan cookie `userRole` tetap tidak bisa
-- membaca baris yang tidak diizinkan.
--
-- Aturan visibilitas disalin persis dari `src/lib/store.tsx` (fungsi
-- getScopedDisposisi / getScopedSuratMasuk / getSuratKeluarByRole / getScopedArsip)
-- supaya perilaku aplikasi tidak berubah saat migrasi.
--
-- Semua fungsi helper: SECURITY DEFINER + SET search_path, dimiliki postgres,
-- sehingga TIDAK tersusun rekursif oleh RLS.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Helper identitas
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.app_caller_id()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT u.id FROM public.users u
  WHERE u.auth_id = auth.uid() AND u.aktif = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.app_caller_role()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT u.role FROM public.users u
  WHERE u.auth_id = auth.uid() AND u.aktif = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.app_caller_unit()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT u.unit_kerja_id FROM public.users u
  WHERE u.auth_id = auth.uid() AND u.aktif = true
  LIMIT 1;
$$;

-- Peran yang punya akses data penuh (kecuali disposisi untuk admin).
CREATE OR REPLACE FUNCTION public.app_is_internal()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(public.app_caller_role(), '') IN ('petugas_surat','kepala_dinas');
$$;

-- -----------------------------------------------------------------------------
-- 1. Fungsi visibilitas
-- -----------------------------------------------------------------------------

-- Surat masuk.
--   petugas_surat / kepala_dinas / admin : penuh
--   sekretariat  : semua, kecuali sifat 'rahasia' tanpa disposisi ke unitnya
--   kepala_bidang: hanya yang ada disposisinya ke unit kerjanya
--   staf_pelaksana: hanya lewat penugasannya
CREATE OR REPLACE FUNCTION public.app_surat_masuk_visible(p_id text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN public.app_caller_id() IS NULL THEN false
    WHEN public.app_caller_role() IN ('petugas_surat','kepala_dinas','admin') THEN true
    WHEN public.app_caller_role() = 'sekretaris' THEN (
      COALESCE((SELECT s.sifat FROM public.surat_masuk s WHERE s.id = p_id), '') <> 'rahasia'
      OR EXISTS (
        SELECT 1 FROM public.disposisi d
        JOIN public.disposisi_bidang_tujuan t ON t.disposisi_id = d.id
        WHERE d.surat_masuk_id = p_id AND t.unit_kerja_id = public.app_caller_unit()
      )
    )
    WHEN public.app_caller_role() = 'kepala_bidang' THEN EXISTS (
      SELECT 1 FROM public.disposisi d
      JOIN public.disposisi_bidang_tujuan t ON t.disposisi_id = d.id
      WHERE d.surat_masuk_id = p_id AND t.unit_kerja_id = public.app_caller_unit()
    )
    WHEN public.app_caller_role() = 'staf_pelaksana' THEN EXISTS (
      SELECT 1 FROM public.penugasan_staf ps
      JOIN public.disposisi d ON d.id = ps.disposisi_id
      WHERE ps.staf_id = public.app_caller_id() AND d.surat_masuk_id = p_id
    )
    ELSE false
  END;
$$;

-- Disposisi.
--   admin  : TIDAK BOLEH (Bab proposal 14a/15a — admin tidak boleh membaca pemisahan data)
--   sekretariat : lintas bidang / instruksi koordinasi / tujuan ke unitnya
--   kepala_bidang: hanya disposisi ke unit kerjanya
--   staf_pelaksana: hanya yang ditugaskan kepadanya
CREATE OR REPLACE FUNCTION public.app_disposisi_visible(p_id text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN public.app_caller_id() IS NULL THEN false
    WHEN public.app_caller_role() = 'admin' THEN false
    WHEN public.app_caller_role() IN ('petugas_surat','kepala_dinas') THEN true
    WHEN public.app_caller_role() = 'sekretaris' THEN EXISTS (
      SELECT 1 FROM public.disposisi d
      WHERE d.id = p_id AND (
        (SELECT count(*) FROM public.disposisi_bidang_tujuan t WHERE t.disposisi_id = d.id) > 1
        OR d.instruksi = 'koordinasi_konfirmasi'
        OR EXISTS (
          SELECT 1 FROM public.disposisi_bidang_tujuan t
          WHERE t.disposisi_id = d.id AND t.unit_kerja_id = public.app_caller_unit()
        )
      )
    )
    WHEN public.app_caller_role() = 'kepala_bidang' THEN EXISTS (
      SELECT 1 FROM public.disposisi_bidang_tujuan t
      WHERE t.disposisi_id = p_id AND t.unit_kerja_id = public.app_caller_unit()
    )
    WHEN public.app_caller_role() = 'staf_pelaksana' THEN EXISTS (
      SELECT 1 FROM public.penugasan_staf ps
      WHERE ps.disposisi_id = p_id AND ps.staf_id = public.app_caller_id()
    )
    ELSE false
  END;
$$;

-- Surat keluar: semua role kecuali staf_pelaksana (hanya miliknya sendiri).
CREATE OR REPLACE FUNCTION public.app_surat_keluar_visible(p_id text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN public.app_caller_id() IS NULL THEN false
    WHEN public.app_caller_role() = 'staf_pelaksana' THEN EXISTS (
      SELECT 1 FROM public.surat_keluar s WHERE s.id = p_id AND s.penyusun_id = public.app_caller_id()
    )
    ELSE true
  END;
$$;

-- Arsip digital.
CREATE OR REPLACE FUNCTION public.app_arsip_visible(p_id text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN public.app_caller_id() IS NULL THEN false
    WHEN public.app_caller_role() = 'staf_pelaksana' THEN EXISTS (
      SELECT 1 FROM public.arsip_digital a
      WHERE a.id = p_id AND a.jenis_surat = 'masuk' AND a.surat_masuk_id IN (
        SELECT d.surat_masuk_id FROM public.penugasan_staf ps
        JOIN public.disposisi d ON d.id = ps.disposisi_id
        WHERE ps.staf_id = public.app_caller_id()
      )
    )
    WHEN public.app_caller_role() = 'kepala_bidang' THEN EXISTS (
      SELECT 1 FROM public.arsip_digital a
      WHERE a.id = p_id AND (
        a.surat_keluar_id IS NOT NULL
        OR a.surat_masuk_id IN (
          SELECT d.surat_masuk_id FROM public.disposisi d
          JOIN public.disposisi_bidang_tujuan t ON t.disposisi_id = d.id
          WHERE t.unit_kerja_id = public.app_caller_unit()
        )
      )
    )
    ELSE true
  END;
$$;

-- Penugasan staf: terlihat oleh owner penugasan, kepala bidangnya, atau siapa pun
-- yang boleh melihat disposisi induknya.
CREATE OR REPLACE FUNCTION public.app_penugasan_visible(p_id text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN public.app_caller_id() IS NULL THEN false
    WHEN public.app_caller_role() = 'staf_pelaksana' THEN EXISTS (
      SELECT 1 FROM public.penugasan_staf ps
      WHERE ps.id = p_id AND ps.staf_id = public.app_caller_id()
    )
    WHEN public.app_caller_role() = 'kepala_bidang' THEN EXISTS (
      SELECT 1 FROM public.penugasan_staf ps
      WHERE ps.id = p_id AND ps.kepala_bidang_id = public.app_caller_id()
    )
    ELSE EXISTS (
      SELECT 1 FROM public.penugasan_staf ps
      WHERE ps.id = p_id AND public.app_disposisi_visible(ps.disposisi_id)
    )
  END;
$$;

-- Tindak lanjut: mengikuti penugasannya, atau pelaku sendiri.
CREATE OR REPLACE FUNCTION public.app_tindak_lanjut_visible(p_id text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN public.app_caller_id() IS NULL THEN false
    WHEN EXISTS (
      SELECT 1 FROM public.tindak_lanjut tl
      WHERE tl.id = p_id AND tl.pelaku_id = public.app_caller_id()
    ) THEN true
    ELSE EXISTS (
      SELECT 1 FROM public.tindak_lanjut tl
      JOIN public.penugasan_staf ps ON ps.id = tl.penugasan_staf_id
      WHERE tl.id = p_id AND public.app_penugasan_visible(ps.id)
    )
  END;
$$;

-- Riwayat status: mengikuti surat induknya.
CREATE OR REPLACE FUNCTION public.app_riwayat_visible(p_id text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN public.app_caller_id() IS NULL THEN false
    WHEN EXISTS (
      SELECT 1 FROM public.riwayat_status r
      WHERE r.id = p_id AND r.surat_masuk_id IS NOT NULL
        AND public.app_surat_masuk_visible(r.surat_masuk_id)
    ) THEN true
    WHEN EXISTS (
      SELECT 1 FROM public.riwayat_status r
      WHERE r.id = p_id AND r.surat_keluar_id IS NOT NULL
        AND public.app_surat_keluar_visible(r.surat_keluar_id)
    ) THEN true
    ELSE false
  END;
$$;

-- Persetujuan surat keluar: mengikuti surat keluar induknya.
CREATE OR REPLACE FUNCTION public.app_persetujuan_visible(p_id text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN public.app_caller_id() IS NULL THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.persetujuan_surat_keluar p
      WHERE p.id = p_id AND public.app_surat_keluar_visible(p.surat_keluar_id)
    )
  END;
$$;

-- Disposisi bidang tujuan: mengikuti disposisi induknya.
CREATE OR REPLACE FUNCTION public.app_disposisi_tujuan_visible(p_id text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN public.app_caller_id() IS NULL THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.disposisi_bidang_tujuan t
      WHERE t.id = p_id AND public.app_disposisi_visible(t.disposisi_id)
    )
  END;
$$;

-- =============================================================================
-- 2. Aktifkan RLS
-- =============================================================================
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'pengaturan_instansi','unit_kerja','users','klasifikasi_surat','jenis_surat','data_master',
    'surat_masuk','surat_keluar','disposisi','disposisi_bidang_tujuan','penugasan_staf',
    'tindak_lanjut','persetujuan_surat_keluar','arsip_digital','notifikasi','riwayat_status',
    'log_aktivitas','nomor_surat_counter','buku_ekspedisi','buku_ekspedisi_tujuan',
    'reminder_log','import_legacy'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- =============================================================================
-- 3. Policy SELECT
--    Tulis (INSERT/UPDATE/DELETE) TIDAK diberikan policy langsung — semua
--    mutasi lewat RPC SECURITY DEFINER supaya transaksional + ter-audit.
-- =============================================================================

-- ── Data master: semua role terautentikasi boleh baca ──────────────────────
DROP POLICY IF EXISTS pol_pengaturan_instansi_read ON public.pengaturan_instansi;
CREATE POLICY pol_pengaturan_instansi_read ON public.pengaturan_instansi
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS pol_unit_kerja_read ON public.unit_kerja;
CREATE POLICY pol_unit_kerja_read ON public.unit_kerja
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS pol_users_read ON public.users;
CREATE POLICY pol_users_read ON public.users
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS pol_klasifikasi_read ON public.klasifikasi_surat;
CREATE POLICY pol_klasifikasi_read ON public.klasifikasi_surat
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS pol_jenis_surat_read ON public.jenis_surat;
CREATE POLICY pol_jenis_surat_read ON public.jenis_surat
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS pol_data_master_read ON public.data_master;
CREATE POLICY pol_data_master_read ON public.data_master
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS pol_nomor_counter_read ON public.nomor_surat_counter;
CREATE POLICY pol_nomor_counter_read ON public.nomor_surat_counter
  FOR SELECT TO authenticated USING (true);

-- ── Surat masuk ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS pol_surat_masuk_read ON public.surat_masuk;
CREATE POLICY pol_surat_masuk_read ON public.surat_masuk
  FOR SELECT TO authenticated USING (public.app_surat_masuk_visible(id));

-- ── Disposisi (admin tanpa policy SELECT) ───────────────────────────────────
DROP POLICY IF EXISTS pol_disposisi_read ON public.disposisi;
CREATE POLICY pol_disposisi_read ON public.disposisi
  FOR SELECT TO authenticated USING (public.app_disposisi_visible(id));

DROP POLICY IF EXISTS pol_disposisi_tujuan_read ON public.disposisi_bidang_tujuan;
CREATE POLICY pol_disposisi_tujuan_read ON public.disposisi_bidang_tujuan
  FOR SELECT TO authenticated USING (public.app_disposisi_tujuan_visible(id));

-- ── Penugasan & tindak lanjut ────────────────────────────────────────────────
DROP POLICY IF EXISTS pol_penugasan_read ON public.penugasan_staf;
CREATE POLICY pol_penugasan_read ON public.penugasan_staf
  FOR SELECT TO authenticated USING (public.app_penugasan_visible(id));

DROP POLICY IF EXISTS pol_tindak_lanjut_read ON public.tindak_lanjut;
CREATE POLICY pol_tindak_lanjut_read ON public.tindak_lanjut
  FOR SELECT TO authenticated USING (public.app_tindak_lanjut_visible(id));

-- ── Surat keluar ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS pol_surat_keluar_read ON public.surat_keluar;
CREATE POLICY pol_surat_keluar_read ON public.surat_keluar
  FOR SELECT TO authenticated USING (public.app_surat_keluar_visible(id));

DROP POLICY IF EXISTS pol_persetujuan_read ON public.persetujuan_surat_keluar;
CREATE POLICY pol_persetujuan_read ON public.persetujuan_surat_keluar
  FOR SELECT TO authenticated USING (public.app_persetujuan_visible(id));

-- ── Arsip ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS pol_arsip_read ON public.arsip_digital;
CREATE POLICY pol_arsip_read ON public.arsip_digital
  FOR SELECT TO authenticated USING (public.app_arsip_visible(id));

-- ── Notifikasi: hanya pemilik ───────────────────────────────────────────────
DROP POLICY IF EXISTS pol_notifikasi_read ON public.notifikasi;
CREATE POLICY pol_notifikasi_read ON public.notifikasi
  FOR SELECT TO authenticated USING (user_id = public.app_caller_id());

-- ── Riwayat status ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS pol_riwayat_read ON public.riwayat_status;
CREATE POLICY pol_riwayat_read ON public.riwayat_status
  FOR SELECT TO authenticated USING (public.app_riwayat_visible(id));

-- ── Log aktivitas: admin saja ──────────────────────────────────────────────
DROP POLICY IF EXISTS pol_log_aktivitas_read ON public.log_aktivitas;
CREATE POLICY pol_log_aktivitas_read ON public.log_aktivitas
  FOR SELECT TO authenticated USING (public.app_caller_role() = 'admin');

-- ── Buku ekspedisi:internal penuh ──────────────────────────────────────────
DROP POLICY IF EXISTS pol_buku_ekspedisi_read ON public.buku_ekspedisi;
CREATE POLICY pol_buku_ekspedisi_read ON public.buku_ekspedisi
  FOR SELECT TO authenticated USING (public.app_caller_role() IN ('admin','petugas_surat','sekretaris','kepala_dinas'));

DROP POLICY IF EXISTS pol_buku_ekspedisi_tujuan_read ON public.buku_ekspedisi_tujuan;
CREATE POLICY pol_buku_ekspedisi_tujuan_read ON public.buku_ekspedisi_tujuan
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.buku_ekspedisi e
    WHERE e.id = ekspedisi_id
      AND public.app_caller_role() IN ('admin','petugas_surat','sekretaris','kepala_dinas')
  ));

-- ── Tabel pendukung: tidak dibaca langsung oleh pengguna ────────────────────
-- reminder_log & import_legacy hanya diakses lewat RPC/internal.

-- =============================================================================
-- 4. Bucket Storage (private) + policy
--    Bucket dibuat idempoten; tidak ada policy SELECT langsung — file diakses
--    lewat route /api/files yang lebih dulu memeriksa visibilitas baris.
-- =============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('berkas-surat', 'berkas-surat', false),
       ('tanda-tangan', 'tanda-tangan', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Bolehkah pengguna saat ini menulis objek pada bucket/path tertentu?
--   berkas-surat  : folder acuan (masuk|keluar|laporan) + id unik acak
--   tanda-tangan : hanya berkas milik sendiri, kecuali admin yang mengelola
--                   tanda tangan akun lain.
CREATE OR REPLACE FUNCTION public.app_storage_writable(p_bucket text, p_name text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN p_bucket = 'berkas-surat'
      THEN p_name ~ '^(masuk|keluar|laporan)/[0-9a-fA-F-]{8,}/[^/]+$'
    WHEN p_bucket = 'tanda-tangan'
      THEN p_name = 'ttd/' || public.app_caller_id() || '.png'
        OR public.app_caller_role() = 'admin'
    ELSE false
  END;
$$;

-- Unggahan berkas: hanya pengguna yang sudah masuk, dan hanya ke path miliknya.
DROP POLICY IF EXISTS pol_storage_berkas_insert ON storage.objects;
CREATE POLICY pol_storage_berkas_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (public.app_storage_writable(bucket_id, name));

DROP POLICY IF EXISTS pol_storage_berkas_update ON storage.objects;
CREATE POLICY pol_storage_berkas_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (public.app_storage_writable(bucket_id, name))
  WITH CHECK (public.app_storage_writable(bucket_id, name));

DROP POLICY IF EXISTS pol_storage_berkas_delete ON storage.objects;
CREATE POLICY pol_storage_berkas_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (public.app_storage_writable(bucket_id, name));

-- Catatan: pencabutan EXECUTE untuk RPC internal dilakukan di 0003_rpc.sql
-- (fungsinya baru ada setelah file itu dibuat).
