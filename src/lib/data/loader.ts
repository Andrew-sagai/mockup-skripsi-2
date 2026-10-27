import type {
  ArsipDigital,
  BukuEkspedisi,
  BukuEkspedisiTujuan,
  DataMasterItem,
  Disposisi,
  DisposisiTujuan,
  JenisSurat,
  KlasifikasiSurat,
  LogAktivitas,
  Notifikasi,
  NomorSuratCounter,
  PenugasanStaf,
  PersetujuanSuratKeluar,
  PengaturanInstansi,
  RiwayatStatus,
  StatusPerBidangItem,
  SuratKeluar,
  SuratMasuk,
  TindakLanjut,
  UnitKerja,
  User,
} from '@/lib/types';
import { ambil } from './supabase';
import { urlBerkas } from './berkas';
import {
  keArsip,
  keBukuEkspedisi,
  keBukuEkspedisiTujuan,
  keDataMaster,
  keDisposisi,
  keDisposisiTujuan,
  keJenisSurat,
  keKlasifikasi,
  keLog,
  keNotifikasi,
  kePenugasan,
  kePersetujuan,
  kePengaturan,
  keRiwayat,
  keSuratKeluar,
  keSuratMasuk,
  keTindakLanjut,
  keUnitKerja,
  keUser,
} from './mappers';

/** Kumpulan data aplikasi yang dimuat dari Postgres. */
export interface DataTermuat {
  pengaturanInstansi: PengaturanInstansi;
  unitKerja: UnitKerja[];
  users: User[];
  klasifikasi: KlasifikasiSurat[];
  jenisSurat: JenisSurat[];
  dataMaster: DataMasterItem[];
  suratMasuk: SuratMasuk[];
  disposisi: Disposisi[];
  penugasan: PenugasanStaf[];
  tindakLanjut: TindakLanjut[];
  suratKeluar: SuratKeluar[];
  persetujuan: PersetujuanSuratKeluar[];
  arsip: ArsipDigital[];
  notifikasi: Notifikasi[];
  riwayat: RiwayatStatus[];
  log: LogAktivitas[];
  nomorSuratCounter: NomorSuratCounter[];
  bukuEkspedisi: BukuEkspedisi[];
}

/**
 * Muat seluruh data yang terlihat oleh pengguna saat ini.
 * RLS di Postgres yang menyaring baris, jadi tidak perlu filter peran di sini.
 */
export async function muatSemuaData(): Promise<DataTermuat> {
  const [
    pengaturan,
    unitKerjaRows,
    userRows,
    klasifikasiRows,
    jenisSuratRows,
    dataMasterRows,
    suratMasukRows,
    disposisiRows,
    tujuanRows,
    penugasanRows,
    tindakLanjutRows,
    suratKeluarRows,
    persetujuanRows,
    arsipRows,
    notifikasiRows,
    riwayatRows,
    logRows,
    counterRows,
    ekspedisiRows,
    ekspedisiTujuanRows,
  ] = await Promise.all([
    ambil('pengaturan_instansi', { select: '*', eq: { id: 'pengaturan-1' } }),
    ambil('unit_kerja', { order: [{ kolom: 'kode', arah: 'asc' }] }),
    ambil('users', { order: [{ kolom: 'nama', arah: 'asc' }] }),
    ambil('klasifikasi_surat', { order: [{ kolom: 'kode', arah: 'asc' }] }),
    ambil('jenis_surat', { order: [{ kolom: 'nama', arah: 'asc' }] }),
    ambil('data_master', { order: [{ kolom: 'urutan', arah: 'asc' }] }),
    ambil('surat_masuk', { order: [{ kolom: 'nomor_urut', arah: 'desc' }] }),
    ambil('disposisi', { order: [{ kolom: 'created_at', arah: 'desc' }] }),
    ambil('disposisi_bidang_tujuan', { order: [{ kolom: 'urutan', arah: 'asc' }] }),
    ambil('penugasan_staf', { order: [{ kolom: 'created_at', arah: 'desc' }] }),
    ambil('tindak_lanjut', { order: [{ kolom: 'created_at', arah: 'desc' }] }),
    ambil('surat_keluar', { order: [{ kolom: 'created_at', arah: 'desc' }] }),
    ambil('persetujuan_surat_keluar', { order: [{ kolom: 'waktu', arah: 'desc' }] }),
    ambil('arsip_digital', { order: [{ kolom: 'created_at', arah: 'desc' }] }),
    ambil('notifikasi', { order: [{ kolom: 'created_at', arah: 'desc' }] }),
    ambil('riwayat_status', { order: [{ kolom: 'waktu', arah: 'desc' }] }),
    ambil('log_aktivitas', { order: [{ kolom: 'waktu', arah: 'desc' }] }),
    ambil('nomor_surat_counter', { order: [{ kolom: 'tahun', arah: 'desc' }] }),
    ambil('buku_ekspedisi', { order: [{ kolom: 'tanggal', arah: 'asc' }] }),
    ambil('buku_ekspedisi_tujuan', { order: [{ kolom: 'urutan', arah: 'asc' }] }),
  ]);

  const unitKerja = unitKerjaRows.map(keUnitKerja);
  const users = userRows.map(keUser);
  const klasifikasi = klasifikasiRows.map(keKlasifikasi);
  const jenisSurat = jenisSuratRows.map(keJenisSurat);
  const dataMaster = dataMasterRows.map(keDataMaster);
  const suratMasuk = suratMasukRows.map(keSuratMasuk);
  const penugasan = penugasanRows.map(kePenugasan);
  const tindakLanjut = tindakLanjutRows.map(keTindakLanjut);
  const suratKeluar = suratKeluarRows.map(keSuratKeluar);
  const persetujuan = persetujuanRows.map(kePersetujuan);
  const arsip = arsipRows.map(keArsip);
  const notifikasi = notifikasiRows.map(keNotifikasi);
  const riwayat = riwayatRows.map(keRiwayat);
  const log = logRows.map(keLog);
  const nomorSuratCounter: NomorSuratCounter[] = counterRows.map((r: any) => ({
    tahun: r.tahun,
    klasifikasiKode: r.jenis_surat,
    counter: r.counter ?? 0,
  }));

  // Buku ekspedisi: baris utama digabung dengan daftar tujuan/parafnya.
  const tujuanEkspedisi = ekspedisiTujuanRows.map(keBukuEkspedisiTujuan);
  const tujuanPerEkspedisi = new Map<string, BukuEkspedisiTujuan[]>();
  tujuanEkspedisi.forEach((t) => {
    const daftar = tujuanPerEkspedisi.get(t.ekspedisiId) ?? [];
    daftar.push(t);
    tujuanPerEkspedisi.set(t.ekspedisiId, daftar);
  });
  const bukuEkspedisi = ekspedisiRows.map((r) =>
    keBukuEkspedisi(r, tujuanPerEkspedisi.get(r.id) ?? [])
  );

  // ── Relation wiring ──────────────────────────────────────────────
  // Path Storage diubah menjadi URL /api/files yang diperiksa RLS.
  users.forEach((u) => {
    u.urlTandaTangan = urlBerkas(u.urlTandaTangan);
  });
  suratMasuk.forEach((s) => {
    s.berkasUrl = urlBerkas(s.berkasUrl);
  });
  suratKeluar.forEach((s) => {
    s.berkasUrl = urlBerkas(s.berkasUrl);
    s.ttdImageUrl = urlBerkas(s.ttdImageUrl);
    s.parafImageUrl = urlBerkas(s.parafImageUrl);
  });
  arsip.forEach((a) => {
    a.berkasUrl = urlBerkas(a.berkasUrl);
    a.berkasLaporanUrl = urlBerkas(a.berkasLaporanUrl);
  });
  tindakLanjut.forEach((t) => {
    t.berkasUrl = urlBerkas(t.berkasUrl);
  });
  persetujuan.forEach((p) => {
    p.urlTandaTanganSnapshot = urlBerkas(p.urlTandaTanganSnapshot);
  });

  const unitOleih = new Map(unitKerja.map((u) => [u.id, u]));
  const userOleih = new Map(users.map((u) => [u.id, u]));
  const klasOleih = new Map(klasifikasi.map((k) => [k.id, k]));
  const jenisOleih = new Map(jenisSurat.map((j) => [j.id, j]));
  const suratMasukOleih = new Map(suratMasuk.map((s) => [s.id, s]));
  const disposisiOleih = new Map<string, Disposisi>();

  users.forEach((u) => {
    u.unitKerja = u.unitKerjaId ? unitOleih.get(u.unitKerjaId) : undefined;
  });

  suratMasuk.forEach((s) => {
    s.klasifikasi = klasOleih.get(s.klasifikasiId);
    s.jenisSuratObj = s.jenisSuratId ? jenisOleih.get(s.jenisSuratId) : undefined;
    s.pencatat = userOleih.get(s.pencatatId);
  });

  suratKeluar.forEach((s) => {
    s.klasifikasi = klasOleih.get(s.klasifikasiId);
    s.jenisSuratObj = s.jenisSuratId ? jenisOleih.get(s.jenisSuratId) : undefined;
    s.penyusun = userOleih.get(s.penyusunId);
  });

  arsip.forEach((a) => {
    a.klasifikasi = klasOleih.get(a.klasifikasiId);
    a.jenisSuratObj = a.jenisSuratId ? jenisOleih.get(a.jenisSuratId) : undefined;
  });

  // Tujuan disposisi dikelompokkan per disposisi.
  const tujuanPerDisposisi = new Map<string, DisposisiTujuan[]>();
  tujuanRows.map(keDisposisiTujuan).forEach((t) => {
    t.unitKerja = unitOleih.get(t.unitKerjaId);
    t.kepalaBidang = t.kepalaBidangId ? userOleih.get(t.kepalaBidangId) : undefined;
    const daftar = tujuanPerDisposisi.get(t.disposisiId) ?? [];
    daftar.push(t);
    tujuanPerDisposisi.set(t.disposisiId, daftar);
  });

  // Laporan tindak lanjut per bidang tujuan (untuk uraian hasil pada statusPerBidang).
  const penugasanPerDisposisi = new Map<string, PenugasanStaf[]>();
  penugasan.forEach((p) => {
    p.staf = userOleih.get(p.stafId);
    p.kepalaBidang = userOleih.get(p.kepalaBidangId);
    const daftar = penugasanPerDisposisi.get(p.disposisiId) ?? [];
    daftar.push(p);
    penugasanPerDisposisi.set(p.disposisiId, daftar);
  });

  const kabidPerUnit = new Map<string, string>();
  users.forEach((u) => {
    if (u.role === 'kepala_bidang' && u.unitKerjaId) kabidPerUnit.set(u.unitKerjaId, u.id);
  });

  const hasilPerBidang = new Map<string, string>();
  const catatHasil = (kunci: string, uraian: string) => {
    if (!hasilPerBidang.has(kunci)) hasilPerBidang.set(kunci, uraian);
  };
  tindakLanjut.forEach((tl) => {
    const penugasan = penugasanPerDisposisi.get(tl.disposisiId) ?? [];
    if (tl.penugasanStafId) {
      const p = penugasan.find((x) => x.id === tl.penugasanStafId);
      if (p) catatHasil(`${tl.disposisiId}:${p.stafId}`, tl.uraianHasil);
    }
    const kabidId = kabidPerUnit.get(
      penugasan.find((p) => p.stafId === tl.pelakuId)?.kepalaBidangId ?? ''
    );
    if (kabidId) catatHasil(`${tl.disposisiId}:${kabidId}`, tl.uraianHasil);
  });

  const disposisi = disposisiRows.map(keDisposisi);
  disposisi.forEach((d) => {
    const tujuan = tujuanPerDisposisi.get(d.id) ?? [];
    d.bidangTujuan = tujuan;
    d.suratMasuk = suratMasukOleih.get(d.suratMasukId);

    const statusPerBidang: Record<string, StatusPerBidangItem> = {};
    tujuan.forEach((t) => {
      const status = (t.statusProses ?? 'menunggu') as StatusPerBidangItem['status'];
      statusPerBidang[t.unitKerjaId] = {
        status,
        diterimaOleh: t.namaPenerimaSnapshot,
        diterimaWaktu: t.waktuTerima,
        diteruskanKe: t.diteruskanKe,
        catatanPenugasan: t.catatanPenugasan,
        uraianHasil:
          hasilPerBidang.get(`${d.id}:${t.diteruskanKe ?? ''}`) ??
          hasilPerBidang.get(`${d.id}:${t.kepalaBidangId ?? ''}`),
      };
    });
    d.statusPerBidang = statusPerBidang;
    disposisiOleih.set(d.id, d);
  });

  penugasan.forEach((p) => {
    p.disposisi = disposisiOleih.get(p.disposisiId);
  });

  return {
    pengaturanInstansi: kePengaturan(pengaturan[0] ?? null),
    unitKerja,
    users,
    klasifikasi,
    jenisSurat,
    dataMaster,
    suratMasuk,
    disposisi,
    penugasan,
    tindakLanjut,
    suratKeluar,
    persetujuan,
    arsip,
    notifikasi,
    riwayat,
    log,
    nomorSuratCounter,
    bukuEkspedisi,
  };
}
