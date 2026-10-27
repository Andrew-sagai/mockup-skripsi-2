import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer, getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * Penyajian berkas privat.
 *
 * Berkas tidak pernah diekspos lewat URL Storage publik. Setiap permintaan
 * diperiksa terhadap RLS lebih dulu: baris yang boleh dilihat oleh sesi
 * pengguna akan ditemukan, berkas diunduh memakai service_role, lalu
 * dialirkan ke peramban.
 *
 * Format path: /api/files/<bucket>/<nama objek>
 */

// Pasangan (tabel, kolom) yang menyimpan path berkas.
const SUMBER_PATH: { tabel: string; kolom: string }[] = [
  { tabel: 'surat_masuk', kolom: 'berkas_path' },
  { tabel: 'surat_keluar', kolom: 'berkas_path' },
  { tabel: 'surat_keluar', kolom: 'ttd_image_path' },
  { tabel: 'surat_keluar', kolom: 'paraf_image_path' },
  { tabel: 'arsip_digital', kolom: 'berkas_path' },
  { tabel: 'arsip_digital', kolom: 'berkas_laporan_path' },
  { tabel: 'tindak_lanjut', kolom: 'berkas_path' },
  { tabel: 'persetujuan_surat_keluar', kolom: 'url_tanda_tangan_snapshot' },
  { tabel: 'users', kolom: 'url_tanda_tangan' },
];

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path: segmen } = await context.params;
  const bagian = (segmen ?? []).map((s) => decodeURIComponent(s));
  const bucket = bagian[0];
  const namaObjek = bagian.slice(1).join('/');

  if (!bucket || !namaObjek) {
    return NextResponse.json({ galat: 'Path berkas tidak lengkap.' }, { status: 400 });
  }
  if (!['berkas-surat', 'tanda-tangan'].includes(bucket)) {
    return NextResponse.json({ galat: 'Bucket tidak dikenal.' }, { status: 404 });
  }
  const path = `${bucket}/${namaObjek}`;

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json(
      { galat: 'Supabase belum dikonfigurasi. Isi .env.local lalu jalankan ulang aplikasi.' },
      { status: 503 }
    );
  }

  // Sesi wajib — berkas privat tidak boleh diakses tanpa login.
  const { data: sesi } = await supabase.auth.getUser();
  if (!sesi.user) {
    return NextResponse.json({ galat: 'Anda harus login.' }, { status: 401 });
  }

  // Cek visibilitas: RLS menyaring baris secara otomatis, jadi cukup
  // mencari apakah ada baris yang boleh dibaca oleh sesi ini.
  let terlihat = false;
  for (const { tabel, kolom } of SUMBER_PATH) {
    const { data } = await supabase
      .from(tabel)
      .select('id')
      .eq(kolom, path)
      .limit(1);
    if (data && data.length > 0) {
      terlihat = true;
      break;
    }
  }

  if (!terlihat) {
    return NextResponse.json(
      { galat: 'Berkas tidak ditemukan atau Anda tidak memiliki wewenang untuk membukanya.' },
      { status: 403 }
    );
  }

  // Unduh memakai service_role (melewati RLS) — akses sudah dijaga di atas.
  const admin = await getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { galat: 'SUPABASE_SERVICE_ROLE_KEY belum diisi pada .env.local.' },
      { status: 503 }
    );
  }

  const { data, error } = await admin.storage.from(bucket).download(namaObjek);
  if (error || !data) {
    return NextResponse.json({ galat: 'Berkas tidak ditemukan.' }, { status: 404 });
  }

  const buffer = await data.arrayBuffer();
  const tipe = data.type || 'application/octet-stream';

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': tipe,
      'Content-Length': String(buffer.byteLength),
      'Content-Disposition': `inline; filename="${namaObjek.split('/').pop() ?? 'berkas'}"`,
      'Cache-Control': 'private, max-age=0, must-revalidate',
    },
  });
}

/**
 * Pemeriksaan cepat ketersediaan berkas tanpa mengunduh isinya.
 * Dipakai penampil PDF untuk memastikan berkas benar-benar PDF sebelum
 * menaruhnya di dalam iframe.
 */
export async function HEAD(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path: segmen } = await context.params;
  const bagian = (segmen ?? []).map((s) => decodeURIComponent(s));
  const bucket = bagian[0];
  const namaObjek = bagian.slice(1).join('/');

  if (!bucket || !namaObjek || !['berkas-surat', 'tanda-tangan'].includes(bucket)) {
    return new NextResponse(null, { status: 404 });
  }
  const path = `${bucket}/${namaObjek}`;

  const supabase = await getSupabaseServer();
  if (!supabase) return new NextResponse(null, { status: 503 });

  const { data: sesi } = await supabase.auth.getUser();
  if (!sesi.user) return new NextResponse(null, { status: 401 });

  for (const { tabel, kolom } of SUMBER_PATH) {
    const { data } = await supabase
      .from(tabel)
      .select('id')
      .eq(kolom, path)
      .limit(1);
    if (data && data.length > 0) {
      return new NextResponse(null, {
        status: 200,
        headers: { 'Content-Type': 'application/octet-stream' },
      });
    }
  }

  return new NextResponse(null, { status: 403 });
}
