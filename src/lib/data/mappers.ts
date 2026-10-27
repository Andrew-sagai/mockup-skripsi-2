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
  PenugasanStaf,
  PersetujuanSuratKeluar,
  PengaturanInstansi,
  RiwayatStatus,
  SuratKeluar,
  SuratMasuk,
  TindakLanjut,
  UnitKerja,
  User,
} from '@/lib/types';

type Baris = Record<string, any>;

const teks = (v: unknown): string => (v === null || v === undefined ? '' : String(v));
const boleh = (v: unknown): boolean => v === true;

/** Ubah baris Postgres (snake_case) menjadi objek domain (camelCase). */
export const keUser = (r: Baris): User => ({
  id: r.id,
  nama: r.nama,
  email: r.email,
  role: r.role,
  unitKerjaId: r.unit_kerja_id ?? null,
  aktif: r.aktif !== false,
  nip: r.nip ?? undefined,
  jabatan: r.jabatan ?? undefined,
  urlTandaTangan: r.url_tanda_tangan ?? undefined,
  authId: r.auth_id ?? undefined,
  createdAt: r.created_at,
});

export const keUnitKerja = (r: Baris): UnitKerja => ({
  id: r.id,
  kode: r.kode,
  nama: r.nama,
  jenis: r.jenis,
  labelLembar: r.label_lembar ?? undefined,
  urutanLembar: r.urutan_lembar ?? undefined,
  aktif: r.aktif !== false,
});

export const keKlasifikasi = (r: Baris): KlasifikasiSurat => ({
  id: r.id,
  kode: r.kode,
  nama: r.nama,
  uraian: r.uraian ?? undefined,
  unitKerjaId: r.unit_kerja_id ?? undefined,
  aktif: r.aktif !== false,
});

export const keJenisSurat = (r: Baris): JenisSurat => ({
  id: r.id,
  nama: r.nama,
  keterangan: r.keterangan ?? '',
  utama: boleh(r.utama),
  aktif: r.aktif !== false,
});

export const keDataMaster = (r: Baris): DataMasterItem => ({
  id: r.id,
  kategori: r.kategori,
  kode: r.kode,
  label: r.label,
  keterangan: r.keterangan ?? undefined,
  aktif: r.aktif !== false,
  urutan: r.urutan ?? 0,
  meta: r.meta ?? undefined,
  createdAt: r.created_at,
});

export const kePengaturan = (r: Baris | null): PengaturanInstansi => ({
  id: r?.id ?? 'pengaturan-1',
  namaPemda: r?.nama_pemda ?? '',
  namaInstansi: r?.nama_instansi ?? '',
  alamat: r?.alamat ?? '',
  telpFax: r?.telp_fax ?? '',
  logoPath: r?.logo_path ?? '/logo.png',
});

export const keSuratMasuk = (r: Baris): SuratMasuk => ({
  id: r.id,
  nomorAgenda: teks(r.nomor_agenda),
  nomorUrut: r.nomor_urut ?? undefined,
  nomorBerkas: r.nomor_berkas ?? undefined,
  nomorPetunjuk: r.nomor_petunjuk ?? undefined,
  nomorPaket: r.nomor_paket ?? undefined,
  tanggalTerima: r.tanggal_terima,
  asalSurat: teks(r.asal_surat),
  nomorSuratAsal: teks(r.nomor_surat_asal),
  tanggalSuratAsal: r.tanggal_surat_asal,
  perihal: teks(r.perihal),
  klasifikasiId: r.klasifikasi_id,
  jenisSuratId: r.jenis_surat_id ?? undefined,
  sifat: r.sifat ?? 'biasa',
  batasWaktuSurat: r.batas_waktu_surat ?? undefined,
  berkasUrl: r.berkas_path ?? '',
  status: r.status,
  pencatatId: r.pencatat_id,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const keDisposisiTujuan = (r: Baris): DisposisiTujuan => ({
  id: r.id,
  disposisiId: r.disposisi_id,
  tipe: r.tipe,
  unitKerjaId: r.unit_kerja_id,
  urutan: r.urutan ?? 0,
  kepalaBidangId: r.kepala_bidang_id ?? undefined,
  statusTerima: r.status_terima ?? 'belum',
  waktuTerima: r.waktu_terima ?? undefined,
  namaPenerimaSnapshot: r.nama_penerima_snapshot ?? undefined,
  parafPenerimaanSnapshot: r.paraf_penerimaan_snapshot ?? undefined,
  waktuParafPenerimaan: r.waktu_paraf_penerimaan ?? undefined,
  statusProses: r.status_proses ?? undefined,
  diteruskanKe: r.diteruskan_ke ?? undefined,
  catatanPenugasan: r.catatan_penugasan ?? undefined,
});

export const keDisposisi = (r: Baris): Disposisi => ({
  id: r.id,
  suratMasukId: r.surat_masuk_id,
  dibuatOleh: r.dibuat_oleh ?? undefined,
  instruksi: r.instruksi,
  instruksiLainnya: r.instruksi_lainnya ?? undefined,
  instruksiList: r.instruksi_list ?? undefined,
  catatanKepala: r.catatan_kepala ?? undefined,
  catatanKadin: r.catatan_kadin ?? undefined,
  tenggat: r.tenggat ?? '',
  status: r.status,
  keputusanKd: r.keputusan_kd ?? undefined,
  lintasBidang: r.lintas_bidang ?? undefined,
  sifat: r.sifat ?? undefined,
  parafKdOleh: r.paraf_kd_oleh ?? undefined,
  parafKdAt: r.paraf_kd_at ?? undefined,
  parafKdIp: r.paraf_kd_ip ?? undefined,
  parafKepalaWaktu: r.paraf_kepala_waktu ?? undefined,
  parafKadinOleh: r.paraf_kadin_oleh ?? undefined,
  parafKadinWaktu: r.paraf_kadin_waktu ?? undefined,
  ttdNamaSnapshot: r.ttd_nama_snapshot ?? undefined,
  ttdNipSnapshot: r.ttd_nip_snapshot ?? undefined,
  ttdJabatanSnapshot: r.ttd_jabatan_snapshot ?? undefined,
  snapshotSurat: r.snapshot_surat ?? undefined,
  bidangTujuan: [],
  catatanKoordinasi: r.catatan_koordinasi ?? undefined,
  catatanKoordinasiSekdin: r.catatan_koordinasi_sekdin ?? undefined,
  perluSuratJawaban: r.perlu_surat_jawaban ?? undefined,
  reminderSentAt: r.reminder_sent_at ?? undefined,
  overdueSentAt: r.overdue_sent_at ?? undefined,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const kePenugasan = (r: Baris): PenugasanStaf => ({
  id: r.id,
  disposisiId: r.disposisi_id,
  stafId: r.staf_id,
  kepalaBidangId: r.kepala_bidang_id,
  catatanPenugasan: r.catatan_penugasan ?? '',
  catatanProgres: r.catatan_progres ?? undefined,
  status: r.status,
  createdAt: r.created_at,
});

export const keTindakLanjut = (r: Baris): TindakLanjut => ({
  id: r.id,
  disposisiId: r.disposisi_id,
  penugasanStafId: r.penugasan_staf_id ?? undefined,
  pelakuId: r.pelaku_id,
  uraianHasil: r.uraian_hasil ?? '',
  berkasUrl: r.berkas_path ?? undefined,
  status: r.status,
  catatanPengembalian: r.catatan_pengembalian ?? undefined,
  nomorRevisi: r.nomor_revisi ?? undefined,
  createdAt: r.created_at,
});

export const keSuratKeluar = (r: Baris): SuratKeluar => ({
  id: r.id,
  nomorUrut: r.nomor_urut ?? undefined,
  nomorBerkas: r.nomor_berkas ?? undefined,
  nomorPetunjuk: r.nomor_petunjuk ?? undefined,
  nomorPaket: r.nomor_paket ?? undefined,
  sifat: r.sifat ?? undefined,
  nomorSurat: r.nomor_surat ?? null,
  perihal: teks(r.perihal),
  tujuan: teks(r.tujuan),
  klasifikasiId: r.klasifikasi_id,
  jenisSuratId: r.jenis_surat_id ?? undefined,
  isiRingkas: r.isi_ringkas ?? '',
  status: r.status,
  penyusunId: r.penyusun_id,
  tanggalKirim: r.tanggal_kirim ?? undefined,
  berkasUrl: r.berkas_path ?? undefined,
  buktiTerimaTanggal: r.bukti_terima_tanggal ?? undefined,
  buktiTerimaNama: r.bukti_terima_nama ?? undefined,
  suratMasukAsalId: r.surat_masuk_asal_id ?? undefined,
  refSuratMasukId: r.ref_surat_masuk_id ?? undefined,
  ttdImageUrl: r.ttd_image_path ?? undefined,
  ttdNamaSnapshot: r.ttd_nama_snapshot ?? undefined,
  ttdNipSnapshot: r.ttd_nip_snapshot ?? undefined,
  ttdWaktuSnapshot: r.ttd_waktu_snapshot ?? undefined,
  parafImageUrl: r.paraf_image_path ?? undefined,
  parafNamaSnapshot: r.paraf_nama_snapshot ?? undefined,
  parafWaktuSnapshot: r.paraf_waktu_snapshot ?? undefined,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const kePersetujuan = (r: Baris): PersetujuanSuratKeluar => ({
  id: r.id,
  suratKeluarId: r.surat_keluar_id,
  jenis: r.jenis,
  pelakuId: r.pelaku_id,
  catatan: r.catatan ?? undefined,
  waktu: r.waktu,
  urlTandaTanganSnapshot: r.url_tanda_tangan_snapshot ?? undefined,
  namaPelakuSnapshot: r.nama_pelaku_snapshot ?? undefined,
  nipPelakuSnapshot: r.nip_pelaku_snapshot ?? undefined,
  jabatanPelakuSnapshot: r.jabatan_pelaku_snapshot ?? undefined,
});

export const keArsip = (r: Baris): ArsipDigital => ({
  id: r.id,
  suratMasukId: r.surat_masuk_id ?? undefined,
  suratKeluarId: r.surat_keluar_id ?? undefined,
  jenisSurat: r.jenis_surat,
  kodeArsip: r.kode_arsip,
  berkasUrl: r.berkas_path ?? '',
  perihal: teks(r.perihal),
  nomorSurat: teks(r.nomor_surat),
  tahun: r.tahun,
  klasifikasiId: r.klasifikasi_id,
  jenisSuratId: r.jenis_surat_id ?? undefined,
  statusArsip: r.status_arsip ?? undefined,
  laporanHasil: r.laporan_hasil ?? undefined,
  berkasLaporanUrl: r.berkas_laporan_path ?? undefined,
  tanggalSelesai: r.tanggal_selesai ?? undefined,
  suratBalasanId: r.surat_balasan_id ?? undefined,
  suratBalasanNomor: r.surat_balasan_nomor ?? undefined,
  suratBalasanPerihal: r.surat_balasan_perihal ?? undefined,
  isSuratBalasan: r.is_surat_balasan ?? undefined,
  createdAt: r.created_at,
});

export const keNotifikasi = (r: Baris): Notifikasi => ({
  id: r.id,
  userId: r.user_id,
  judul: r.judul,
  pesan: r.pesan,
  tautanUrl: r.tautan_url ?? undefined,
  dibaca: r.dibaca === true,
  tingkat: r.tingkat ?? undefined,
  isRahasia: r.is_rahasia ?? undefined,
  createdAt: r.created_at,
  kanal: r.kanal ?? undefined,
  statusKirim: r.status_kirim ?? undefined,
  pesanGalat: r.pesan_galat ?? undefined,
});

export const keRiwayat = (r: Baris): RiwayatStatus => ({
  id: r.id,
  suratMasukId: r.surat_masuk_id ?? undefined,
  suratKeluarId: r.surat_keluar_id ?? undefined,
  status: r.status,
  pelakuId: r.pelaku_id,
  catatan: r.catatan ?? undefined,
  waktu: r.waktu,
});

export const keLog = (r: Baris): LogAktivitas => ({
  id: r.id,
  userId: r.user_id,
  aksi: r.aksi,
  detail: r.detail,
  waktu: r.waktu,
});

/** Tanggal buku dinas: "12/1-26". */
const tanggalDinas = (nilai: unknown): string => {
  if (!nilai) return '';
  const d = new Date(String(nilai));
  if (isNaN(d.getTime())) return String(nilai);
  return `${d.getDate()}/${d.getMonth() + 1}-${String(d.getFullYear()).slice(-2)}`;
};

export const keBukuEkspedisiTujuan = (r: Baris): BukuEkspedisiTujuan => ({
  id: r.id,
  ekspedisiId: teks(r.ekspedisi_id),
  urutan: Number(r.urutan ?? 0),
  tujuan: teks(r.tujuan),
  penerimaParaf: teks(r.penerima_paraf),
  // Bila tanggal terima tidak tersimpan rapi, teks aslinya ada di `catatan`.
  tanggalTerima: r.tanggal_terima ? tanggalDinas(r.tanggal_terima) : teks(r.catatan),
  catatan: teks(r.catatan),
});

export const keBukuEkspedisi = (r: Baris, tujuan: BukuEkspedisiTujuan[] = []): BukuEkspedisi => ({
  id: r.id,
  hariTanggal: teks(r.hari_tanggal),
  tanggal: teks(r.tanggal),
  dokumen: teks(r.dokumen),
  tujuan,
});
