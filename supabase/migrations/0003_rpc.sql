-- =============================================================================
-- 0003_rpc.sql — Prosedur Stored (mutasi transaksional)
--
-- Semua mutasi domain dilakukan lewat fungsi `rpc_*` yang ber-`SECURITY DEFINER`.
-- TUJUAN:
--   1. Otorisasi ditegakkan di server (bukan bisa dilewati dari browser).
--   2. Satu aksi = satu transaksi Postgres (tidak ada state setengah jadi).
--   3. Penomoran race-safe lewat advisory lock.
--
-- Pesan error memakai Bahasa Indonesia yang sama persis dengan `src/lib/api.ts`
-- supaya skripsi/uji skenario tidak berubah. Kode galat 42501 = akses ditolak.
--
-- Catatan: fungsi ini dikanggil lewat PostgREST (`supabase.rpc('rpc_x', {...})`).
-- =============================================================================

-- =============================================================================
-- 0. HELPER
-- =============================================================================

-- Pengguna pemanggil (baris `users` yang cocok dengan session Auth).
CREATE OR REPLACE FUNCTION public.app_me()
RETURNS public.users
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v public.users;
BEGIN
  SELECT * INTO v FROM public.users WHERE auth_id = auth.uid() AND aktif = true LIMIT 1;
  RETURN v;
END;
$$;

-- Guard login + peran. Melempar galat 42501 bila tidak berwenang.
CREATE OR REPLACE FUNCTION public.app_require_role(p_roles text[])
RETURNS public.users
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v public.users;
BEGIN
  v := public.app_me();
  IF v.id IS NULL THEN
    RAISE EXCEPTION 'Anda harus login.' USING ERRCODE = '42501';
  END IF;
  IF NOT (v.role = ANY(p_roles)) THEN
    RAISE EXCEPTION 'Akses ditolak: Anda tidak memiliki wewenang untuk aksi ini.' USING ERRCODE = '42501';
  END IF;
  RETURN v;
END;
$$;

-- Catat riwayat status (riwayat_status).
CREATE OR REPLACE FUNCTION public.app_riwayat(
  p_surat_masuk_id  text,
  p_surat_keluar_id text,
  p_status         text,
  p_catatan        text
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_me public.users;
BEGIN
  v_me := public.app_me();
  INSERT INTO public.riwayat_status (id, surat_masuk_id, surat_keluar_id, status, pelaku_id, catatan, waktu)
  VALUES (public.app_new_id('rs'),
          NULLIF(p_surat_masuk_id, ''),
          NULLIF(p_surat_keluar_id, ''),
          p_status,
          v_me.id,
          p_catatan,
          now());
END;
$$;

-- Kirim notifikasi in-app ke satu pengguna.
CREATE OR REPLACE FUNCTION public.app_notif(
  p_user_id text,
  p_judul  text,
  p_pesan  text,
  p_tautan text DEFAULT NULL,
  p_tingkat text DEFAULT 'info'
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_user_id IS NULL OR p_user_id = '' THEN RETURN; END IF;
  INSERT INTO public.notifikasi (id, user_id, judul, pesan, tautan_url, dibaca, tingkat, created_at)
  VALUES (public.app_new_id('ntf'), p_user_id, p_judul, p_pesan, p_tautan, false, p_tingkat, now());
END;
$$;

-- Kirim notifikasi ke seluruh pengguna aktif dengan peran tertentu.
CREATE OR REPLACE FUNCTION public.app_notif_by_role(
  p_roles   text[],
  p_judul   text,
  p_pesan   text,
  p_tautan  text DEFAULT NULL,
  p_tingkat text DEFAULT 'info'
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.users WHERE role = ANY(p_roles) AND aktif = true
  LOOP
    PERFORM public.app_notif(r.id, p_judul, p_pesan, p_tautan, p_tingkat);
  END LOOP;
END;
$$;

-- Catat log aktivitas.
CREATE OR REPLACE FUNCTION public.app_log(p_aksi text, p_detail text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_me public.users;
BEGIN
  v_me := public.app_me();
  INSERT INTO public.log_aktivitas (id, user_id, aksi, detail, waktu)
  VALUES (public.app_new_id('log'), v_me.id, p_aksi, p_detail, now());
END;
$$;

-- Nomor urut berikutnya — race-safe.
-- Memakai advisory lock per (tahun, jenis) + rekonsiliasi MAX(nomor_urut).
CREATE OR REPLACE FUNCTION public.app_next_nomor(p_tahun int, p_jenis text)
RETURNS int
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_counter int;
  v_max     int := 0;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('nomor_surat:' || p_tahun::text || ':' || p_jenis));

  INSERT INTO public.nomor_surat_counter (tahun, jenis_surat, counter)
  VALUES (p_tahun, p_jenis, 0)
  ON CONFLICT (tahun, jenis_surat) DO NOTHING;

  SELECT counter INTO v_counter
  FROM public.nomor_surat_counter
  WHERE tahun = p_tahun AND jenis_surat = p_jenis
  FOR UPDATE;

  IF p_jenis = 'surat_masuk' THEN
    SELECT COALESCE(MAX(nomor_urut), 0) INTO v_max
    FROM public.surat_masuk
    WHERE nomor_urut IS NOT NULL
      AND EXTRACT(YEAR FROM tanggal_terima)::int = p_tahun;
  ELSE
    SELECT COALESCE(MAX(nomor_urut), 0) INTO v_max
    FROM public.surat_keluar
    WHERE nomor_urut IS NOT NULL
      AND EXTRACT(YEAR FROM COALESCE(tanggal_kirim, created_at))::int = p_tahun;
  END IF;

  IF v_max > v_counter THEN v_counter := v_max; END IF;

  UPDATE public.nomor_surat_counter
  SET counter = v_counter + 1, updated_at = now()
  WHERE tahun = p_tahun AND jenis_surat = p_jenis;

  RETURN v_counter + 1;
END;
$$;

-- Naikkan counter minimal sampai nilai tertentu (dipakai bila nomor diisi manual).
CREATE OR REPLACE FUNCTION public.app_set_counter(p_tahun int, p_jenis text, p_nilai int)
RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('nomor_surat:' || p_tahun::text || ':' || p_jenis));
  INSERT INTO public.nomor_surat_counter (tahun, jenis_surat, counter)
  VALUES (p_tahun, p_jenis, GREATEST(p_nilai, 0))
  ON CONFLICT (tahun, jenis_surat)
  DO UPDATE SET counter = GREATEST(public.nomor_surat_counter.counter, EXCLUDED.counter), updated_at = now();
END;
$$;

-- Otomatis arsipkan (pengganti `autoArchive()` di api.ts).
-- Idempoten: upsert berdasarkan surat asal, fallback berdasarkan kode arsip.
CREATE OR REPLACE FUNCTION public.app_auto_arsip(
  p_jenis          text,
  p_surat_id       text,
  p_nomor          text,
  p_berkas         text,
  p_perihal        text,
  p_nomor_surat    text,
  p_klasifikasi_id text,
  p_tahun          int,
  p_jenis_surat_id text DEFAULT NULL,
  p_extra          jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id       text;
  v_kode_kls text;
  v_agenda   text;
  v_kode     text;
BEGIN
  SELECT k.kode INTO v_kode_kls FROM public.klasifikasi_surat k WHERE k.id = p_klasifikasi_id;
  IF v_kode_kls IS NULL THEN v_kode_kls := '5.20'; END IF;

  v_agenda := COALESCE(p_nomor, '1');
  IF position('/' IN v_agenda) > 0 THEN
    v_agenda := split_part(v_agenda, '/', array_length(string_to_array(v_agenda, '/'), 1));
  END IF;
  v_agenda := regexp_replace(v_agenda, '^0+', '');
  IF v_agenda = '' THEN v_agenda := '1'; END IF;

  v_kode := v_kode_kls || '/' || p_tahun::text || '/' || v_agenda;

  SELECT a.id INTO v_id FROM public.arsip_digital a
  WHERE a.jenis_surat = p_jenis
    AND ( (p_jenis = 'masuk'  AND a.surat_masuk_id  = p_surat_id)
       OR (p_jenis = 'keluar' AND a.surat_keluar_id = p_surat_id) );

  IF v_id IS NULL THEN
    SELECT a.id INTO v_id FROM public.arsip_digital a WHERE a.kode_arsip = v_kode;
  END IF;

  IF v_id IS NOT NULL THEN
    UPDATE public.arsip_digital SET
      kode_arsip          = v_kode,
      berkas_path         = COALESCE(NULLIF(p_berkas, ''), berkas_path),
      perihal             = COALESCE(NULLIF(p_perihal, ''), perihal),
      nomor_surat         = COALESCE(NULLIF(p_nomor_surat, ''), NULLIF(p_nomor_surat, '-'), nomor_surat),
      klasifikasi_id      = COALESCE(NULLIF(p_klasifikasi_id, ''), klasifikasi_id),
      jenis_surat_id      = COALESCE(p_jenis_surat_id, jenis_surat_id),
      tahun               = p_tahun,
      status_arsip        = COALESCE(p_extra->>'status_arsip', status_arsip),
      laporan_hasil       = COALESCE(p_extra->>'laporan_hasil', laporan_hasil),
      berkas_laporan_path = COALESCE(p_extra->>'berkas_laporan_path', berkas_laporan_path),
      tanggal_selesai     = COALESCE((p_extra->>'tanggal_selesai')::timestamptz, tanggal_selesai),
      surat_balasan_id    = COALESCE(p_extra->>'surat_balasan_id', surat_balasan_id),
      surat_balasan_nomor = COALESCE(p_extra->>'surat_balasan_nomor', surat_balasan_nomor),
      surat_balasan_perihal = COALESCE(p_extra->>'surat_balasan_perihal', surat_balasan_perihal),
      is_surat_balasan    = COALESCE((p_extra->>'is_surat_balasan')::boolean, is_surat_balasan),
      updated_at          = now()
    WHERE id = v_id;
  ELSE
    INSERT INTO public.arsip_digital (
      id, surat_masuk_id, surat_keluar_id, jenis_surat, jenis_surat_id, kode_arsip,
      berkas_path, perihal, nomor_surat, tahun, klasifikasi_id, status_arsip,
      laporan_hasil, berkas_laporan_path, tanggal_selesai,
      surat_balasan_id, surat_balasan_nomor, surat_balasan_perihal, is_surat_balasan,
      created_at, updated_at
    ) VALUES (
      public.app_new_id('ars'),
      CASE WHEN p_jenis = 'masuk'  THEN p_surat_id ELSE NULL END,
      CASE WHEN p_jenis = 'keluar' THEN p_surat_id ELSE NULL END,
      p_jenis,
      p_jenis_surat_id,
      v_kode,
      COALESCE(p_berkas, ''),
      COALESCE(p_perihal, ''),
      COALESCE(p_nomor_surat, ''),
      p_tahun,
      NULLIF(p_klasifikasi_id, ''),
      COALESCE(p_extra->>'status_arsip', 'menunggu_verifikasi'),
      p_extra->>'laporan_hasil',
      p_extra->>'berkas_laporan_path',
      (p_extra->>'tanggal_selesai')::timestamptz,
      p_extra->>'surat_balasan_id',
      p_extra->>'surat_balasan_nomor',
      p_extra->>'surat_balasan_perihal',
      COALESCE((p_extra->>'is_surat_balasan')::boolean, false),
      now(), now()
    );
  END IF;
END;
$$;

-- =============================================================================
-- 1. SURAT MASUK
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_catat_surat_masuk(
  p_nomor_urut         int    DEFAULT NULL,
  p_nomor_berkas       text   DEFAULT NULL,
  p_nomor_petunjuk     text   DEFAULT NULL,
  p_nomor_paket        text   DEFAULT NULL,
  p_tanggal_terima     date   DEFAULT NULL,
  p_asal_surat         text   DEFAULT NULL,
  p_nomor_surat_asal   text   DEFAULT NULL,
  p_tanggal_surat_asal date   DEFAULT NULL,
  p_perihal            text   DEFAULT NULL,
  p_klasifikasi_id     text   DEFAULT NULL,
  p_jenis_surat_id     text   DEFAULT NULL,
  p_sifat              text   DEFAULT 'biasa',
  p_batas_waktu_surat  date   DEFAULT NULL,
  p_berkas_path        text   DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_me      public.users;
  v_tahun   int;
  v_urut    int;
  v_id      text;
  v_jenis   record;
  v_petunjuk text;
BEGIN
  v_me := public.app_require_role(ARRAY['petugas_surat']);

  IF p_asal_surat IS NULL OR p_nomor_surat_asal IS NULL OR p_tanggal_surat_asal IS NULL
     OR p_tanggal_terima IS NULL OR p_perihal IS NULL OR p_klasifikasi_id IS NULL
     OR p_jenis_surat_id IS NULL THEN
    RAISE EXCEPTION 'Field asal surat, nomor, tanggal surat, tanggal diterima, perihal, jenis surat, dan kode klasifikasi arsip wajib diisi.';
  END IF;

  SELECT * INTO v_jenis FROM public.jenis_surat j WHERE j.id = p_jenis_surat_id;
  IF NOT FOUND OR NOT v_jenis.aktif THEN
    RAISE EXCEPTION 'Jenis surat tidak valid atau sudah nonaktif.';
  END IF;

  v_tahun := EXTRACT(YEAR FROM p_tanggal_terima)::int;

  IF p_nomor_urut IS NOT NULL THEN
    v_urut := p_nomor_urut;
    PERFORM public.app_set_counter(v_tahun, 'surat_masuk', v_urut);
  ELSE
    v_urut := public.app_next_nomor(v_tahun, 'surat_masuk');
  END IF;

  IF v_urut <= 0 THEN
    RAISE EXCEPTION 'Nomor agenda harus berupa angka positif.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.surat_masuk s
    WHERE s.nomor_urut = v_urut
      AND EXTRACT(YEAR FROM s.tanggal_terima)::int = v_tahun
  ) THEN
    RAISE EXCEPTION 'Nomor agenda % sudah terdaftar pada buku tahun %. Nomor agenda tidak boleh duplikat.', v_urut, v_tahun;
  END IF;

  v_petunjuk := COALESCE(NULLIF(p_nomor_petunjuk, ''),
    EXTRACT(DAY FROM p_tanggal_terima)::int || '/' ||
    EXTRACT(MONTH FROM p_tanggal_terima)::int || '/' ||
    right(v_tahun::text, 2));

  v_id := public.app_new_id('sm');

  INSERT INTO public.surat_masuk (
    id, nomor_agenda, nomor_urut, nomor_berkas, nomor_petunjuk, nomor_paket,
    tanggal_terima, asal_surat, nomor_surat_asal, tanggal_surat_asal, perihal,
    klasifikasi_id, jenis_surat_id, sifat, batas_waktu_surat, berkas_path, status,
    pencatat_id, created_at, updated_at
  ) VALUES (
    v_id, v_urut::text, v_urut, COALESCE(p_nomor_berkas, ''), v_petunjuk, COALESCE(p_nomor_paket, ''),
    p_tanggal_terima, p_asal_surat, p_nomor_surat_asal, p_tanggal_surat_asal, p_perihal,
    p_klasifikasi_id, p_jenis_surat_id, COALESCE(p_sifat, 'biasa'), p_batas_waktu_surat,
    COALESCE(p_berkas_path, ''), 'diagenda', v_me.id, now(), now()
  );

  PERFORM public.app_riwayat(v_id, NULL, 'Diagenda',
    format('Surat dari %s (Jenis: %s) dicatat dan diagendakan dengan nomor agenda %s oleh %s',
           p_asal_surat, v_jenis.nama, v_urut, v_me.nama));
  PERFORM public.app_log('Catat Surat Masuk',
    format('Mencatat surat masuk %s dari %s', v_urut, p_asal_surat));

  RETURN jsonb_build_object('id', v_id, 'nomorAgenda', v_urut::text, 'nomorUrut', v_urut);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_buat_disposisi(p_surat_masuk_id text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_me   public.users;
  v_surat public.surat_masuk;
  v_disp_id text;
  v_kadis record;
BEGIN
  v_me := public.app_require_role(ARRAY['petugas_surat']);

  SELECT * INTO v_surat FROM public.surat_masuk s WHERE s.id = p_surat_masuk_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Surat tidak ditemukan.'; END IF;
  IF v_surat.status <> 'diagenda' THEN
    RAISE EXCEPTION 'Kartu disposisi hanya dapat dibuat untuk surat dengan status ''Diagenda''.';
  END IF;

  IF v_surat.asal_surat IS NULL OR v_surat.asal_surat = '' THEN
    RAISE EXCEPTION 'Data surat belum lengkap: Asal Surat kosong.';
  END IF;
  IF v_surat.nomor_surat_asal IS NULL OR v_surat.nomor_surat_asal = '' THEN
    RAISE EXCEPTION 'Data surat belum lengkap: Nomor Surat Asal kosong.';
  END IF;
  IF v_surat.tanggal_surat_asal IS NULL THEN
    RAISE EXCEPTION 'Data surat belum lengkap: Tanggal Surat Asal kosong.';
  END IF;
  IF v_surat.perihal IS NULL OR v_surat.perihal = '' THEN
    RAISE EXCEPTION 'Data surat belum lengkap: Perihal kosong.';
  END IF;
  IF v_surat.jenis_surat_id IS NULL OR v_surat.jenis_surat_id = '' THEN
    RAISE EXCEPTION 'Data surat belum lengkap: Jenis Surat belum dipilih.';
  END IF;

  v_disp_id := public.app_new_id('disp');

  UPDATE public.surat_masuk SET status = 'menunggu_disposisi', updated_at = now() WHERE id = p_surat_masuk_id;

  INSERT INTO public.disposisi (
    id, surat_masuk_id, dibuat_oleh, instruksi, instruksi_list,
    catatan_kepala, catatan_kadin, tenggat, status, created_at, updated_at
  ) VALUES (
    v_disp_id, p_surat_masuk_id, v_me.id, 'proses_lanjut', '[]'::jsonb,
    '', '', CURRENT_DATE, 'menunggu_disposisi', now(), now()
  );

  PERFORM public.app_riwayat(p_surat_masuk_id, NULL, 'Menunggu Disposisi',
    format('Kartu disposisi digital dibuat oleh %s. Menunggu disposisi dan arahan Kepala Dinas.', v_me.nama));
  PERFORM public.app_log('Buat Kartu Disposisi',
    format('Membuat kartu disposisi digital untuk surat %s', v_surat.nomor_agenda));

  SELECT id INTO v_kadis FROM public.users WHERE role = 'kepala_dinas' AND aktif = true LIMIT 1;
  IF v_kadis.id IS NOT NULL THEN
    PERFORM public.app_notif(v_kadis.id,
      'SURAT BARU PERLU DISPOSISI — ' || upper(v_surat.sifat),
      format('Surat dari %s produk "%s" (%s) memerlukan disposisi Anda.', v_surat.asal_surat, v_surat.perihal, v_surat.nomor_agenda),
      '/disposisi/' || v_disp_id);
  END IF;

  PERFORM public.app_auto_arsip('masuk', p_surat_masuk_id, v_surat.nomor_agenda,
    v_surat.berkas_path, v_surat.perihal, v_surat.nomor_surat_asal, v_surat.klasifikasi_id,
    EXTRACT(YEAR FROM v_surat.tanggal_terima)::int, v_surat.jenis_surat_id,
    jsonb_build_object('status_arsip', 'disposisi'));

  RETURN jsonb_build_object('id', v_disp_id);
END;
$$;

-- =============================================================================
-- 2. DISPOSISI
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_beri_disposisi(
  p_disp_id          text,
  p_instruksi        text,
  p_bidang_tujuan_ids text[],
  p_catatan          text,
  p_tenggat          date,
  p_instruksi_lainnya text  DEFAULT NULL,
  p_instruksi_list   jsonb   DEFAULT NULL,
  p_sifat            text    DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_me       public.users;
  v_disp     public.disposisi;
  v_surat    public.surat_masuk;
  v_uk       record;
  v_kabid    record;
  v_nama     text;
  v_lintas   boolean;
  v_koord    text;
  v_instr_list jsonb;
  v_instr_teks text;
  v_snap     jsonb;
  v_urut     int := 0;
  v_penerima record;
BEGIN
  v_me := public.app_require_role(ARRAY['kepala_dinas']);

  SELECT * INTO v_disp FROM public.disposisi d WHERE d.id = p_disp_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Disposisi tidak ditemukan.'; END IF;
  IF v_disp.status <> 'menunggu_disposisi' THEN
    RAISE EXCEPTION 'Status disposisi saat ini tidak mengizinkan aksi ini.';
  END IF;

  IF p_bidang_tujuan_ids IS NULL OR array_length(p_bidang_tujuan_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Minimal satu bidang tujuan harus dicentang sebelum mengirim disposisi.';
  END IF;

  FOREACH v_nama IN ARRAY p_bidang_tujuan_ids LOOP
    SELECT * INTO v_uk FROM public.unit_kerja u WHERE u.id = v_nama;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Unit kerja dengan id "%" tidak ditemukan.', v_nama;
    END IF;
    IF NOT v_uk.aktif THEN
      RAISE EXCEPTION 'Unit kerja "%" sudah dinonaktifkan. Hapus pilihan tersebut sebelum mengirim.', v_uk.nama;
    END IF;
    IF v_uk.jenis = 'bidang' THEN
      SELECT * INTO v_kabid FROM public.users u
      WHERE u.role = 'kepala_bidang' AND u.unit_kerja_id = v_nama AND u.aktif = true LIMIT 1;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Bidang "%" belum memiliki Kepala Bidang aktif. Daftarkan Kepala Bidang terlebih dahulu.', v_uk.nama;
      END IF;
    END IF;
  END LOOP;

  SELECT * INTO v_surat FROM public.surat_masuk s WHERE s.id = v_disp.surat_masuk_id;

  v_lintas := array_length(p_bidang_tujuan_ids, 1) > 1;
  v_instr_list := COALESCE(p_instruksi_list,
    jsonb_build_array(jsonb_build_object('jenis', p_instruksi, 'teks', p_instruksi_lainnya)));

  v_instr_teks := CASE
    WHEN p_instruksi = 'lainnya' AND p_instruksi_lainnya IS NOT NULL
      THEN 'Lainnya (' || p_instruksi_lainnya || ')'
    ELSE COALESCE(
      (SELECT dm.label FROM public.data_master dm
        WHERE dm.kategori = 'jenis_instruksi' AND dm.kode = p_instruksi LIMIT 1),
      p_instruksi)
  END;

  -- Hapus tujuan lama bila ada (kasual edit ulang disposisi)
  DELETE FROM public.disposisi_bidang_tujuan WHERE disposisi_id = p_disp_id;

  FOREACH v_nama IN ARRAY p_bidang_tujuan_ids LOOP
    v_urut := v_urut + 1;
    SELECT * INTO v_uk FROM public.unit_kerja u WHERE u.id = v_nama;
    INSERT INTO public.disposisi_bidang_tujuan (
      id, disposisi_id, tipe, unit_kerja_id, urutan, kepala_bidang_id,
      status_terima, status_proses, created_at, updated_at
    ) VALUES (
      public.app_new_id('dbt'), p_disp_id,
      CASE WHEN v_uk.jenis = 'sekretariat' THEN 'sekretaris' ELSE 'bidang' END,
      v_nama,
      COALESCE(v_uk.urutan_lembar, v_urut),
      (SELECT u.id FROM public.users u WHERE u.role = 'kepala_bidang' AND u.unit_kerja_id = v_nama AND u.aktif = true LIMIT 1),
      'belum', 'menunggu', now(), now()
    );
  END LOOP;

  v_koord := NULL;
  IF v_lintas OR p_instruksi = 'koordinasi_konfirmasi' THEN
    SELECT string_agg(u.nama, ', ' ORDER BY t.urutan) INTO v_nama
    FROM public.disposisi_bidang_tujuan t
    JOIN public.unit_kerja u ON u.id = t.unit_kerja_id
    WHERE t.disposisi_id = p_disp_id;

    v_koord := 'Disposisi lintas bidang ke: ' || v_nama || '. Koordinasi antar-bidang oleh Sekretaris Dinas.';
    SELECT u.id INTO v_penerima FROM public.users u WHERE u.role = 'sekretaris' AND u.aktif = true LIMIT 1;
    IF v_penerima.id IS NOT NULL THEN
      PERFORM public.app_notif(v_penerima.id,
        'Disposisi Lintas Bidang Memerlukan Koordinasi',
        format('Kepala Dinas mendisposisikan surat ke beberapa bidang (%s). Koordinasi Anda diperlukan.', v_nama),
        '/disposisi/' || p_disp_id);
    END IF;
  END IF;

  IF p_sifat IS NOT NULL AND v_surat.id IS NOT NULL THEN
    UPDATE public.surat_masuk SET sifat = p_sifat, updated_at = now() WHERE id = v_surat.id;
  END IF;

  v_snap := CASE WHEN v_surat.id IS NOT NULL THEN jsonb_build_object(
    'asalSurat',       v_surat.asal_surat,
    'nomorSuratAsal',  v_surat.nomor_surat_asal,
    'tanggalSuratAsal', v_surat.tanggal_surat_asal,
    'perihal',         v_surat.perihal,
    'sifat',           COALESCE(p_sifat, v_surat.sifat),
    'nomorAgenda',     v_surat.nomor_agenda,
    'tanggalTerima',   v_surat.tanggal_terima,
    'batasWaktuSurat', v_surat.batas_waktu_surat
  ) ELSE NULL END;

  UPDATE public.disposisi SET
    sifat                 = COALESCE(p_sifat, sifat),
    instruksi             = p_instruksi,
    instruksi_lainnya     = CASE WHEN p_instruksi = 'lainnya' THEN p_instruksi_lainnya ELSE instruksi_lainnya END,
    instruksi_list        = v_instr_list,
    catatan_kepala        = COALESCE(p_catatan, ''),
    catatan_kadin         = COALESCE(p_catatan, ''),
    tenggat               = COALESCE(p_tenggat, CURRENT_DATE),
    status                = 'didisposisikan',
    lintas_bidang         = v_lintas,
    catatan_koordinasi     = v_koord,
    catatan_koordinasi_sekdin = v_koord,
    paraf_kd_oleh         = v_me.nama,
    paraf_kd_at           = now(),
    paraf_kd_ip           = '127.0.0.1',
    paraf_kepala_waktu    = now(),
    paraf_kadin_oleh      = v_me.nama,
    paraf_kadin_waktu     = now(),
    ttd_nama_snapshot     = v_me.nama,
    ttd_nip_snapshot      = COALESCE(v_me.nip, ''),
    ttd_jabatan_snapshot  = 'Kepala Dinas',
    snapshot_surat        = v_snap,
    updated_at            = now()
  WHERE id = p_disp_id;

  UPDATE public.surat_masuk SET status = 'didisposisikan', updated_at = now() WHERE id = v_disp.surat_masuk_id;

  PERFORM public.app_riwayat(v_disp.surat_masuk_id, NULL, 'Didisposisikan',
    format('Kepala Dinas (%s) mendisposisikan ke %s dengan instruksi: %s. Tenggat: %s.',
           v_me.nama, v_nama, v_instr_teks, COALESCE(to_char(p_tenggat, 'DD/MM/YYYY'), '-')));

  -- Notifikasi ke seluruh kepala bidang / sekretaris yang menjadi tujuan
  FOR v_penerima IN
    SELECT u.id, u.nama, u.unit_kerja_id FROM public.users u
    WHERE u.aktif = true AND u.role IN ('kepala_bidang','sekretaris')
      AND u.unit_kerja_id = ANY(p_bidang_tujuan_ids)
  LOOP
    PERFORM public.app_notif(v_penerima.id,
      'Disposisi Baru dari Kepala Dinas',
      format('Surat didisposisikan ke unit Anda. Instruksi: %s.', v_instr_teks),
      '/disposisi/' || p_disp_id);
  END LOOP;

  IF v_surat.id IS NOT NULL THEN
    PERFORM public.app_auto_arsip('masuk', v_surat.id, v_surat.nomor_agenda,
      v_surat.berkas_path, v_surat.perihal, v_surat.nomor_surat_asal, v_surat.klasifikasi_id,
      EXTRACT(YEAR FROM v_surat.tanggal_terima)::int, v_surat.jenis_surat_id,
      jsonb_build_object('status_arsip', 'disposisi'));
  END IF;

  RETURN jsonb_build_object('id', p_disp_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_terima_disposisi(p_disp_id text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_me    public.users;
  v_disp  public.disposisi;
  v_paraf text;
  v_nama_unit text;
  v_status_terima text;
BEGIN
  v_me := public.app_require_role(ARRAY['kepala_bidang','sekretaris']);

  SELECT * INTO v_disp FROM public.disposisi d WHERE d.id = p_disp_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Disposisi tidak ditemukan.'; END IF;
  IF v_disp.status NOT IN ('didisposisikan','diterima_bidang') THEN
    RAISE EXCEPTION 'Disposisi belum diteruskan oleh Kepala Dinas.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.disposisi_bidang_tujuan t
    WHERE t.disposisi_id = p_disp_id AND t.unit_kerja_id = v_me.unit_kerja_id
  ) THEN
    RAISE EXCEPTION 'Akses ditolak: Disposisi ini bukan untuk bidang Anda.';
  END IF;

  v_paraf := 'Paraf: ' || COALESCE(split_part(v_me.nama, ' ', 1), v_me.nama);

  UPDATE public.disposisi_bidang_tujuan SET
    status_terima              = 'diterima',
    waktu_terima               = now(),
    nama_penerima_snapshot     = v_me.nama,
    paraf_penerimaan_snapshot  = v_paraf,
    waktu_paraf_penerimaan     = now(),
    status_proses              = 'diterima_bidang',
    updated_at                 = now()
  WHERE disposisi_id = p_disp_id AND unit_kerja_id = v_me.unit_kerja_id;

  UPDATE public.disposisi SET status = 'diterima_bidang', updated_at = now() WHERE id = p_disp_id;
  UPDATE public.surat_masuk SET status = 'diterima_bidang', updated_at = now() WHERE id = v_disp.surat_masuk_id;

  SELECT u.nama INTO v_nama_unit FROM public.unit_kerja u WHERE u.id = v_me.unit_kerja_id;

  PERFORM public.app_riwayat(v_disp.surat_masuk_id, NULL, 'Diterima Bidang',
    format('%s (%s) memberikan paraf tanda terima disposisi.', COALESCE(v_nama_unit, '-'), v_me.nama));

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_teruskan_ke_staf(
  p_disp_id         text,
  p_staf_id         text,
  p_catatan_penugasan text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_me    public.users;
  v_disp  public.disposisi;
  v_status_proses text;
  v_staf  public.users;
  v_penugasan_id text;
  v_status_terima text;
BEGIN
  v_me := public.app_require_role(ARRAY['kepala_bidang']);

  SELECT * INTO v_disp FROM public.disposisi d WHERE d.id = p_disp_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Disposisi tidak ditemukan.'; END IF;

  SELECT t.status_terima, t.status_proses INTO v_status_terima, v_status_proses
  FROM public.disposisi_bidang_tujuan t
  WHERE t.disposisi_id = p_disp_id AND t.unit_kerja_id = v_me.unit_kerja_id;

  IF NOT FOUND OR v_status_terima IS DISTINCT FROM 'diterima' THEN
    RAISE EXCEPTION 'Bidang Anda belum menerima disposisi ini. Berikan paraf tanda terima terlebih dahulu.';
  END IF;

  IF v_status_proses IN ('diteruskan_staf','ditindak_langsung','selesai') THEN
    RAISE EXCEPTION 'Bidang Anda sudah mengambil keputusan tindak lanjut untuk disposisi ini.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.penugasan_staf ps
    JOIN public.users u ON u.id = ps.staf_id
    WHERE ps.disposisi_id = p_disp_id AND ps.status <> 'selesai'
      AND u.unit_kerja_id = v_me.unit_kerja_id
  ) THEN
    RAISE EXCEPTION 'Sudah ada penugasan aktif dari bidang Anda. Selesaikan penugasan yang sedang berjalan terlebih dahulu.';
  END IF;

  IF p_staf_id IS NULL OR p_staf_id = '' THEN
    RAISE EXCEPTION 'Staf pelaksana tujuan wajib dipilih sebelum meneruskan penugasan.';
  END IF;

  SELECT * INTO v_staf FROM public.users u WHERE u.id = p_staf_id;
  IF NOT FOUND OR v_staf.unit_kerja_id IS DISTINCT FROM v_me.unit_kerja_id THEN
    RAISE EXCEPTION 'Staf pelaksana wajib dipilih dari bidang yang sama.';
  END IF;

  v_penugasan_id := public.app_new_id('ps');
  INSERT INTO public.penugasan_staf (
    id, disposisi_id, staf_id, kepala_bidang_id, catatan_penugasan, status, created_at, updated_at
  ) VALUES (
    v_penugasan_id, p_disp_id, p_staf_id, v_me.id, COALESCE(p_catatan_penugasan, ''), 'ditugaskan', now(), now()
  );

  UPDATE public.disposisi_bidang_tujuan SET
    status_proses     = 'diteruskan_staf',
    diteruskan_ke    = p_staf_id,
    catatan_penugasan = COALESCE(p_catatan_penugasan, ''),
    updated_at       = now()
  WHERE disposisi_id = p_disp_id AND unit_kerja_id = v_me.unit_kerja_id;

  UPDATE public.disposisi SET status = 'diteruskan_ke_staf', updated_at = now() WHERE id = p_disp_id;
  UPDATE public.surat_masuk SET status = 'diteruskan_ke_staf', updated_at = now() WHERE id = v_disp.surat_masuk_id;

  PERFORM public.app_riwayat(v_disp.surat_masuk_id, NULL, 'Diteruskan ke Staf',
    format('%s meneruskan penugasan kepada Staf Pelaksana: %s. Catatan: %s',
           v_me.nama, v_staf.nama, COALESCE(NULLIF(p_catatan_penugasan,''), '-')));

  PERFORM public.app_notif(p_staf_id, 'Penugasan Baru dari Kepala Bidang',
    format('%s menugaskan Anda untuk menindaklanjuti disposisi surat. Catatan: %s',
           v_me.nama, COALESCE(NULLIF(p_catatan_penugasan,''), '-')),
    '/disposisi/' || p_disp_id);

  RETURN jsonb_build_object('id', v_penugasan_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_tindak_lanjut_langsung(
  p_disp_id            text,
  p_uraian_hasil       text,
  p_berkas_path        text DEFAULT NULL,
  p_perlu_surat_jawaban boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_me      public.users;
  v_disp    public.disposisi;
  v_status_proses text;
  v_all_finished boolean;
  v_surat   public.surat_masuk;
  v_rev     int;
  v_tl_id   text;
  v_unit_nama text;
  v_status_terima text;
BEGIN
  v_me := public.app_require_role(ARRAY['kepala_bidang','sekretaris']);

  SELECT * INTO v_disp FROM public.disposisi d WHERE d.id = p_disp_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Disposisi tidak ditemukan.'; END IF;

  SELECT t.status_terima, t.status_proses INTO v_status_terima, v_status_proses
  FROM public.disposisi_bidang_tujuan t
  WHERE t.disposisi_id = p_disp_id AND t.unit_kerja_id = v_me.unit_kerja_id;

  IF NOT FOUND OR v_status_terima IS DISTINCT FROM 'diterima' THEN
    RAISE EXCEPTION 'Bidang Anda belum menerima disposisi ini.';
  END IF;

  IF v_status_proses IN ('ditindak_langsung','selesai','diteruskan_staf') THEN
    RAISE EXCEPTION 'Bidang Anda sudah mengambil keputusan tindak lanjut untuk disposisi ini.';
  END IF;

  IF p_uraian_hasil IS NULL OR btrim(p_uraian_hasil) = '' THEN
    RAISE EXCEPTION 'Uraian hasil tindak lanjut wajib diisi.';
  END IF;

  UPDATE public.disposisi_bidang_tujuan SET
    status_proses = 'ditindak_langsung', updated_at = now()
  WHERE disposisi_id = p_disp_id AND unit_kerja_id = v_me.unit_kerja_id;

  SELECT (NOT EXISTS (
      SELECT 1 FROM public.disposisi_bidang_tujuan t
      WHERE t.disposisi_id = p_disp_id
        AND t.status_proses NOT IN ('ditindak_langsung','selesai')
    )) INTO v_all_finished;

  SELECT COUNT(*) + 1 INTO v_rev FROM public.tindak_lanjut WHERE disposisi_id = p_disp_id;
  v_tl_id := public.app_new_id('tl');

  INSERT INTO public.tindak_lanjut (
    id, disposisi_id, pelaku_id, uraian_hasil, berkas_path, status, nomor_revisi, created_at
  ) VALUES (
    v_tl_id, p_disp_id, v_me.id, p_uraian_hasil, COALESCE(p_berkas_path, ''), 'disetujui', v_rev, now()
  );

  UPDATE public.disposisi SET
    status = CASE WHEN v_all_finished THEN 'selesai' ELSE 'diterima_bidang' END,
    perlu_surat_jawaban = COALESCE(p_perlu_surat_jawaban, perlu_surat_jawaban, false),
    updated_at = now()
  WHERE id = p_disp_id;

  IF v_all_finished THEN
    UPDATE public.surat_masuk SET status = 'selesai', updated_at = now() WHERE id = v_disp.surat_masuk_id;
  END IF;

  SELECT * INTO v_surat FROM public.surat_masuk s WHERE s.id = v_disp.surat_masuk_id;
  SELECT u.nama INTO v_unit_nama FROM public.unit_kerja u WHERE u.id = v_me.unit_kerja_id;

  PERFORM public.app_riwayat(v_disp.surat_masuk_id, NULL,
    CASE WHEN v_all_finished THEN 'Selesai' ELSE 'Ditindaklanjuti Bidang' END,
    format('%s (%s) menindaklanjuti langsung. Uraian: %s%s',
           v_me.nama, COALESCE(v_unit_nama, '-'),
           left(p_uraian_hasil, 120),
           CASE WHEN length(p_uraian_hasil) > 120 THEN '...' ELSE '' END));

  IF v_all_finished AND v_surat.id IS NOT NULL THEN
    PERFORM public.app_auto_arsip('masuk', v_surat.id, v_surat.nomor_agenda,
      v_surat.berkas_path, v_surat.perihal, v_surat.nomor_surat_asal, v_surat.klasifikasi_id,
      EXTRACT(YEAR FROM v_surat.tanggal_terima)::int, v_surat.jenis_surat_id,
      jsonb_build_object(
        'status_arsip', 'selesai',
        'laporan_hasil', p_uraian_hasil,
        'berkas_laporan_path', COALESCE(p_berkas_path, ''),
        'tanggal_selesai', now()::text));

    PERFORM public.app_notif_by_role(ARRAY['kepala_dinas'], 'Disposisi Selesai',
      format('Surat "%s" telah selesai seluruhnya.', left(v_surat.perihal, 60)),
      '/disposisi/' || p_disp_id);
    PERFORM public.app_notif_by_role(ARRAY['petugas_surat'], 'Surat Selesai Diproses',
      format('Surat "%s" (%s) dinyatakan selesai.', left(v_surat.perihal, 60), v_surat.nomor_agenda),
      '/surat-masuk/' || v_surat.id);
  END IF;

  RETURN jsonb_build_object('id', v_tl_id, 'semuaSelesai', v_all_finished);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_simpan_progres(
  p_disp_id        text,
  p_catatan_progres text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_me       public.users;
  v_penugasan public.penugasan_staf;
BEGIN
  v_me := public.app_require_role(ARRAY['staf_pelaksana']);

  SELECT * INTO v_penugasan FROM public.penugasan_staf ps
  WHERE ps.disposisi_id = p_disp_id AND ps.staf_id = v_me.id AND ps.status <> 'selesai'
  LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Anda tidak memiliki penugasan aktif untuk disposisi ini.';
  END IF;

  UPDATE public.penugasan_staf
  SET catatan_progres = COALESCE(p_catatan_progres, ''), status = 'dikerjakan', updated_at = now()
  WHERE id = v_penugasan.id;

  PERFORM public.app_log('Simpan Progres Tugas',
    format('Menyimpan progres penugasan: %s', left(COALESCE(p_catatan_progres,''), 50)));

  RETURN jsonb_build_object('id', v_penugasan.id);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_laporkan_hasil(
  p_disp_id      text,
  p_uraian_hasil text,
  p_berkas_path  text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_me       public.users;
  v_penugasan public.penugasan_staf;
  v_disp     public.disposisi;
  v_rev      int;
  v_tl_id    text;
BEGIN
  v_me := public.app_require_role(ARRAY['staf_pelaksana']);

  SELECT * INTO v_penugasan FROM public.penugasan_staf ps
  WHERE ps.disposisi_id = p_disp_id AND ps.staf_id = v_me.id
    AND ps.status <> 'selesai' AND ps.status <> 'menunggu_pemeriksaan'
  LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Anda tidak memiliki penugasan aktif untuk disposisi ini, atau laporan Anda sedang menunggu pemeriksaan.';
  END IF;

  IF p_uraian_hasil IS NULL OR btrim(p_uraian_hasil) = '' THEN
    RAISE EXCEPTION 'Uraian hasil wajib diisi.';
  END IF;

  SELECT * INTO v_disp FROM public.disposisi d WHERE d.id = p_disp_id;

  SELECT COUNT(*) + 1 INTO v_rev FROM public.tindak_lanjut WHERE disposisi_id = p_disp_id;
  v_tl_id := public.app_new_id('tl');

  INSERT INTO public.tindak_lanjut (
    id, disposisi_id, penugasan_staf_id, pelaku_id, uraian_hasil, berkas_path, status, nomor_revisi, created_at
  ) VALUES (
    v_tl_id, p_disp_id, v_penugasan.id, v_me.id, p_uraian_hasil, COALESCE(p_berkas_path, ''), 'dilaporkan', v_rev, now()
  );

  UPDATE public.penugasan_staf SET status = 'menunggu_pemeriksaan', updated_at = now() WHERE id = v_penugasan.id;

  UPDATE public.disposisi_bidang_tujuan SET
    status_proses = 'menunggu_pemeriksaan', updated_at = now()
  WHERE disposisi_id = p_disp_id AND diteruskan_ke = v_me.id;

  UPDATE public.disposisi SET status = 'menunggu_pemeriksaan', updated_at = now() WHERE id = p_disp_id;
  UPDATE public.surat_masuk SET status = 'menunggu_pemeriksaan', updated_at = now()
  WHERE id = COALESCE(v_disp.surat_masuk_id, '');

  PERFORM public.app_riwayat(v_disp.surat_masuk_id, NULL, 'Menunggu Pemeriksaan',
    format('Staf Pelaksana %s melaporkan hasil tindak lanjut. Menunggu pemeriksaan Kepala Bidang.', v_me.nama));

  PERFORM public.app_notif(v_penugasan.kepala_bidang_id, 'Laporan Staf Masuk',
    format('%s telah mengirimkan laporan tindak lanjut. Mohon diperiksa.', v_me.nama),
    '/disposisi/' || p_disp_id);

  RETURN jsonb_build_object('id', v_tl_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_periksa_laporan(
  p_tl_id                text,
  p_setuju              boolean,
  p_catatan             text,
  p_perlu_surat_jawaban boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_me        public.users;
  v_tl        public.tindak_lanjut;
  v_penugasan public.penugasan_staf;
  v_disp      public.disposisi;
  v_surat     public.surat_masuk;
  v_staf      public.users;
  v_all_finished boolean;
  v_butuh_jawaban boolean;
  v_ada_balasan boolean;
  v_can_close boolean;
  v_new_status text;
BEGIN
  v_me := public.app_require_role(ARRAY['kepala_bidang']);

  SELECT * INTO v_tl FROM public.tindak_lanjut t WHERE t.id = p_tl_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Tindak lanjut tidak ditemukan.'; END IF;
  IF v_tl.status <> 'dilaporkan' THEN RAISE EXCEPTION 'Status tidak valid.'; END IF;

  SELECT * INTO v_penugasan FROM public.penugasan_staf ps WHERE ps.id = v_tl.penugasan_staf_id;
  IF NOT FOUND OR v_penugasan.kepala_bidang_id <> v_me.id THEN
    RAISE EXCEPTION 'Laporan ini bukan dari staf Anda.';
  END IF;

  SELECT * INTO v_disp  FROM public.disposisi d WHERE d.id = v_tl.disposisi_id;
  SELECT * INTO v_surat FROM public.surat_masuk s WHERE s.id = v_disp.surat_masuk_id;
  SELECT * INTO v_staf  FROM public.users u WHERE u.id = v_penugasan.staf_id;

  IF p_setuju THEN
    UPDATE public.tindak_lanjut SET status = 'disetujui' WHERE id = p_tl_id;
    UPDATE public.penugasan_staf SET status = 'selesai', updated_at = now() WHERE id = v_penugasan.id;

    UPDATE public.disposisi_bidang_tujuan SET
      status_proses = 'selesai', updated_at = now()
    WHERE disposisi_id = v_disp.id AND unit_kerja_id = v_me.unit_kerja_id;

    SELECT (NOT EXISTS (
        SELECT 1 FROM public.disposisi_bidang_tujuan t
        WHERE t.disposisi_id = v_disp.id
          AND t.status_proses NOT IN ('selesai','ditindak_langsung')
      )) INTO v_all_finished;

    v_butuh_jawaban := COALESCE(p_perlu_surat_jawaban, false) OR COALESCE(v_disp.perlu_surat_jawaban, false);

    SELECT EXISTS (
      SELECT 1 FROM public.surat_keluar sk
      WHERE (sk.surat_masuk_asal_id = v_disp.surat_masuk_id OR sk.ref_surat_masuk_id = v_disp.surat_masuk_id)
        AND sk.status = 'terkirim'
    ) INTO v_ada_balasan;

    v_can_close := v_all_finished AND (NOT v_butuh_jawaban OR v_ada_balasan);
    v_new_status := CASE
      WHEN v_all_finished AND v_butuh_jawaban AND NOT v_ada_balasan THEN 'diterima_bidang'
      WHEN v_all_finished THEN 'selesai'
      ELSE 'diterima_bidang'
    END;

    UPDATE public.disposisi SET
      status = v_new_status,
      perlu_surat_jawaban = v_butuh_jawaban,
      updated_at = now()
    WHERE id = v_disp.id;

    IF v_can_close THEN
      UPDATE public.surat_masuk SET status = 'selesai', updated_at = now() WHERE id = v_disp.surat_masuk_id;

      PERFORM public.app_auto_arsip('masuk', v_surat.id, v_surat.nomor_agenda,
        v_surat.berkas_path, v_surat.perihal, v_surat.nomor_surat_asal, v_surat.klasifikasi_id,
        EXTRACT(YEAR FROM v_surat.tanggal_terima)::int, v_surat.jenis_surat_id,
        jsonb_build_object(
          'status_arsip', 'menunggu_verifikasi',
          'laporan_hasil', v_tl.uraian_hasil,
          'tanggal_selesai', now()::text));
    END IF;

    PERFORM public.app_riwayat(v_disp.surat_masuk_id, NULL,
      CASE WHEN v_all_finished THEN 'Selesai' ELSE 'Laporan Disetujui' END,
      format('%s menyetujui laporan dari %s.%s', v_me.nama, COALESCE(v_staf.nama,'staf'),
             CASE WHEN v_all_finished THEN ' Seluruh disposisi selesai dan diarsipkan.' ELSE ' Menunggu penyelesaian bidang lain.' END));

    IF v_all_finished THEN
      PERFORM public.app_notif_by_role(ARRAY['kepala_dinas'], 'Disposisi Selesai',
        format('Surat "%s" telah selesai seluruhnya.', left(v_surat.perihal, 60)),
        '/disposisi/' || v_disp.id);
      PERFORM public.app_notif_by_role(ARRAY['petugas_surat'], 'Surat Selesai Diproses',
        format('Surat "%s" (%s) dinyatakan selesai.', left(v_surat.perihal, 60), v_surat.nomor_agenda),
        '/surat-masuk/' || v_surat.id);
    ELSE
      PERFORM public.app_notif(v_penugasan.staf_id, 'Laporan Anda Disetujui',
        format('Laporan Anda untuk surat "%s" telah disetujui oleh %s.', left(v_surat.perihal, 60), v_me.nama),
        '/disposisi/' || v_disp.id);
    END IF;

  ELSE
    IF p_catatan IS NULL OR btrim(p_catatan) = '' THEN
      RAISE EXCEPTION 'Catatan wajib diisi saat mengembalikan laporan.';
    END IF;

    UPDATE public.tindak_lanjut SET
      status = 'dikembalikan',
      catatan_pengembalian = p_catatan,
      uraian_hasil = '[DIKEMBALIKAN: ' || p_catatan || '] ' || v_tl.uraian_hasil
    WHERE id = p_tl_id;

    UPDATE public.penugasan_staf SET status = 'perlu_perbaikan', updated_at = now() WHERE id = v_penugasan.id;

    UPDATE public.disposisi_bidang_tujuan SET
      status_proses = 'diteruskan_staf', updated_at = now()
    WHERE disposisi_id = v_disp.id AND unit_kerja_id = v_me.unit_kerja_id;

    UPDATE public.disposisi SET status = 'diteruskan_ke_staf', updated_at = now() WHERE id = v_disp.id;
    UPDATE public.surat_masuk SET status = 'diteruskan_ke_staf', updated_at = now() WHERE id = v_disp.surat_masuk_id;

    PERFORM public.app_riwayat(v_disp.surat_masuk_id, NULL, 'Perlu Perbaikan',
      format('%s mengembalikan laporan kepada %s. Catatan perbaikan: %s',
             v_me.nama, COALESCE(v_staf.nama,'staf'), p_catatan));

    PERFORM public.app_notif(v_penugasan.staf_id, 'Laporan Perlu Perbaikan',
      format('%s mengembalikan laporan Anda: "%s". Silakan lakukan perbaikan.', v_me.nama, p_catatan),
      '/disposisi/' || v_disp.id);
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_beri_catatan_sekdis(p_disp_id text, p_catatan text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_me   public.users;
  v_disp public.disposisi;
  v_lintas boolean;
  v_kabid record;
BEGIN
  v_me := public.app_require_role(ARRAY['sekretaris']);

  SELECT * INTO v_disp FROM public.disposisi d WHERE d.id = p_disp_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Disposisi tidak ditemukan.'; END IF;

  SELECT ( (SELECT COUNT(*) FROM public.disposisi_bidang_tujuan t WHERE t.disposisi_id = v_disp.id) > 1
         OR COALESCE(v_disp.lintas_bidang, false)
         OR v_disp.instruksi = 'koordinasi_konfirmasi'
         OR EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(v_disp.instruksi_list,'[]'::jsonb)) e
                    WHERE e->>'jenis' = 'koordinasi_konfirmasi')
         ) INTO v_lintas;

  IF NOT v_lintas THEN
    RAISE EXCEPTION 'Catatan koordinasi hanya berlaku untuk disposisi multi-bidang atau instruksi koordinasi/konfirmasi.';
  END IF;
  IF p_catatan IS NULL OR btrim(p_catatan) = '' THEN
    RAISE EXCEPTION 'Catatan koordinasi tidak boleh kosong.';
  END IF;

  UPDATE public.disposisi SET
    catatan_koordinasi = p_catatan,
    catatan_koordinasi_sekdin = p_catatan,
    updated_at = now()
  WHERE id = p_disp_id;

  PERFORM public.app_riwayat(v_disp.surat_masuk_id, NULL, 'Catatan Koordinasi Sekretaris',
    format('Sekretaris Dinas (%s) menambahkan catatan koordinasi: %s', v_me.nama, p_catatan));

  FOR v_kabid IN
    SELECT u.id FROM public.users u
    JOIN public.disposisi_bidang_tujuan t ON t.unit_kerja_id = u.unit_kerja_id
    WHERE t.disposisi_id = p_disp_id AND u.role = 'kepala_bidang'
  LOOP
    PERFORM public.app_notif(v_kabid.id, 'Catatan Koordinasi Sekretaris Dinas',
      format('Sekretaris Dinas memberikan catatan koordinasi untuk disposisi: "%s"', left(p_catatan, 70)),
      '/disposisi/' || p_disp_id);
  END LOOP;

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_bubuhkan_paraf(p_disp_id text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_me   public.users;
  v_disp public.disposisi;
BEGIN
  v_me := public.app_require_role(ARRAY['kepala_dinas']);

  SELECT * INTO v_disp FROM public.disposisi d WHERE d.id = p_disp_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Disposisi tidak ditemukan.'; END IF;
  IF v_disp.status <> 'menunggu_disposisi' THEN
    RAISE EXCEPTION 'Kartu tidak lagi dalam status menunggu disposisi.';
  END IF;

  UPDATE public.disposisi SET
    paraf_kd_oleh = v_me.nama,
    paraf_kd_at = now(),
    paraf_kd_ip = '127.0.0.1',
    paraf_kepala_waktu = now(),
    paraf_kadin_oleh = v_me.nama,
    paraf_kadin_waktu = now(),
    ttd_nama_snapshot = v_me.nama,
    ttd_nip_snapshot = COALESCE(v_me.nip, ''),
    ttd_jabatan_snapshot = 'Kepala Dinas',
    updated_at = now()
  WHERE id = p_disp_id;

  PERFORM public.app_log('Bubuhkan Paraf Elektronik',
    format('%s membubuhkan paraf elektronik pada disposisi %s', v_me.nama, p_disp_id));

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_tidak_perlu_disposisi(p_disp_id text, p_catatan text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_me   public.users;
  v_disp public.disposisi;
BEGIN
  v_me := public.app_require_role(ARRAY['kepala_dinas']);

  SELECT * INTO v_disp FROM public.disposisi d WHERE d.id = p_disp_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Disposisi tidak ditemukan.'; END IF;
  IF v_disp.status <> 'menunggu_disposisi' THEN
    RAISE EXCEPTION 'Status tidak mengizinkan aksi ini.';
  END IF;
  IF p_catatan IS NULL OR btrim(p_catatan) = '' THEN
    RAISE EXCEPTION 'Catatan alasan wajib diisi.';
  END IF;

  UPDATE public.disposisi SET
    keputusan_kd = 'tidak_perlu',
    catatan_kepala = p_catatan,
    catatan_kadin = p_catatan,
    status = 'selesai',
    updated_at = now()
  WHERE id = p_disp_id;

  UPDATE public.surat_masuk SET status = 'selesai', updated_at = now() WHERE id = v_disp.surat_masuk_id;

  PERFORM public.app_riwayat(v_disp.surat_masuk_id, NULL, 'Selesai (Tanpa Disposisi Bidang)',
    format('Kepala Dinas memutuskan tidak perlu disposisi ke bidang. Catatan: %s', p_catatan));

  PERFORM public.app_notif_by_role(ARRAY['petugas_surat'], 'Surat Tidak Perlu Disposisi ke Bidang',
    'Kepala Dinas memutuskan surat tidak perlu disposisi ke bidang. Tandai selesai di sekretariat.',
    '/disposisi/' || p_disp_id);

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- =============================================================================
-- 3. SURAT KELUAR
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_ajukan_surat_keluar(
  p_id              text DEFAULT NULL,
  p_perihal         text DEFAULT NULL,
  p_tujuan          text DEFAULT NULL,
  p_klasifikasi_id  text DEFAULT NULL,
  p_jenis_surat_id  text DEFAULT NULL,
  p_sifat           text DEFAULT 'biasa',
  p_isi_ringkas     text DEFAULT NULL,
  p_as_draf         boolean DEFAULT false,
  p_surat_masuk_id  text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_me    public.users;
  v_sk_id text;
  v_status text;
  v_jenis record;
  v_missing text := '';
BEGIN
  v_me := public.app_require_role(ARRAY['kepala_bidang','staf_pelaksana','admin']);

  IF p_as_draf THEN
    IF p_perihal IS NULL OR btrim(p_perihal) = '' THEN
      RAISE EXCEPTION 'Perihal surat wajib diisi untuk menyimpan draf.';
    END IF;
  ELSE
    IF p_perihal IS NULL OR btrim(p_perihal) = '' THEN v_missing := v_missing || 'Perihal, '; END IF;
    IF p_tujuan IS NULL OR btrim(p_tujuan) = '' THEN v_missing := v_missing || 'Tujuan, '; END IF;
    IF p_klasifikasi_id IS NULL OR p_klasifikasi_id = '' THEN v_missing := v_missing || 'Kode Klasifikasi Arsip, '; END IF;
    IF p_jenis_surat_id IS NULL OR p_jenis_surat_id = '' THEN v_missing := v_missing || 'Jenis Surat, '; END IF;
    IF v_missing <> '' THEN
      RAISE EXCEPTION 'Pengajuan gagal. Kolom wajib belum lengkap: %.', rtrim(v_missing, ', ');
    END IF;

    SELECT * INTO v_jenis FROM public.jenis_surat j WHERE j.id = p_jenis_surat_id;
    IF NOT FOUND OR NOT v_jenis.aktif THEN
      RAISE EXCEPTION 'Jenis surat tidak valid atau sudah nonaktif.';
    END IF;
  END IF;

  v_status := CASE WHEN p_as_draf THEN 'draf' ELSE 'menunggu_paraf' END;

  IF p_id IS NULL OR p_id = '' THEN
    v_sk_id := public.app_new_id('sk');
    INSERT INTO public.surat_keluar (
      id, perihal, tujuan, klasifikasi_id, jenis_surat_id, sifat, isi_ringkas,
      status, penyusun_id, surat_masuk_asal_id, ref_surat_masuk_id, created_at, updated_at
    ) VALUES (
      v_sk_id, p_perihal, COALESCE(p_tujuan,''), COALESCE(p_klasifikasi_id,''), p_jenis_surat_id,
      COALESCE(p_sifat,'biasa'), COALESCE(p_isi_ringkas,''), v_status, v_me.id,
      NULLIF(p_surat_masuk_id,''), NULLIF(p_surat_masuk_id,''), now(), now()
    );
  ELSE
    v_sk_id := p_id;
    UPDATE public.surat_keluar SET
      perihal = p_perihal,
      tujuan = COALESCE(p_tujuan,''),
      klasifikasi_id = COALESCE(p_klasifikasi_id,''),
      jenis_surat_id = p_jenis_surat_id,
      sifat = COALESCE(p_sifat,'biasa'),
      isi_ringkas = COALESCE(p_isi_ringkas,''),
      status = v_status,
      surat_masuk_asal_id = NULLIF(p_surat_masuk_id,''),
      ref_surat_masuk_id = NULLIF(p_surat_masuk_id,''),
      updated_at = now()
    WHERE id = v_sk_id;
  END IF;

  IF NOT p_as_draf THEN
    PERFORM public.app_riwayat(NULL, v_sk_id, 'Menunggu Paraf Koordinasi',
      format('%s mengajukan konsep surat keluar [%s] perihal "%s" untuk paraf koordinasi Sekretaris Dinas.',
             v_me.nama, COALESCE(v_jenis.nama, 'Surat'), p_perihal));

    PERFORM public.app_notif_by_role(ARRAY['sekretaris'], 'Surat Keluar Menunggu Paraf',
      format('%s mengajukan konsep surat keluar perihal "%s" untuk diperiksa dan diparaf.', v_me.nama, p_perihal),
      '/surat-keluar/' || v_sk_id);
  ELSE
    PERFORM public.app_log('Simpan Draf Surat Keluar',
      format('Menyimpan konsep draf surat keluar: %s', p_perihal));
  END IF;

  RETURN jsonb_build_object('id', v_sk_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_paraf_koordinasi(
  p_sk_id  text,
  p_setuju boolean,
  p_catatan text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_me public.users;
  v_sk  public.surat_keluar;
BEGIN
  v_me := public.app_require_role(ARRAY['sekretaris']);

  SELECT * INTO v_sk FROM public.surat_keluar s WHERE s.id = p_sk_id;
  IF NOT FOUND OR v_sk.status <> 'menunggu_paraf' THEN
    RAISE EXCEPTION 'Status tidak valid untuk paraf.';
  END IF;

  IF p_setuju AND v_me.url_tanda_tangan IS NULL THEN
    RAISE EXCEPTION 'Anda belum mengunggah tanda tangan. Silakan unggah melalui halaman Profil terlebih dahulu.';
  END IF;

  IF p_setuju THEN
    INSERT INTO public.persetujuan_surat_keluar (
      id, surat_keluar_id, jenis, pelaku_id, catatan, waktu,
      url_tanda_tangan_snapshot, nama_pelaku_snapshot, nip_pelaku_snapshot, jabatan_pelaku_snapshot
    ) VALUES (
      public.app_new_id('psk'), p_sk_id, 'paraf_koordinasi', v_me.id, NULL, now(),
      v_me.url_tanda_tangan, v_me.nama, v_me.nip, COALESCE(v_me.jabatan, 'Sekretaris Dinas')
    );

    UPDATE public.surat_keluar SET
      status = 'menunggu_ttd',
      paraf_image_path = v_me.url_tanda_tangan,
      paraf_nama_snapshot = v_me.nama,
      paraf_waktu_snapshot = now(),
      updated_at = now()
    WHERE id = p_sk_id;

    PERFORM public.app_riwayat(NULL, p_sk_id, 'Menunggu Tanda Tangan',
      format('Sekretaris Dinas (%s) memberikan paraf koordinasi. Surat diteruskan ke Kepala Dinas untuk ditandatangani.', v_me.nama));

    PERFORM public.app_notif_by_role(ARRAY['kepala_dinas'], 'Surat Keluar Menunggu Tanda Tangan',
      format('Surat perihal "%s" telah diparaf Sekretaris Dinas. Menunggu tanda tangan Anda.', v_sk.perihal),
      '/surat-keluar/' || p_sk_id);
  ELSE
    IF p_catatan IS NULL OR btrim(p_catatan) = '' THEN
      RAISE EXCEPTION 'Catatan revisi wajib diisi.';
    END IF;

    INSERT INTO public.persetujuan_surat_keluar (id, surat_keluar_id, jenis, pelaku_id, catatan, waktu)
    VALUES (public.app_new_id('psk'), p_sk_id, 'dikembalikan', v_me.id, p_catatan, now());

    UPDATE public.surat_keluar SET status = 'perlu_revisi', updated_at = now() WHERE id = p_sk_id;

    PERFORM public.app_riwayat(NULL, p_sk_id, 'Perlu Revisi',
      format('Sekretaris Dinas (%s) mengembalikan konsep surat. Catatan revisi: %s', v_me.nama, p_catatan));

    PERFORM public.app_notif(v_sk.penyusun_id, 'Konsep Surat Dikembalikan — Perlu Revisi',
      format('Surat Anda dikembalikan oleh Sekretaris Dinas: %s', p_catatan),
      '/surat-keluar/' || p_sk_id);
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_tandatangan_surat(p_sk_id text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_me public.users;
  v_sk  public.surat_keluar;
BEGIN
  v_me := public.app_require_role(ARRAY['kepala_dinas']);

  SELECT * INTO v_sk FROM public.surat_keluar s WHERE s.id = p_sk_id;
  IF NOT FOUND OR v_sk.status <> 'menunggu_ttd' THEN
    RAISE EXCEPTION 'Status tidak valid untuk tanda tangan.';
  END IF;

  IF v_me.url_tanda_tangan IS NULL THEN
    RAISE EXCEPTION 'Anda belum mengunggah tanda tangan. Silakan unggah melalui halaman Profil terlebih dahulu.';
  END IF;

  INSERT INTO public.persetujuan_surat_keluar (
    id, surat_keluar_id, jenis, pelaku_id, waktu,
    url_tanda_tangan_snapshot, nama_pelaku_snapshot, nip_pelaku_snapshot, jabatan_pelaku_snapshot
  ) VALUES (
    public.app_new_id('psk'), p_sk_id, 'tanda_tangan', v_me.id, now(),
    v_me.url_tanda_tangan, v_me.nama, COALESCE(v_me.nip, '197402262000032002'),
    COALESCE(v_me.jabatan, 'Kepala Dinas Pertanian')
  );

  UPDATE public.surat_keluar SET
    status = 'ditandatangani',
    ttd_image_path = v_me.url_tanda_tangan,
    ttd_nama_snapshot = v_me.nama,
    ttd_nip_snapshot = COALESCE(v_me.nip, '197402262000032002'),
    ttd_waktu_snapshot = now(),
    updated_at = now()
  WHERE id = p_sk_id;

  PERFORM public.app_riwayat(NULL, p_sk_id, 'Ditandatangani',
    format('Kepala Dinas (%s) menandatangani naskah dinas keluar secara digital. Berkas diserahkan ke Petugas Surat untuk penerbitan nomor surat keluar otomatis.', v_me.nama));

  PERFORM public.app_notif_by_role(ARRAY['petugas_surat'], 'Surat Telah Ditandatangani Kadis — Siap Diberi Nomor',
    format('Surat "%s" telah disahkan Kepala Dinas. Silakan terbitkan nomor surat keluar resmi.', v_sk.perihal),
    '/surat-keluar/' || p_sk_id);

  IF v_sk.penyusun_id <> v_me.id THEN
    PERFORM public.app_notif(v_sk.penyusun_id, 'Konsep Surat Telah Ditandatangani Kadis',
      format('Konsep surat "%s" telah disetujui dan ditandatangani Kepala Dinas. Menunggu penomoran resmi oleh Petugas Surat.', v_sk.perihal),
      '/surat-keluar/' || p_sk_id);
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_tolak_surat_keluar(p_sk_id text, p_catatan text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_me public.users;
  v_sk  public.surat_keluar;
BEGIN
  v_me := public.app_require_role(ARRAY['kepala_dinas']);

  SELECT * INTO v_sk FROM public.surat_keluar s WHERE s.id = p_sk_id;
  IF NOT FOUND OR v_sk.status <> 'menunggu_ttd' THEN
    RAISE EXCEPTION 'Status tidak valid untuk penolakan tanda tangan.';
  END IF;
  IF p_catatan IS NULL OR btrim(p_catatan) = '' THEN
    RAISE EXCEPTION 'Catatan penolakan wajib diisi.';
  END IF;

  INSERT INTO public.persetujuan_surat_keluar (id, surat_keluar_id, jenis, pelaku_id, catatan, waktu)
  VALUES (public.app_new_id('psk'), p_sk_id, 'dikembalikan', v_me.id, p_catatan, now());

  UPDATE public.surat_keluar SET status = 'perlu_revisi', updated_at = now() WHERE id = p_sk_id;

  PERFORM public.app_riwayat(NULL, p_sk_id, 'Perlu Revisi',
    format('Kepala Dinas (%s) menolak penandatanganan dan mengembalikan konsep surat. Catatan: %s', v_me.nama, p_catatan));

  PERFORM public.app_notif(v_sk.penyusun_id, 'Konsep Surat Ditolak Kepala Dinas',
    format('Kepala Dinas menolak konsep surat Anda dengan catatan: %s', p_catatan),
    '/surat-keluar/' || p_sk_id);

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_terbitkan_nomor_surat(p_sk_id text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_me  public.users;
  v_sk  public.surat_keluar;
  v_klas record;
  v_tahun int;
  v_bulan_romawi text;
  v_urut int;
  v_nomor text;
BEGIN
  v_me := public.app_require_role(ARRAY['petugas_surat','admin']);

  SELECT * INTO v_sk FROM public.surat_keluar s WHERE s.id = p_sk_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Surat keluar tidak ditemukan.'; END IF;

  -- Idempoten: bila sudah punya nomor, kembalikan yang lama.
  IF v_sk.nomor_surat IS NOT NULL AND v_sk.nomor_surat <> '' THEN
    RETURN jsonb_build_object('nomorSurat', v_sk.nomor_surat, 'nomorUrut', v_sk.nomor_urut, 'idempoten', true);
  END IF;

  IF v_sk.status NOT IN ('ditandatangani','nomor_diterbitkan') THEN
    RAISE EXCEPTION 'Nomor surat keluar hanya dapat diterbitkan setelah surat berstatus Ditandatangani oleh Kepala Dinas.';
  END IF;

  SELECT * INTO v_klas FROM public.klasifikasi_surat k WHERE k.id = v_sk.klasifikasi_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Klasifikasi tidak valid.'; END IF;

  v_tahun := EXTRACT(YEAR FROM now())::int;
  v_bulan_romawi := (ARRAY['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'])[EXTRACT(MONTH FROM now())::int];
  v_urut := public.app_next_nomor(v_tahun, 'surat_keluar');
  v_nomor := v_klas.kode || '/' || v_urut::text || '/DISTAN-MS/' || v_bulan_romawi || '/' || v_tahun::text;

  UPDATE public.surat_keluar SET
    nomor_surat = v_nomor,
    nomor_urut = v_urut,
    status = 'nomor_diterbitkan',
    updated_at = now()
  WHERE id = p_sk_id;

  PERFORM public.app_riwayat(NULL, p_sk_id, 'Nomor Diterbitkan',
    format('Nomor surat resmi diterbitkan: %s oleh %s. Silakan lengkapi berkas dan tanggal pengiriman.', v_nomor, v_me.nama));

  RETURN jsonb_build_object('nomorSurat', v_nomor, 'nomorUrut', v_urut);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_kirim_surat_keluar(
  p_sk_id        text,
  p_tanggal_kirim date,
  p_berkas_path  text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_me    public.users;
  v_sk    public.surat_keluar;
  v_tahun int;
  v_sm    public.surat_masuk;
  v_disp  public.disposisi;
  v_all_done boolean;
BEGIN
  v_me := public.app_require_role(ARRAY['petugas_surat']);

  SELECT * INTO v_sk FROM public.surat_keluar s WHERE s.id = p_sk_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Surat tidak ditemukan.'; END IF;
  IF v_sk.status <> 'nomor_diterbitkan' THEN
    RAISE EXCEPTION 'Nomor surat harus diterbitkan terlebih dahulu sebelum pengiriman.';
  END IF;
  IF p_tanggal_kirim IS NULL THEN
    RAISE EXCEPTION 'Tanggal pengiriman wajib diisi.';
  END IF;

  v_tahun := EXTRACT(YEAR FROM now())::int;

  UPDATE public.surat_keluar SET
    status = 'terkirim',
    tanggal_kirim = p_tanggal_kirim,
    berkas_path = COALESCE(NULLIF(p_berkas_path,''), NULLIF(v_sk.berkas_path,''), '/docs/final.pdf'),
    updated_at = now()
  WHERE id = p_sk_id;

  PERFORM public.app_riwayat(NULL, p_sk_id, 'Terkirim',
    format('Surat resmi nomor %s dikirimkan kepada %s pada %s dan dibuat entri arsip digital oleh %s.',
           COALESCE(v_sk.nomor_surat,'-'), v_sk.tujuan, to_char(p_tanggal_kirim,'DD/MM/YYYY'), v_me.nama));

  PERFORM public.app_auto_arsip('keluar', p_sk_id, COALESCE(v_sk.nomor_urut::text, '1'),
    COALESCE(NULLIF(p_berkas_path,''), v_sk.berkas_path, '/docs/final.pdf'),
    v_sk.perihal, COALESCE(v_sk.nomor_surat,'-'), v_sk.klasifikasi_id, v_tahun, v_sk.jenis_surat_id,
    jsonb_build_object('status_arsip', 'menunggu_verifikasi', 'tanggal_selesai', now()::text));

  -- Surat keluar sebagai balasan → boleh menutup surat masuk asal
  IF v_sk.surat_masuk_asal_id IS NOT NULL THEN
    SELECT * INTO v_sm   FROM public.surat_masuk s WHERE s.id = v_sk.surat_masuk_asal_id;
    SELECT * INTO v_disp FROM public.disposisi d WHERE d.surat_masuk_id = v_sk.surat_masuk_asal_id LIMIT 1;

    IF v_sm.id IS NOT NULL AND v_disp.id IS NOT NULL THEN
      SELECT (NOT EXISTS (
        SELECT 1 FROM public.disposisi_bidang_tujuan t
        WHERE t.disposisi_id = v_disp.id
          AND t.status_proses NOT IN ('selesai','ditindak_langsung')
      )) INTO v_all_done;

      IF v_all_done THEN
        UPDATE public.surat_masuk SET status = 'selesai', updated_at = now() WHERE id = v_sm.id;
        UPDATE public.disposisi   SET status = 'selesai', updated_at = now() WHERE id = v_disp.id;

        PERFORM public.app_auto_arsip('masuk', v_sm.id, v_sm.nomor_agenda,
          v_sm.berkas_path, v_sm.perihal, v_sm.nomor_surat_asal, v_sm.klasifikasi_id,
          EXTRACT(YEAR FROM v_sm.tanggal_terima)::int, v_sm.jenis_surat_id,
          jsonb_build_object(
            'status_arsip', 'menunggu_verifikasi',
            'tanggal_selesai', now()::text,
            'surat_balasan_id', p_sk_id,
            'surat_balasan_nomor', v_sk.nomor_surat,
            'surat_balasan_perihal', v_sk.perihal,
            'is_surat_balasan', true));
      END IF;
    END IF;
  END IF;

  IF v_sk.penyusun_id <> v_me.id THEN
    PERFORM public.app_notif(v_sk.penyusun_id, 'Surat Keluar Terkirim & Diarsipkan',
      format('Surat keluar perihal "%s" telah resmi dikirim dan diarsipkan.', v_sk.perihal),
      '/surat-keluar/' || p_sk_id);
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_bukti_terima(
  p_sk_id           text,
  p_tanggal_diterima date,
  p_nama_penerima   text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_me public.users;
  v_sk  public.surat_keluar;
BEGIN
  v_me := public.app_require_role(ARRAY['petugas_surat','admin']);

  SELECT * INTO v_sk FROM public.surat_keluar s WHERE s.id = p_sk_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Surat tidak ditemukan.'; END IF;
  IF v_sk.status <> 'terkirim' THEN
    RAISE EXCEPTION 'Bukti terima hanya dapat diisi setelah surat berstatus Terkirim.';
  END IF;
  IF p_tanggal_diterima IS NULL THEN RAISE EXCEPTION 'Tanggal diterima wajib diisi.'; END IF;
  IF p_nama_penerima IS NULL OR btrim(p_nama_penerima) = '' THEN
    RAISE EXCEPTION 'Nama penerima di tujuan wajib diisi.';
  END IF;

  UPDATE public.surat_keluar SET
    bukti_terima_tanggal = p_tanggal_diterima,
    bukti_terima_nama = btrim(p_nama_penerima),
    updated_at = now()
  WHERE id = p_sk_id;

  PERFORM public.app_riwayat(NULL, p_sk_id, 'Bukti Terima Dicatat',
    format('Bukti terima dicatat: diterima oleh "%s" pada %s.', btrim(p_nama_penerima), to_char(p_tanggal_diterima,'DD/MM/YYYY')));

  PERFORM public.app_log('Catat Bukti Terima',
    format('Mencatat bukti terima surat %s kepada "%s"', COALESCE(v_sk.nomor_surat, v_sk.id), btrim(p_nama_penerima)));

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- =============================================================================
-- 4. ARSIP DIGITAL
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_verifikasi_arsip(p_arsip_id text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_me   public.users;
  v_arsip public.arsip_digital;
BEGIN
  v_me := public.app_require_role(ARRAY['petugas_surat','admin']);

  SELECT * INTO v_arsip FROM public.arsip_digital a WHERE a.id = p_arsip_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Arsip digital tidak ditemukan.'; END IF;

  UPDATE public.arsip_digital SET status_arsip = 'diarsipkan', updated_at = now() WHERE id = p_arsip_id;

  PERFORM public.app_log('Verifikasi & Kunci Arsip Digital',
    format('Petugas Surat (%s) memverifikasi kode klasifikasi arsip %s dan mengesahkan status diarsipkan (terkunci/read-only).', v_me.nama, v_arsip.kode_arsip));

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_koreksi_metadata_arsip(
  p_arsip_id           text,
  p_perihal_baru       text DEFAULT NULL,
  p_klasifikasi_id_baru text DEFAULT NULL,
  p_alasan             text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_me    public.users;
  v_arsip public.arsip_digital;
  v_klas  record;
  v_perubahan text[] := ARRAY[]::text[];
  v_kode text;
BEGIN
  v_me := public.app_require_role(ARRAY['petugas_surat']);

  IF p_alasan IS NULL OR btrim(p_alasan) = '' THEN
    RAISE EXCEPTION 'Alasan koreksi wajib diisi.';
  END IF;

  SELECT * INTO v_arsip FROM public.arsip_digital a WHERE a.id = p_arsip_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Arsip tidak ditemukan.'; END IF;
  IF (p_perihal_baru IS NULL OR p_perihal_baru = '') AND (p_klasifikasi_id_baru IS NULL OR p_klasifikasi_id_baru = '') THEN
    RAISE EXCEPTION 'Pilih minimal satu field yang akan dikoreksi.';
  END IF;

  IF p_perihal_baru IS NOT NULL AND btrim(p_perihal_baru) <> v_arsip.perihal THEN
    v_perubahan := array_append(v_perubahan, 'Perihal: "' || v_arsip.perihal || '" → "' || btrim(p_perihal_baru) || '"');
  END IF;

  IF p_klasifikasi_id_baru IS NOT NULL AND p_klasifikasi_id_baru <> v_arsip.klasifikasi_id THEN
    SELECT * INTO v_klas FROM public.klasifikasi_surat k WHERE k.id = p_klasifikasi_id_baru;
    IF NOT FOUND THEN RAISE EXCEPTION 'Kode klasifikasi tidak valid.'; END IF;
    v_kode := v_klas.kode || '/' || v_arsip.tahun::text || '/' ||
              regexp_replace(COALESCE(split_part(v_arsip.kode_arsip,'/',3), '1'), '^0+', '');
    v_perubahan := array_append(v_perubahan, 'Klasifikasi: "' || v_arsip.kode_arsip || '" → "' || v_klas.kode || ' — ' || v_klas.nama || '"');

    UPDATE public.arsip_digital SET
      klasifikasi_id = p_klasifikasi_id_baru,
      kode_arsip = v_kode,
      updated_at = now()
    WHERE id = p_arsip_id;
  END IF;

  IF array_length(v_perubahan, 1) IS NULL THEN
    RAISE EXCEPTION 'Tidak ada perubahan yang terdeteksi.';
  END IF;

  IF p_perihal_baru IS NOT NULL AND btrim(p_perihal_baru) <> v_arsip.perihal THEN
    UPDATE public.arsip_digital SET perihal = btrim(p_perihal_baru), updated_at = now() WHERE id = p_arsip_id;
  END IF;

  PERFORM public.app_log('Koreksi Metadata Arsip',
    format('Arsip %s dikoreksi. %s. Alasan: %s', p_arsip_id, array_to_string(v_perubahan, '; '), btrim(p_alasan)));

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- =============================================================================
-- 5. NOTIFIKASI
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_tandai_notifikasi_dibaca(p_notifikasi_id text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_me public.users;
BEGIN
  v_me := public.app_require_role(ARRAY['admin','petugas_surat','sekretaris','kepala_dinas','kepala_bidang','staf_pelaksana']);

  IF p_notifikasi_id IS NULL OR p_notifikasi_id = '' THEN
    UPDATE public.notifikasi SET dibaca = true WHERE user_id = v_me.id AND dibaca = false;
  ELSE
    UPDATE public.notifikasi SET dibaca = true WHERE id = p_notifikasi_id AND user_id = v_me.id;
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- =============================================================================
-- 6. ADMIN — PENGGUNA
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_tambah_pengguna(
  p_nama  text,
  p_email text,
  p_role  text,
  p_unit_kerja_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_me   public.users;
  v_unit text;
  v_target record;
  v_id   text;
BEGIN
  v_me := public.app_require_role(ARRAY['admin']);

  IF p_nama IS NULL OR p_email IS NULL OR p_role IS NULL THEN
    RAISE EXCEPTION 'Nama, email, dan peran wajib diisi.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.users u WHERE lower(u.email::text) = lower(p_email)) THEN
    RAISE EXCEPTION 'Email sudah terdaftar.';
  END IF;

  IF p_role IN ('kepala_dinas','admin') THEN
    v_unit := NULL;
  ELSIF p_role IN ('sekretaris','petugas_surat') THEN
    SELECT u.id INTO v_unit FROM public.unit_kerja u WHERE u.jenis = 'sekretariat' LIMIT 1;
    IF v_unit IS NULL THEN RAISE EXCEPTION 'Unit kerja Sekretariat tidak ditemukan.'; END IF;
  ELSE
    IF p_unit_kerja_id IS NULL OR p_unit_kerja_id = '' THEN
      RAISE EXCEPTION 'Kombinasi tidak valid: Peran % wajib memiliki Unit Kerja / Bidang.', p_role;
    END IF;
    SELECT * INTO v_target FROM public.unit_kerja u WHERE u.id = p_unit_kerja_id;
    IF NOT FOUND OR v_target.jenis <> 'bidang' OR NOT v_target.aktif THEN
      RAISE EXCEPTION 'Unit kerja yang dipilih harus berupa bidang yang aktif.';
    END IF;
    IF p_role = 'kepala_bidang' AND EXISTS (
      SELECT 1 FROM public.users u WHERE u.role = 'kepala_bidang' AND u.aktif AND u.unit_kerja_id = p_unit_kerja_id
    ) THEN
      RAISE EXCEPTION 'Bidang sudah memiliki Kepala Bidang aktif.';
    END IF;
    v_unit := p_unit_kerja_id;
  END IF;

  v_id := public.app_new_id('u');
  INSERT INTO public.users (id, nama, email, role, unit_kerja_id, aktif, created_at, updated_at)
  VALUES (v_id, p_nama, p_email, p_role, v_unit, true, now(), now());

  PERFORM public.app_log('Buat Akun', format('Membuat akun baru untuk %s (%s)', p_nama, p_role));

  RETURN jsonb_build_object('id', v_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_ubah_pengguna(
  p_user_id       text,
  p_nama          text,
  p_email         text,
  p_role          text,
  p_unit_kerja_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_me     public.users;
  v_target public.users;
  v_unit   text;
  v_uk     record;
BEGIN
  v_me := public.app_require_role(ARRAY['admin']);

  SELECT * INTO v_target FROM public.users u WHERE u.id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pengguna tidak ditemukan.'; END IF;
  IF p_nama IS NULL OR p_email IS NULL OR p_role IS NULL THEN
    RAISE EXCEPTION 'Nama, email, dan peran wajib diisi.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.users u WHERE lower(u.email::text) = lower(p_email) AND u.id <> p_user_id) THEN
    RAISE EXCEPTION 'Email sudah digunakan pengguna lain.';
  END IF;

  IF p_role IN ('kepala_dinas','admin') THEN
    v_unit := NULL;
  ELSIF p_role IN ('sekretaris','petugas_surat') THEN
    SELECT u.id INTO v_unit FROM public.unit_kerja u WHERE u.jenis = 'sekretariat' LIMIT 1;
    IF v_unit IS NULL THEN RAISE EXCEPTION 'Unit kerja Sekretariat tidak ditemukan.'; END IF;
  ELSE
    IF p_unit_kerja_id IS NULL OR p_unit_kerja_id = '' THEN
      RAISE EXCEPTION 'Kombinasi tidak valid: Peran % wajib memiliki Unit Kerja / Bidang.', p_role;
    END IF;
    SELECT * INTO v_uk FROM public.unit_kerja u WHERE u.id = p_unit_kerja_id;
    IF NOT FOUND OR v_uk.jenis <> 'bidang' OR NOT v_uk.aktif THEN
      RAISE EXCEPTION 'Unit kerja yang dipilih harus berupa bidang yang aktif.';
    END IF;
    IF p_role = 'kepala_bidang' AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.role = 'kepala_bidang' AND u.aktif AND u.unit_kerja_id = p_unit_kerja_id AND u.id <> p_user_id
    ) THEN
      RAISE EXCEPTION 'Bidang sudah memiliki Kepala Bidang aktif.';
    END IF;
    v_unit := p_unit_kerja_id;
  END IF;

  UPDATE public.users SET
    nama = p_nama, email = p_email, role = p_role, unit_kerja_id = v_unit, updated_at = now()
  WHERE id = p_user_id;

  PERFORM public.app_log('Ubah Data Pengguna',
    format('Mengubah data akun %s (Peran: %s)', p_nama, p_role));

  RETURN jsonb_build_object('id', p_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_toggle_pengguna(p_user_id text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_me     public.users;
  v_target public.users;
  v_baru   boolean;
BEGIN
  v_me := public.app_require_role(ARRAY['admin']);

  SELECT * INTO v_target FROM public.users u WHERE u.id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pengguna tidak ditemukan.'; END IF;
  IF v_target.id = v_me.id THEN
    RAISE EXCEPTION 'Tidak dapat menonaktifkan akun sendiri.';
  END IF;

  v_baru := NOT v_target.aktif;

  IF v_baru AND v_target.role = 'kepala_bidang' AND EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.role = 'kepala_bidang' AND u.aktif AND u.unit_kerja_id = v_target.unit_kerja_id AND u.id <> p_user_id
  ) THEN
    RAISE EXCEPTION 'Bidang sudah memiliki Kepala Bidang aktif.';
  END IF;

  UPDATE public.users SET aktif = v_baru, updated_at = now() WHERE id = p_user_id;

  PERFORM public.app_log(CASE WHEN v_baru THEN 'Aktifkan Akun' ELSE 'Nonaktifkan Akun' END,
    format('%s akun %s', CASE WHEN v_baru THEN 'Mengaktifkan' ELSE 'Menonaktifkan' END, v_target.nama));

  RETURN jsonb_build_object('aktif', v_baru);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_set_tanda_tangan(p_user_id text, p_path text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_me public.users;
BEGIN
  v_me := public.app_require_role(ARRAY['admin','sekretaris','kepala_dinas','kepala_bidang','staf_pelaksana','petugas_surat']);
  IF v_me.role <> 'admin' AND v_me.id <> p_user_id THEN
    RAISE EXCEPTION 'Anda hanya memiliki wewenang untuk mengubah tanda tangan akun Anda sendiri.';
  END IF;

  UPDATE public.users SET url_tanda_tangan = NULLIF(p_path, ''), updated_at = now() WHERE id = p_user_id;

  PERFORM public.app_log('Perbarui Tanda Tangan Digital',
    format('%s memperbarui tanda tangan digital untuk pengguna ID %s', v_me.nama, p_user_id));

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- =============================================================================
-- 7. ADMIN — MASTER DATA
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_tambah_unit_kerja(
  p_kode         text,
  p_nama         text,
  p_label_lembar text DEFAULT NULL,
  p_urutan_lembar int DEFAULT NULL,
  p_jenis        text DEFAULT 'bidang'
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_me public.users;
  v_id text;
  v_urutan int;
BEGIN
  v_me := public.app_require_role(ARRAY['admin']);

  IF p_kode IS NULL OR p_nama IS NULL THEN
    RAISE EXCEPTION 'Kode dan nama unit kerja wajib diisi.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.unit_kerja u WHERE lower(u.kode) = lower(p_kode)) THEN
    RAISE EXCEPTION 'Kode unit kerja sudah ada.';
  END IF;

  SELECT COALESCE(MAX(urutan_lembar), 0) + 1 INTO v_urutan FROM public.unit_kerja;
  v_id := public.app_new_id('uk');

  INSERT INTO public.unit_kerja (id, kode, nama, jenis, label_lembar, urutan_lembar, aktif, created_at, updated_at)
  VALUES (v_id, upper(p_kode), p_nama, COALESCE(p_jenis,'bidang'),
          COALESCE(p_label_lembar, p_nama), COALESCE(p_urutan_lembar, v_urutan), true, now(), now());

  PERFORM public.app_log('Tambah Unit Kerja', format('Menambah unit kerja %s (%s)', p_nama, p_kode));

  RETURN jsonb_build_object('id', v_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_ubah_unit_kerja(
  p_id            text,
  p_nama          text,
  p_label_lembar  text DEFAULT NULL,
  p_urutan_lembar int  DEFAULT NULL,
  p_kode          text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_me public.users;
  v_uk  public.unit_kerja;
  v_kode text;
BEGIN
  v_me := public.app_require_role(ARRAY['admin']);

  SELECT * INTO v_uk FROM public.unit_kerja u WHERE u.id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unit kerja tidak ditemukan.'; END IF;
  IF p_nama IS NULL OR btrim(p_nama) = '' THEN
    RAISE EXCEPTION 'Nama unit kerja wajib diisi.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.unit_kerja u WHERE u.id <> p_id AND lower(btrim(u.nama)) = lower(btrim(p_nama))) THEN
    RAISE EXCEPTION 'Nama unit kerja "%" sudah terdaftar.', p_nama;
  END IF;

  v_kode := COALESCE(NULLIF(btrim(p_kode), ''), v_uk.kode);
  IF EXISTS (SELECT 1 FROM public.unit_kerja u WHERE u.id <> p_id AND upper(btrim(u.kode)) = upper(v_kode)) THEN
    RAISE EXCEPTION 'Kode unit kerja "%" sudah terdaftar.', v_kode;
  END IF;

  UPDATE public.unit_kerja SET
    kode = v_kode,
    nama = p_nama,
    label_lembar = COALESCE(p_label_lembar, label_lembar),
    urutan_lembar = COALESCE(p_urutan_lembar, urutan_lembar),
    updated_at = now()
  WHERE id = p_id;

  PERFORM public.app_log('Ubah Unit Kerja', format('Mengubah unit kerja %s', p_nama));

  RETURN jsonb_build_object('id', p_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_toggle_unit_kerja(p_id text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_me public.users;
  v_uk  public.unit_kerja;
  v_baru boolean;
BEGIN
  v_me := public.app_require_role(ARRAY['admin']);

  SELECT * INTO v_uk FROM public.unit_kerja u WHERE u.id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unit kerja tidak ditemukan.'; END IF;
  IF v_uk.jenis = 'sekretariat' THEN
    RAISE EXCEPTION 'Unit berjenis sekretariat tidak dapat dinonaktifkan.';
  END IF;

  v_baru := NOT v_uk.aktif;
  UPDATE public.unit_kerja SET aktif = v_baru, updated_at = now() WHERE id = p_id;

  PERFORM public.app_log(CASE WHEN v_baru THEN 'Aktifkan Unit Kerja' ELSE 'Nonaktifkan Unit Kerja' END,
    format('%s unit kerja %s', CASE WHEN v_baru THEN 'Mengaktifkan' ELSE 'Menonaktifkan' END, v_uk.nama));

  RETURN jsonb_build_object('aktif', v_baru);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_hapus_unit_kerja(p_id text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_me   public.users;
  v_uk   public.unit_kerja;
  v_pengguna int;
  v_disposisi int;
  v_penugasan int;
  v_parts text[] := ARRAY[]::text[];
BEGIN
  v_me := public.app_require_role(ARRAY['admin']);

  SELECT * INTO v_uk FROM public.unit_kerja u WHERE u.id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unit kerja tidak ditemukan.'; END IF;
  IF v_uk.jenis = 'sekretariat' THEN
    RAISE EXCEPTION 'Unit berjenis sekretariat tidak dapat dihapus.';
  END IF;

  SELECT count(*) INTO v_pengguna FROM public.users WHERE unit_kerja_id = p_id;
  SELECT count(*) INTO v_disposisi FROM public.disposisi_bidang_tujuan WHERE unit_kerja_id = p_id;
  SELECT count(*) INTO v_penugasan FROM public.penugasan_staf ps
  JOIN public.users u ON u.id = ps.staf_id WHERE u.unit_kerja_id = p_id;

  IF v_pengguna > 0 THEN v_parts := array_append(v_parts, v_pengguna::text || ' pengguna'); END IF;
  IF v_disposisi > 0 THEN v_parts := array_append(v_parts, v_disposisi::text || ' disposisi'); END IF;
  IF v_penugasan > 0 THEN v_parts := array_append(v_parts, v_penugasan::text || ' penugasan'); END IF;

  IF array_length(v_parts, 1) IS NOT NULL THEN
    RAISE EXCEPTION 'Unit kerja masih digunakan oleh %. Nonaktifkan unit kerja sebagai gantinya.', array_to_string(v_parts, ', ');
  END IF;

  DELETE FROM public.unit_kerja WHERE id = p_id;

  PERFORM public.app_log('Hapus Unit Kerja', format('Menghapus unit kerja %s (%s)', v_uk.nama, v_uk.kode));

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_tambah_klasifikasi(
  p_kode            text,
  p_nama            text,
  p_uraian          text DEFAULT NULL,
  p_unit_kerja_id   text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_me public.users; v_id text;
BEGIN
  v_me := public.app_require_role(ARRAY['admin']);

  IF p_kode IS NULL OR p_nama IS NULL THEN
    RAISE EXCEPTION 'Kode dan nama klasifikasi wajib diisi.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.klasifikasi_surat k WHERE lower(k.kode) = lower(p_kode)) THEN
    RAISE EXCEPTION 'Kode klasifikasi sudah terdaftar.';
  END IF;

  v_id := public.app_new_id('kls');
  INSERT INTO public.klasifikasi_surat (id, kode, nama, uraian, unit_kerja_id, aktif, created_at, updated_at)
  VALUES (v_id, p_kode, p_nama, COALESCE(p_uraian,''), p_unit_kerja_id, true, now(), now());

  PERFORM public.app_log('Tambah Klasifikasi', format('Menambah klasifikasi surat %s - %s', p_kode, p_nama));

  RETURN jsonb_build_object('id', v_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_ubah_klasifikasi(
  p_id              text,
  p_nama            text,
  p_uraian          text DEFAULT NULL,
  p_kode            text DEFAULT NULL,
  p_unit_kerja_id  text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_me public.users; v_kls public.klasifikasi_surat; v_kode text;
BEGIN
  v_me := public.app_require_role(ARRAY['admin']);

  SELECT * INTO v_kls FROM public.klasifikasi_surat k WHERE k.id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Klasifikasi tidak ditemukan.'; END IF;
  IF p_nama IS NULL OR btrim(p_nama) = '' THEN
    RAISE EXCEPTION 'Nama klasifikasi wajib diisi.';
  END IF;

  v_kode := COALESCE(NULLIF(btrim(p_kode), ''), v_kls.kode);
  IF EXISTS (SELECT 1 FROM public.klasifikasi_surat k WHERE k.id <> p_id AND lower(btrim(k.kode)) = lower(v_kode)) THEN
    RAISE EXCEPTION 'Kode klasifikasi "%" sudah terdaftar.', v_kode;
  END IF;

  UPDATE public.klasifikasi_surat SET
    kode = v_kode,
    nama = p_nama,
    uraian = COALESCE(p_uraian, uraian),
    unit_kerja_id = CASE WHEN p_unit_kerja_id IS NULL THEN unit_kerja_id ELSE p_unit_kerja_id END,
    updated_at = now()
  WHERE id = p_id;

  PERFORM public.app_log('Ubah Klasifikasi', format('Mengubah klasifikasi surat %s - %s', v_kode, p_nama));

  RETURN jsonb_build_object('id', p_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_toggle_klasifikasi(p_id text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_me public.users; v_kls public.klasifikasi_surat; v_baru boolean;
BEGIN
  v_me := public.app_require_role(ARRAY['admin']);

  SELECT * INTO v_kls FROM public.klasifikasi_surat k WHERE k.id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Klasifikasi tidak ditemukan.'; END IF;

  v_baru := NOT v_kls.aktif;
  UPDATE public.klasifikasi_surat SET aktif = v_baru, updated_at = now() WHERE id = p_id;

  PERFORM public.app_log(CASE WHEN v_baru THEN 'Aktifkan Klasifikasi' ELSE 'Nonaktifkan Klasifikasi' END,
    format('%s klasifikasi %s', CASE WHEN v_baru THEN 'Mengaktifkan' ELSE 'Menonaktifkan' END, v_kls.kode));

  RETURN jsonb_build_object('aktif', v_baru);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_tambah_data_master(
  p_kategori   text,
  p_kode       text,
  p_label      text,
  p_keterangan text DEFAULT NULL,
  p_urutan     int  DEFAULT NULL,
  p_meta       jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_me public.users; v_id text; v_kode text; v_label text; v_urutan int;
BEGIN
  v_me := public.app_require_role(ARRAY['admin']);

  v_kode := lower(btrim(p_kode));
  v_label := btrim(p_label);
  IF v_kode = '' OR v_label = '' THEN
    RAISE EXCEPTION 'Kode dan label data master wajib diisi.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.data_master d WHERE d.kategori = p_kategori AND lower(d.kode) = v_kode) THEN
    RAISE EXCEPTION 'Kode "%" sudah terdaftar pada kategori ini. Gunakan kode yang unik.', p_kode;
  END IF;
  IF EXISTS (SELECT 1 FROM public.data_master d WHERE d.kategori = p_kategori AND lower(d.label) = lower(v_label)) THEN
    RAISE EXCEPTION 'Label "%" sudah terdaftar pada kategori ini. Gunakan label yang unik.', p_label;
  END IF;

  SELECT COALESCE(MAX(urutan), 0) + 1 INTO v_urutan FROM public.data_master WHERE kategori = p_kategori;
  v_id := public.app_new_id('dm');

  INSERT INTO public.data_master (id, kategori, kode, label, keterangan, aktif, urutan, meta, created_at, updated_at)
  VALUES (v_id, p_kategori, v_kode, v_label, COALESCE(btrim(p_keterangan), ''), true,
          COALESCE(p_urutan, v_urutan), COALESCE(p_meta, '{}'::jsonb), now(), now());

  PERFORM public.app_log('Tambah Data Master',
    format('Menambahkan master [%s]: %s (%s)', p_kategori, v_label, v_kode));

  RETURN jsonb_build_object('id', v_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_ubah_data_master(
  p_id         text,
  p_kode       text DEFAULT NULL,
  p_label      text DEFAULT NULL,
  p_keterangan text DEFAULT NULL,
  p_urutan     int  DEFAULT NULL,
  p_meta       jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_me public.users; v_item public.data_master; v_kode text; v_label text;
BEGIN
  v_me := public.app_require_role(ARRAY['admin']);

  SELECT * INTO v_item FROM public.data_master d WHERE d.id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Data master tidak ditemukan.'; END IF;

  v_kode := CASE WHEN p_kode IS NOT NULL THEN lower(btrim(p_kode)) ELSE v_item.kode END;
  v_label := CASE WHEN p_label IS NOT NULL THEN btrim(p_label) ELSE v_item.label END;

  IF v_kode = '' OR v_label = '' THEN
    RAISE EXCEPTION 'Kode dan label data master tidak boleh kosong.';
  END IF;
  IF v_kode <> v_item.kode AND EXISTS (
    SELECT 1 FROM public.data_master d WHERE d.id <> p_id AND d.kategori = v_item.kategori AND lower(d.kode) = v_kode
  ) THEN
    RAISE EXCEPTION 'Kode "%" sudah terdaftar pada kategori ini.', p_kode;
  END IF;
  IF lower(v_label) <> lower(v_item.label) AND EXISTS (
    SELECT 1 FROM public.data_master d WHERE d.id <> p_id AND d.kategori = v_item.kategori AND lower(d.label) = lower(v_label)
  ) THEN
    RAISE EXCEPTION 'Label "%" sudah terdaftar pada kategori ini.', p_label;
  END IF;

  UPDATE public.data_master SET
    kode = v_kode,
    label = v_label,
    keterangan = CASE WHEN p_keterangan IS NOT NULL THEN btrim(p_keterangan) ELSE keterangan END,
    urutan = COALESCE(p_urutan, urutan),
    meta = COALESCE(p_meta, meta),
    updated_at = now()
  WHERE id = p_id;

  PERFORM public.app_log('Ubah Data Master',
    format('Memperbarui master [%s]: %s (%s)', v_item.kategori, v_label, v_kode));

  RETURN jsonb_build_object('id', p_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_toggle_data_master(p_id text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_me public.users; v_item public.data_master; v_baru boolean;
BEGIN
  v_me := public.app_require_role(ARRAY['admin']);

  SELECT * INTO v_item FROM public.data_master d WHERE d.id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Data master tidak ditemukan.'; END IF;

  v_baru := NOT v_item.aktif;
  UPDATE public.data_master SET aktif = v_baru, updated_at = now() WHERE id = p_id;

  PERFORM public.app_log(CASE WHEN v_baru THEN 'Aktifkan Data Master' ELSE 'Nonaktifkan Data Master' END,
    format('%s master [%s]: %s', CASE WHEN v_baru THEN 'Mengaktifkan' ELSE 'Menonaktifkan' END, v_item.kategori, v_item.label));

  RETURN jsonb_build_object('aktif', v_baru);
END;
$$;

-- =============================================================================
-- 8. PENGINGAT & RESET
-- =============================================================================

-- Dipanggil pg_cron / service_role. Anti-spam lewat tabel reminder_log.
CREATE OR REPLACE FUNCTION public.rpc_proses_pengingat_batas_waktu(p_now timestamptz DEFAULT now())
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_reminder int := 0;
  v_overdue  int := 0;
  r          record;
BEGIN
  -- Pengingat: tenggat ≤ 24 jam ke depan, disposisi belum selesai
  FOR r IN
    SELECT d.id, d.tenggat, d.surat_masuk_id, t.unit_kerja_id, t.kepala_bidang_id
    FROM public.disposisi d
    JOIN public.disposisi_bidang_tujuan t ON t.disposisi_id = d.id
    WHERE d.status NOT IN ('selesai','dikembalikan')
      AND d.tenggat IS NOT NULL
      AND d.tenggat <= (p_now::date + 1)
      AND d.tenggat > p_now::date
  LOOP
    IF r.kepala_bidang_id IS NULL THEN CONTINUE; END IF;
    IF EXISTS (
      SELECT 1 FROM public.reminder_log rl
      WHERE rl.disposisi_id = r.id AND rl.jenis = 'reminder' AND rl.target_user_id = r.kepala_bidang_id
        AND rl.terkirim_at > p_now - interval '12 hours'
    ) THEN CONTINUE; END IF;

    INSERT INTO public.reminder_log (id, disposisi_id, jenis, target_user_id, terkirim_at)
    VALUES (public.app_new_id('rl'), r.id, 'reminder', r.kepala_bidang_id, p_now);

    INSERT INTO public.notifikasi (id, user_id, judul, pesan, tingkat, dibaca, created_at)
    VALUES (public.app_new_id('ntf'), r.kepala_bidang_id,
      'Peringatan: Tenggat Waktu Disposisi',
      'Disposisi di bidang Anda mendekati batas waktu penyelesaian.', 'peringatan', false, p_now);

    v_reminder := v_reminder + 1;
  END LOOP;

  -- Overdue: tenggat sudah lewat
  FOR r IN
    SELECT d.id, d.surat_masuk_id, t.kepala_bidang_id
    FROM public.disposisi d
    JOIN public.disposisi_bidang_tujuan t ON t.disposisi_id = d.id
    WHERE d.status NOT IN ('selesai','dikembalikan')
      AND d.tenggat IS NOT NULL
      AND d.tenggat < p_now::date
  LOOP
    IF r.kepala_bidang_id IS NULL THEN CONTINUE; END IF;
    IF EXISTS (
      SELECT 1 FROM public.reminder_log rl
      WHERE rl.disposisi_id = r.id AND rl.jenis = 'overdue' AND rl.target_user_id = r.kepala_bidang_id
        AND rl.terkirim_at > p_now - interval '12 hours'
    ) THEN CONTINUE; END IF;

    INSERT INTO public.reminder_log (id, disposisi_id, jenis, target_user_id, terkirim_at)
    VALUES (public.app_new_id('rl'), r.id, 'overdue', r.kepala_bidang_id, p_now);

    INSERT INTO public.notifikasi (id, user_id, judul, pesan, tingkat, dibaca, created_at)
    VALUES (public.app_new_id('ntf'), r.kepala_bidang_id,
      'Eskalasi: Disposisi Melewati Batas Waktu',
      'Disposisi di bidang Anda telah melewati batas waktu penyelesaian.', 'bahaya', false, p_now);

    v_overdue := v_overdue + 1;
  END LOOP;

  RETURN jsonb_build_object('reminder', v_reminder, 'overdue', v_overdue);
END;
$$;

-- Reset data surat (data pengguna & master TETAP UTUH).
CREATE OR REPLACE FUNCTION public.rpc_reset_data_surat()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.app_require_role(ARRAY['admin']);

  TRUNCATE TABLE
    public.tindak_lanjut,
    public.penugasan_staf,
    public.disposisi_bidang_tujuan,
    public.persetujuan_surat_keluar,
    public.arsip_digital,
    public.disposisi,
    public.surat_keluar,
    public.surat_masuk,
    public.riwayat_status,
    public.notifikasi,
    public.log_aktivitas,
    public.reminder_log,
    public.buku_ekspedisi_tujuan,
    public.buku_ekspedisi,
    public.nomor_surat_counter,
    public.import_legacy
  RESTART IDENTITY;

  PERFORM public.app_log('Reset Data Surat', 'Seluruh data surat dihapus (master & pengguna tetap utuh).');

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- =============================================================================
-- 9. HAK AKSES
-- =============================================================================

-- RPC internal: tidak boleh dipanggil langsung oleh pengguna.
REVOKE EXECUTE ON FUNCTION public.rpc_proses_pengingat_batas_waktu(timestamptz) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_proses_pengingat_batas_waktu(timestamptz) TO service_role;

-- Semua RPC lain: hanya role terautentikasi.
DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname LIKE 'rpc\_%'
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', f.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f.sig);
  END LOOP;
END $$;
