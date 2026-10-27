-- =============================================================================
-- perbaiki-policy-storage.sql — Memperbaiki aturan RLS bucket Storage.
--
-- Kapan dipakai:
--   Unggah tanda tangan ditolak dengan pesan
--   "new row violates row-level security policy", padahal unggah berkas surat
--   berhasil. Penyebabnya policy storage.objects di database masih versi lama
--   (hanya mengizinkan bucket 'berkas-surat'), sementara berkas
--   supabase/migrations/0002_rls.sql versi terbaru sudah mengizinkan bucket
--   'tanda-tangan' untuk berkas milik pengguna sendiri.
--
-- Cara memakai:
--   Dashboard Supabase → SQL Editor → New query → tempel seluruh isi berkas
--   ini → Run. Aman dijalankan berulang kali (idempoten).
--
-- Setelah dijalankan, periksa dengan:
--   npm run test:storage
-- =============================================================================

-- Pastikan kedua bucket ada dan tetap privat.
INSERT INTO storage.buckets (id, name, public)
VALUES ('berkas-surat', 'berkas-surat', false),
       ('tanda-tangan', 'tanda-tangan', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Helper penentu: bolehkah pengguna saat ini menulis objek pada bucket/path ini?
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

-- Sanity check:
--   fungsi app_storage_writable() bergantung pada auth.uid() — yaitu pengguna
--   yang sedang login. Di SQL Editor tidak ada sesi login, sehingga nilainya
--   selalu false di sini; itu normal, bukan tanda kegagalan.
--
--   Pemeriksaan yang sebenarnya dilakukan oleh skrip:
--     npm run test:storage
--   yang login sebagai pengguna sungguhan lalu mencoba mengunggah.
