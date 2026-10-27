-- =============================================================================
-- 0006_cron.sql — Penjadwalan pengingat batas waktu disposisi
--
-- Menjalankan `rpc_proses_pengingat_batas_waktu()` setiap 30 menit lewat
-- pg_cron. Fungsi tersebut sudah menolak eksekusi oleh `public`/`anon`/
-- `authenticated` (lihat 0003_rpc.sql); penjadwalan memakai kredensial
-- postgres sehingga tetap bisa memanggilnya.
--
-- Ekstensi `pg_cron` TIDAK selalu aktif. Bila belum aktif, blok di bawah
-- hanya mengeluarkan NOTICE — bukan error — supaya migrasi tetap aman
-- dijalankan. Aktifkan lewat Dashboard → Database → Extensions → pg_cron,
-- lalu jalankan ulang berkas ini.
--
-- Alternatif tanpa pg_cron: route server `GET /api/cron/reminder` dengan
-- header `x-cron-secret` (lihat docs/PANDUAN-SUPABASE.md).
-- =============================================================================

DO $mig$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE 'pg_cron belum aktif — penjadwalan pengingat dilewati. Aktifkan extension pg_cron di Dashboard → Database → Extensions, lalu jalankan ulang 0006_cron.sql.';
    RETURN;
  END IF;

  -- Hapus jadwal lama bila ada (unschedule gagal bila job belum pernah dibuat).
  BEGIN
    PERFORM cron.unschedule('pengingat-batas-waktu');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  PERFORM cron.schedule(
    'pengingat-batas-waktu',
    '*/30 * * * *',
    $sql$SELECT public.rpc_proses_pengingat_batas_waktu()$sql$
  );

  RAISE NOTICE 'Penjadwalan pengingat batas waktu aktif: setiap 30 menit.';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Gagal menjadwalkan pengingat batas waktu: %', SQLERRM;
END;
$mig$;
